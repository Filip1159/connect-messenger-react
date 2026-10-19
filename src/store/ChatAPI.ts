import { jwtDecode } from "jwt-decode";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import axios from "axios";
import type { IMessage, StompSubscription } from "@stomp/stompjs";
import type { AuthDetails, Chat, Message, MessageType, Presence, User } from "../types";

const baseURL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080`;
const api = axios.create({ baseURL });

const TOKEN_KEY = "token";

/* the backend expects the raw token in the Authorization header (no "Bearer" scheme) */
api.interceptors.request.use(config => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = token;
    return config;
});

api.interceptors.response.use(undefined, error => {
    // the backend rejected our token (e.g. revoked) - drop the session
    if (error.response?.status === 401 && error.config?.url !== "/login") {
        ChatAPI.signOut();
    }
    return Promise.reject(error);
});

const decodeToken = (token: string): AuthDetails | null => {
    try {
        const details = jwtDecode<AuthDetails>(token);
        if (typeof details.exp !== "number" || Date.now() >= details.exp * 1000) return null;
        return details;
    } catch {
        return null;
    }
};

type MessageCallback = (message: IMessage) => void;

/* messages and read statuses of a chat arrive on separate topics */
export interface ChatCallbacks {
    onMessage: MessageCallback;
    onStatus: MessageCallback;
    onTyping: MessageCallback;
}

/* connection level events */
export interface SocketHandlers {
    onNewChat: MessageCallback;
    onPresence: MessageCallback;
    /* the connection was re-established after a drop: events may have been missed */
    onReconnect: () => void;
}

export const PAGE_SIZE = 50;

export type SignInResult =
    | { success: true }
    | { success: false; reason: "INVALID_TOKEN" | "BAD_CREDENTIALS" | "UNAVAILABLE" };

class ChatAPI {
    static stompClient: Client | null = null;
    static authDetails: AuthDetails | null = null;
    static chatCallbacks = new Map<number, ChatCallbacks>(); // chatId -> callbacks
    static subscriptions = new Map<number, StompSubscription[]>(); // chatId -> STOMP subscriptions of the current connection
    static handlers: SocketHandlers | null = null;
    static watchedUsers = new Set<number>(); // users whose presence is followed
    static presenceSubscriptions = new Map<number, StompSubscription>();
    static connectedOnce = false;
    static signOutListeners = new Set<() => void>();

    /* returns a function removing the listener */
    static onSignOut(listener: () => void) {
        this.signOutListeners.add(listener);
        return () => this.signOutListeners.delete(listener);
    }

    static async signIn(username: string, password: string): Promise<SignInResult> {
        try {
            const res = await api.post("/login", { username, password });
            const token: string | undefined = res.headers.authentication;
            const details = token ? decodeToken(token) : null;
            if (!token || !details) return { success: false, reason: "INVALID_TOKEN" };
            localStorage.setItem(TOKEN_KEY, token);
            this.authDetails = details;
            return { success: true };
        } catch (e) {
            // a response below 500 means the server was reached and rejected the credentials
            const rejected = axios.isAxiosError(e) && !!e.response && e.response.status < 500;
            return { success: false, reason: rejected ? "BAD_CREDENTIALS" : "UNAVAILABLE" };
        }
    }

    /* validates the stored token on every call, so an expired token is never treated as valid */
    static isSignedIn() {
        const token = localStorage.getItem(TOKEN_KEY);
        const details = token ? decodeToken(token) : null;
        if (!details) {
            if (token || this.authDetails) this.signOut();
            return false;
        }
        this.authDetails = details;
        return true;
    }

    static getAuthDetails(): AuthDetails {
        if (!this.isSignedIn()) {
            throw new Error("User isn't signed in!");
        }
        return this.authDetails as AuthDetails;
    }

    static signOut() {
        this.closeWebsocket();
        localStorage.removeItem(TOKEN_KEY);
        this.authDetails = null;
        this.signOutListeners.forEach(listener => listener());
    }

    static initWebsocket(chats: Chat[], callbacks: ChatCallbacks, handlers: SocketHandlers) {
        if (!this.isSignedIn()) {
            throw new Error("User isn't signed in!");
        }
        this.closeWebsocket();

        this.handlers = handlers;
        const myId = this.getAuthDetails().id;
        chats.forEach(chat => {
            this.chatCallbacks.set(chat.id, callbacks);
            chat.users.filter(u => u.id !== myId).forEach(u => this.watchedUsers.add(u.id));
        });

        const client = new Client({
            webSocketFactory: () => new SockJS(`${baseURL}/websocket`),
            reconnectDelay: 5000,
            // refresh the token before every (re)connect attempt
            beforeConnect: () => {
                if (!this.isSignedIn()) {
                    client.deactivate();
                    return;
                }
                client.connectHeaders = { Authentication: localStorage.getItem(TOKEN_KEY) ?? "" };
            },
            onConnect: () => {
                this.subscriptions.clear();
                this.presenceSubscriptions.clear();
                client.subscribe(`/topic/new-chats/${this.getAuthDetails().id}`, message => this.handlers?.onNewChat(message));
                this.chatCallbacks.forEach((callbacks, chatId) => this.subscribe(chatId, callbacks));
                this.watchedUsers.forEach(userId => this.subscribePresence(userId));
                if (this.connectedOnce) this.handlers?.onReconnect();
                this.connectedOnce = true;
            },
            onStompError: frame => console.error("STOMP error:", frame.headers.message),
            onWebSocketError: () => console.error("Websocket error"),
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

    private static subscribePresence(userId: number) {
        const handlers = this.handlers;
        if (!handlers || this.presenceSubscriptions.has(userId) || !this.stompClient?.connected) return;
        this.presenceSubscriptions.set(userId, this.stompClient.subscribe(`/topic/presence/${userId}`, handlers.onPresence));
    }

    /* follows online / last seen changes of a user (a contact from a newly created chat) */
    static watchUser(userId: number) {
        if (userId === this.authDetails?.id) return;
        this.watchedUsers.add(userId);
        this.subscribePresence(userId); // if not connected yet, onConnect subscribes it
    }

    /* tells the other members that I'm writing; ephemeral, silently dropped when offline */
    static sendTyping(chatId: number) {
        if (!this.stompClient?.connected) return;
        this.stompClient.publish({ destination: `/app/chats/${chatId}/typing` });
    }

    static subscribeToChat(chatId: number, callbacks: ChatCallbacks) {
        if (!this.isSignedIn()) {
            throw new Error("User isn't signed in!");
        }
        if (!this.stompClient) {
            throw new Error("Websocket connection doesn't exists. Call initWebsocket() method first.");
        }
        this.chatCallbacks.set(chatId, callbacks);
        this.subscribe(chatId, callbacks); // if not connected yet, onConnect subscribes it
    }

    /* chats come without messages, the history is loaded with loadMessages() */
    static async loadAllChats(): Promise<Chat[]> {
        const res = await api.get(`/chats/${this.getAuthDetails().id}`, { params: { includeMessages: false } });
        return res.data;
    }

    /* messages newer than `after`, oldest first - used to catch up after a lost connection */
    static async loadMessagesAfter(chatId: number, after: number, signal?: AbortSignal): Promise<Message[]> {
        this.getAuthDetails();
        const res = await api.get(`/chats/chat/${chatId}/messages`, { params: { after, size: PAGE_SIZE }, signal });
        return res.data;
    }

    static async loadPresence(): Promise<Presence[]> {
        this.getAuthDetails();
        const res = await api.get("/presence");
        return res.data;
    }

    /* a page of the history, oldest first; `before` is the id of the oldest message already known */
    static async loadMessages(chatId: number, before?: number, signal?: AbortSignal): Promise<Message[]> {
        this.getAuthDetails();
        const res = await api.get(`/chats/chat/${chatId}/messages`, { params: { before, size: PAGE_SIZE }, signal });
        return res.data;
    }

    /* puts new status to api, when I read unseen message.
     * api sends status update through websocket, chatReducer performs context update */
    static updateStatus(chatId: number, messageId: number) {
        this.getAuthDetails();
        // the user and the time are taken from the session / the server clock
        return api.put("/status", { id: { chatId }, messageId });
    }

    /* resolves with the stored message */
    static postMessage(chatId: number, type: MessageType, content: string | File) {
        this.getAuthDetails();
        const formData = new FormData()
        formData.append('chatId', String(chatId))
        formData.append('type', type)
        formData.append(type === 'TEXT' ? 'textContent' : 'fileContent', content)
        return api.post<Message>("/message", formData);
    }

    static async searchUsersByQuery(query: string, signal?: AbortSignal): Promise<User[]> {
        this.getAuthDetails();
        const res = await api.get(`/user/${encodeURIComponent(query)}`, { signal });
        return res.data;
    }

    static async createChat(recipientId: number): Promise<Chat> {
        const res = await api.post('/chats', {
            userIds: [this.getAuthDetails().id, recipientId]
        });
        return res.data;
    }

    /* the image bytes; the caller turns them into an object URL */
    static async loadFile(fileName: string, signal?: AbortSignal): Promise<Blob> {
        this.getAuthDetails();
        const res = await api.get(`/message/file/${encodeURIComponent(fileName)}/raw`, { responseType: "blob", signal });
        return res.data;
    }
}

export default ChatAPI;
