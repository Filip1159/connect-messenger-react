import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import type { IMessage, StompSubscription } from "@stomp/stompjs";
import type { Chat } from "../types";
import { baseURL } from "./http";
import { getToken } from "./token";
import { currentUserId, getAuthDetails, isSignedIn, onSignOut } from "./session";

type MessageCallback = (message: IMessage) => void;

/* messages and read statuses of a chat arrive on separate topics */
export interface ChatCallbacks {
    onMessage: MessageCallback;
    onStatus: MessageCallback;
    onTyping: MessageCallback;
}

/* connection level events */
export interface SocketHandlers {
    /* a chat of mine was created or changed (renamed, members changed) */
    onNewChat: MessageCallback;
    /* I'm no longer in this chat */
    onChatRemoved: MessageCallback;
    onPresence: MessageCallback;
    /* the connection was re-established after a drop: events may have been missed */
    onReconnect: () => void;
    /* the websocket is up, or it dropped after having been up */
    onConnection: (state: "connected" | "reconnecting") => void;
}

/* what the app needs from the websocket (and what tests replace) */
export interface Socket {
    connect(chats: Chat[], callbacks: ChatCallbacks, handlers: SocketHandlers): void;
    close(): void;
    subscribeToChat(chatId: number, callbacks: ChatCallbacks): void;
    /* stops following a chat I'm no longer in */
    unsubscribeChat(chatId: number): void;
    /* follows online / last seen changes of a user (a contact from a newly created chat) */
    watchUser(userId: number): void;
    /* tells the other members that I'm writing; ephemeral, silently dropped when offline */
    sendTyping(chatId: number): void;
}

/* one websocket connection with its subscriptions; its state lives in the closure */
export const createSocket = (): Socket => {
    let client: Client | null = null;
    let handlers: SocketHandlers | null = null;
    let connectedOnce = false;
    const chatCallbacks = new Map<number, ChatCallbacks>(); // chatId -> callbacks
    const subscriptions = new Map<number, StompSubscription[]>(); // chatId -> STOMP subscriptions of the current connection
    const watchedUsers = new Set<number>(); // users whose presence is followed
    const presenceSubscriptions = new Map<number, StompSubscription>();

    const subscribe = (chatId: number, { onMessage, onStatus, onTyping }: ChatCallbacks) => {
        if (subscriptions.has(chatId) || !client?.connected) return;
        subscriptions.set(chatId, [
            client.subscribe(`/topic/messages/${chatId}`, onMessage),
            client.subscribe(`/topic/status/${chatId}`, onStatus),
            client.subscribe(`/topic/typing/${chatId}`, onTyping),
        ]);
    };

    const subscribePresence = (userId: number) => {
        if (!handlers || presenceSubscriptions.has(userId) || !client?.connected) return;
        presenceSubscriptions.set(userId, client.subscribe(`/topic/presence/${userId}`, handlers.onPresence));
    };

    const close = () => {
        if (client) {
            client.deactivate();
            client = null;
        }
        chatCallbacks.clear();
        subscriptions.clear();
        presenceSubscriptions.clear();
        watchedUsers.clear();
        handlers = null;
        connectedOnce = false;
    };

    const connect = (chats: Chat[], callbacks: ChatCallbacks, newHandlers: SocketHandlers) => {
        if (!isSignedIn()) {
            throw new Error("User isn't signed in!");
        }
        close();

        handlers = newHandlers;
        const myId = getAuthDetails().id;
        chats.forEach(chat => {
            chatCallbacks.set(chat.id, callbacks);
            chat.users.filter(u => u.id !== myId).forEach(u => watchedUsers.add(u.id));
        });

        const stomp = new Client({
            webSocketFactory: () => new SockJS(`${baseURL}/websocket`),
            reconnectDelay: 5000,
            // refresh the token before every (re)connect attempt
            beforeConnect: () => {
                if (!isSignedIn()) {
                    stomp.deactivate();
                    return;
                }
                stomp.connectHeaders = { Authentication: getToken() ?? "" };
            },
            onConnect: () => {
                subscriptions.clear();
                presenceSubscriptions.clear();
                stomp.subscribe(`/topic/new-chats/${getAuthDetails().id}`, message => handlers?.onNewChat(message));
                stomp.subscribe(`/topic/removed-chats/${getAuthDetails().id}`, message => handlers?.onChatRemoved(message));
                chatCallbacks.forEach((chatHandlers, chatId) => subscribe(chatId, chatHandlers));
                watchedUsers.forEach(subscribePresence);
                handlers?.onConnection("connected");
                if (connectedOnce) handlers?.onReconnect();
                connectedOnce = true;
            },
            onStompError: frame => console.error("STOMP error:", frame.headers.message),
            onWebSocketError: () => console.error("Websocket error"),
            onWebSocketClose: () => { if (connectedOnce) handlers?.onConnection("reconnecting"); },
        });
        client = stomp;
        stomp.activate();
    };

    return {
        connect,
        close,
        subscribeToChat(chatId, callbacks) {
            if (!isSignedIn()) {
                throw new Error("User isn't signed in!");
            }
            if (!client) {
                throw new Error("Websocket connection doesn't exists. Call connect() first.");
            }
            chatCallbacks.set(chatId, callbacks);
            subscribe(chatId, callbacks); // if not connected yet, onConnect subscribes it
        },
        unsubscribeChat(chatId) {
            chatCallbacks.delete(chatId);
            subscriptions.get(chatId)?.forEach(s => s.unsubscribe());
            subscriptions.delete(chatId);
        },
        watchUser(userId) {
            if (userId === currentUserId()) return;
            watchedUsers.add(userId);
            subscribePresence(userId); // if not connected yet, onConnect subscribes it
        },
        sendTyping(chatId) {
            if (!client?.connected) return;
            client.publish({ destination: `/app/chats/${chatId}/typing` });
        },
    };
};

/* the connection of the app; it ends with the session */
export const socket = createSocket();
onSignOut(() => socket.close());
