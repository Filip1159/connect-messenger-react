import { jwtDecode } from "jwt-decode";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import DateFormatter from "../DateFormatter";
import axios from "axios";
import type { IMessage, StompSubscription } from "@stomp/stompjs";
import type { AuthDetails, Chat, MessageType, User } from "../types";

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

export type SignInResult =
    | { success: true }
    | { success: false; reason: "INVALID_TOKEN" | "BAD_CREDENTIALS" | "UNAVAILABLE" };

class ChatAPI {
    static stompClient: Client | null = null;
    static authDetails: AuthDetails | null = null;
    static chatCallbacks = new Map<number, MessageCallback>(); // chatId -> callback
    static subscriptions = new Map<number, StompSubscription>(); // chatId -> STOMP subscription of the current connection
    static newChatCallback: MessageCallback | null = null;
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

    static initWebsocket(chats: Chat[], messageCallback: MessageCallback, newChatCallback: MessageCallback) {
        if (!this.isSignedIn()) {
            throw new Error("User isn't signed in!");
        }
        this.closeWebsocket();

        this.newChatCallback = newChatCallback;
        chats.forEach(chat => this.chatCallbacks.set(chat.id, messageCallback));

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
                client.subscribe(`/topic/new-chats/${this.getAuthDetails().id}`, message => this.newChatCallback?.(message));
                this.chatCallbacks.forEach((callback, chatId) => this.subscribe(chatId, callback));
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
        this.newChatCallback = null;
    }

    static subscribe(chatId: number, callback: MessageCallback) {
        if (this.subscriptions.has(chatId) || !this.stompClient?.connected) return;
        this.subscriptions.set(chatId, this.stompClient.subscribe(`/topic/messages/${chatId}`, callback));
    }

    static subscribeToChat(chatId: number, callback: MessageCallback) {
        if (!this.isSignedIn()) {
            throw new Error("User isn't signed in!");
        }
        if (!this.stompClient) {
            throw new Error("Websocket connection doesn't exists. Call initWebsocket() method first.");
        }
        this.chatCallbacks.set(chatId, callback);
        this.subscribe(chatId, callback); // if not connected yet, onConnect subscribes it
    }

    static async loadAllChats(): Promise<Chat[]> {
        const res = await api.get(`/chats/${this.getAuthDetails().id}`);
        return res.data;
    }

    /* puts new status to api, when I read unseen message.
     * api sends status update through websocket, chatReducer performs context update */
    static updateStatus(chatId: number, messageId: number) {
        return api.put("/status", {
            id: {
                chatId,
                userId: this.getAuthDetails().id
            },
            messageId,
            time: DateFormatter.nowToSql()
        });
    }

    static postMessage(chatId: number, type: MessageType, content: string | File) {
        const formData = new FormData()
        formData.append('chatId', String(chatId))
        formData.append('userId', String(this.getAuthDetails().id))
        formData.append('time', DateFormatter.nowToSql())
        formData.append('type', type)
        formData.append(type === 'TEXT' ? 'textContent' : 'fileContent', content)
        return api.post("/message", formData);
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

    /* returns the file as a base64 string, as sent by the backend */
    static async loadFile(fileName: string, signal?: AbortSignal): Promise<string> {
        this.getAuthDetails();
        const res = await api.get(`/message/file/${encodeURIComponent(fileName)}`, { signal });
        return res.data;
    }
}

export default ChatAPI;
