import { io } from "socket.io-client";
import type { Chat } from "../types";
import { getToken } from "./token";
import { currentUserId, getAuthDetails, isSignedIn, onSignOut } from "./session";
import { CHAT_CHANGED, CHAT_REMOVED, MESSAGE_EVENTS, PRESENCE_CHANGED, STATUS_UPDATED, TYPING } from "./events";

/* the Socket.IO server of the backend has its own port */
export const socketURL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:9092`;

/* what a callback gets: the { type, payload } the backend pushed (see events.ts) */
type MessageCallback = (event: unknown) => void;

/* what happens in a chat: messages, read statuses and typing */
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

const messagesRoom = (chatId: number) => `/topic/messages/${chatId}`;
const statusRoom = (chatId: number) => `/topic/status/${chatId}`;
const typingRoom = (chatId: number) => `/topic/typing/${chatId}`;
const presenceRoom = (userId: number) => `/topic/presence/${userId}`;

/* the chat an event of a chat is about */
const chatOf = (payload: unknown, type: string): number | undefined => {
    const body = payload as { chatId?: number; id?: { chatId?: number } } | null;
    return type === STATUS_UPDATED ? body?.id?.chatId : body?.chatId;
};

/* one Socket.IO connection with its rooms; its state lives in the closure */
export const createSocket = (): Socket => {
    let client: ReturnType<typeof io> | null = null;
    let handlers: SocketHandlers | null = null;
    let connectedOnce = false;
    const chatCallbacks = new Map<number, ChatCallbacks>(); // chatId -> callbacks
    const followedChats = new Set<number>(); // chats followed on the current connection
    const watchedUsers = new Set<number>(); // users whose presence is followed
    const followedUsers = new Set<number>();

    const follow = (room: string) => {
        client?.emit("subscribe", room, (answer: { ok?: boolean } | undefined) => {
            if (!answer?.ok) console.error("Not allowed to follow", room);
        });
    };

    const subscribe = (chatId: number) => {
        if (followedChats.has(chatId) || !client?.connected) return;
        followedChats.add(chatId);
        [ messagesRoom, statusRoom, typingRoom ].forEach(room => follow(room(chatId)));
    };

    const subscribePresence = (userId: number) => {
        if (!handlers || followedUsers.has(userId) || !client?.connected) return;
        followedUsers.add(userId);
        follow(presenceRoom(userId));
    };

    /* everything arrives as the event "event"; the type says what it is and the payload which chat it belongs to */
    const route = (event: unknown) => {
        const { type, payload } = (event ?? {}) as { type?: string; payload?: unknown };
        if (typeof type !== "string") return;
        if (type === PRESENCE_CHANGED) return handlers?.onPresence(event);
        if (type === CHAT_CHANGED) return handlers?.onNewChat(event);
        if (type === CHAT_REMOVED) return handlers?.onChatRemoved(event);
        const chatId = chatOf(payload, type);
        const callbacks = chatId === undefined ? undefined : chatCallbacks.get(chatId);
        if (!callbacks) return;
        if ((MESSAGE_EVENTS as readonly string[]).includes(type)) callbacks.onMessage(event);
        else if (type === STATUS_UPDATED) callbacks.onStatus(event);
        else if (type === TYPING) callbacks.onTyping(event);
        // other types come from a newer backend: ignored
    };

    const close = () => {
        if (client) {
            client.removeAllListeners();
            client.disconnect();
            client = null;
        }
        chatCallbacks.clear();
        followedChats.clear();
        followedUsers.clear();
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

        const connection = io(socketURL, {
            transports: [ "websocket" ],
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            // the token is read again for every (re)connect attempt, so a renewed one is used
            auth: send => send({ token: getToken() ?? "" }),
        });
        client = connection;

        connection.on("connect", () => {
            // a new connection starts without rooms
            followedChats.clear();
            followedUsers.clear();
            follow(`/topic/new-chats/${getAuthDetails().id}`);
            follow(`/topic/removed-chats/${getAuthDetails().id}`);
            chatCallbacks.forEach((_, chatId) => subscribe(chatId));
            watchedUsers.forEach(subscribePresence);
            handlers?.onConnection("connected");
            if (connectedOnce) handlers?.onReconnect();
            connectedOnce = true;
        });
        connection.on("event", route);
        connection.on("disconnect", () => { if (connectedOnce) handlers?.onConnection("reconnecting"); });
        connection.on("connect_error", error => {
            console.error("Websocket error:", error.message);
            if (!isSignedIn()) connection.disconnect();
        });
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
            subscribe(chatId); // if not connected yet, "connect" subscribes it
        },
        unsubscribeChat(chatId) {
            chatCallbacks.delete(chatId);
            followedChats.delete(chatId);
            [ messagesRoom, statusRoom, typingRoom ].forEach(room => client?.emit("unsubscribe", room(chatId)));
        },
        watchUser(userId) {
            if (userId === currentUserId()) return;
            watchedUsers.add(userId);
            subscribePresence(userId); // if not connected yet, "connect" subscribes it
        },
        sendTyping(chatId) {
            if (!client?.connected) return;
            client.emit("typing", chatId);
        },
    };
};

/* the connection of the app; it ends with the session */
export const socket = createSocket();
onSignOut(() => socket.close());
