import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import type { IMessage, StompSubscription } from "@stomp/stompjs";
import { baseURL } from "../api/http";
import { getToken } from "../api/token";
import { currentUserId, getAuthDetails, isSignedIn, onSignOut, signIn, signOut } from "../api/session";
import type { SignInResult } from "../api/session";
import type { Chat } from "../types";

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

export type { SignInResult };

class ChatAPI {
    static stompClient: Client | null = null;
    static chatCallbacks = new Map<number, ChatCallbacks>(); // chatId -> callbacks
    static subscriptions = new Map<number, StompSubscription[]>(); // chatId -> STOMP subscriptions of the current connection
    static handlers: SocketHandlers | null = null;
    static watchedUsers = new Set<number>(); // users whose presence is followed
    static presenceSubscriptions = new Map<number, StompSubscription>();
    static connectedOnce = false;

    static onSignOut = onSignOut;
    static signIn = signIn;
    static isSignedIn = isSignedIn;
    static getAuthDetails = getAuthDetails;
    static signOut = signOut;

    static initWebsocket(chats: Chat[], callbacks: ChatCallbacks, handlers: SocketHandlers) {
        if (!isSignedIn()) {
            throw new Error("User isn't signed in!");
        }
        this.closeWebsocket();

        this.handlers = handlers;
        const myId = getAuthDetails().id;
        chats.forEach(chat => {
            this.chatCallbacks.set(chat.id, callbacks);
            chat.users.filter(u => u.id !== myId).forEach(u => this.watchedUsers.add(u.id));
        });

        const client = new Client({
            webSocketFactory: () => new SockJS(`${baseURL}/websocket`),
            reconnectDelay: 5000,
            // refresh the token before every (re)connect attempt
            beforeConnect: () => {
                if (!isSignedIn()) {
                    client.deactivate();
                    return;
                }
                client.connectHeaders = { Authentication: getToken() ?? "" };
            },
            onConnect: () => {
                this.subscriptions.clear();
                this.presenceSubscriptions.clear();
                client.subscribe(`/topic/new-chats/${getAuthDetails().id}`, message => this.handlers?.onNewChat(message));
                client.subscribe(`/topic/removed-chats/${getAuthDetails().id}`, message => this.handlers?.onChatRemoved(message));
                this.chatCallbacks.forEach((callbacks, chatId) => this.subscribe(chatId, callbacks));
                this.watchedUsers.forEach(userId => this.subscribePresence(userId));
                this.handlers?.onConnection("connected");
                if (this.connectedOnce) this.handlers?.onReconnect();
                this.connectedOnce = true;
            },
            onStompError: frame => console.error("STOMP error:", frame.headers.message),
            onWebSocketError: () => console.error("Websocket error"),
            onWebSocketClose: () => { if (this.connectedOnce) this.handlers?.onConnection("reconnecting"); },
        });
        this.stompClient = client;
        client.activate();
    }

    static closeWebsocket() {
        if (this.stompClient) {
            this.stompClient.deactivate();
            this.stompClient = null;
        }
        this.chatCallbacks.clear();
        this.subscriptions.clear();
        this.presenceSubscriptions.clear();
        this.watchedUsers.clear();
        this.handlers = null;
        this.connectedOnce = false;
    }

    static subscribe(chatId: number, { onMessage, onStatus, onTyping }: ChatCallbacks) {
        if (this.subscriptions.has(chatId) || !this.stompClient?.connected) return;
        this.subscriptions.set(chatId, [
            this.stompClient.subscribe(`/topic/messages/${chatId}`, onMessage),
            this.stompClient.subscribe(`/topic/status/${chatId}`, onStatus),
            this.stompClient.subscribe(`/topic/typing/${chatId}`, onTyping),
        ]);
    }

    /* stops following a chat I'm no longer in */
    static unsubscribeChat(chatId: number) {
        this.chatCallbacks.delete(chatId);
        this.subscriptions.get(chatId)?.forEach(s => s.unsubscribe());
        this.subscriptions.delete(chatId);
    }

    private static subscribePresence(userId: number) {
        const handlers = this.handlers;
        if (!handlers || this.presenceSubscriptions.has(userId) || !this.stompClient?.connected) return;
        this.presenceSubscriptions.set(userId, this.stompClient.subscribe(`/topic/presence/${userId}`, handlers.onPresence));
    }

    /* follows online / last seen changes of a user (a contact from a newly created chat) */
    static watchUser(userId: number) {
        if (userId === currentUserId()) return;
        this.watchedUsers.add(userId);
        this.subscribePresence(userId); // if not connected yet, onConnect subscribes it
    }

    /* tells the other members that I'm writing; ephemeral, silently dropped when offline */
    static sendTyping(chatId: number) {
        if (!this.stompClient?.connected) return;
        this.stompClient.publish({ destination: `/app/chats/${chatId}/typing` });
    }

    static subscribeToChat(chatId: number, callbacks: ChatCallbacks) {
        if (!isSignedIn()) {
            throw new Error("User isn't signed in!");
        }
        if (!this.stompClient) {
            throw new Error("Websocket connection doesn't exists. Call initWebsocket() method first.");
        }
        this.chatCallbacks.set(chatId, callbacks);
        this.subscribe(chatId, callbacks); // if not connected yet, onConnect subscribes it
    }

}

// signing out (also by an expired token or a 401) closes the websocket
onSignOut(() => ChatAPI.closeWebsocket());

export default ChatAPI;
