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
    /* a chat of mine was created or changed (renamed, members changed) */
    onNewChat: MessageCallback;
    /* I'm no longer in this chat */
    onChatRemoved: MessageCallback;
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
                client.subscribe(`/topic/removed-chats/${this.getAuthDetails().id}`, message => this.handlers?.onChatRemoved(message));
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
    static postMessage(chatId: number, type: MessageType, content: string | File, replyToId?: number) {
        this.getAuthDetails();
        const formData = new FormData()
        formData.append('chatId', String(chatId))
        formData.append('type', type)
        if (replyToId !== undefined) formData.append('replyToId', String(replyToId))
        formData.append(type === 'TEXT' ? 'textContent' : 'fileContent', content)
        return api.post<Message>("/message", formData);
    }

    static async loadMessage(id: number, signal?: AbortSignal): Promise<Message> {
        this.getAuthDetails();
        const res = await api.get<Message>(`/message/${id}`, { signal });
        return res.data;
    }

    /* my reaction to a message (replaces the previous one); resolves with the updated message */
    static async react(id: number, emoji: string): Promise<Message> {
        this.getAuthDetails();
        const res = await api.put<Message>(`/message/${id}/reaction`, { emoji });
        return res.data;
    }

    static async removeReaction(id: number): Promise<Message> {
        this.getAuthDetails();
        const res = await api.delete<Message>(`/message/${id}/reaction`);
        return res.data;
    }

    /* the author changes the text; resolves with the updated message */
    static async editMessage(id: number, textContent: string): Promise<Message> {
        this.getAuthDetails();
        const res = await api.patch<Message>(`/message/${id}`, { textContent });
        return res.data;
    }

    /* soft delete by the author; resolves with the (content-less) message */
    static async deleteMessage(id: number): Promise<Message> {
        this.getAuthDetails();
        const res = await api.delete<Message>(`/message/${id}`);
        return res.data;
    }

    /* text messages containing `query`, newest first; `before` is the id of the oldest match already shown */
    static async searchMessages(chatId: number, query: string, before?: number, signal?: AbortSignal): Promise<Message[]> {
        this.getAuthDetails();
        const res = await api.get(`/chats/chat/${chatId}/messages`, { params: { query, before, size: PAGE_SIZE }, signal });
        return res.data;
    }

    static async searchUsersByQuery(query: string, signal?: AbortSignal): Promise<User[]> {
        this.getAuthDetails();
        const res = await api.get(`/user/${encodeURIComponent(query)}`, { signal });
        return res.data;
    }

    /* a 1:1 chat (an existing one is returned if there is one) or, with a name or more people, a group */
    static async createChat(recipientIds: number[], name?: string): Promise<Chat> {
        const res = await api.post('/chats', {
            userIds: [this.getAuthDetails().id, ...recipientIds],
            ...(name ? { name } : {})
        });
        return res.data;
    }

    static async loadChat(chatId: number): Promise<Chat> {
        this.getAuthDetails();
        const res = await api.get(`/chats/chat/${chatId}`);
        return res.data;
    }

    /* archive / mute: my own settings of the chat */
    static async updateChatSettings(chatId: number, settings: { archived?: boolean; muted?: boolean }): Promise<Chat> {
        this.getAuthDetails();
        const res = await api.patch(`/chats/chat/${chatId}/settings`, settings);
        return res.data;
    }

    static async renameChat(chatId: number, name: string): Promise<Chat> {
        this.getAuthDetails();
        const res = await api.patch(`/chats/chat/${chatId}`, { name });
        return res.data;
    }

    static async addMembers(chatId: number, userIds: number[]): Promise<Chat> {
        this.getAuthDetails();
        const res = await api.post(`/chats/chat/${chatId}/members`, { userIds });
        return res.data;
    }

    /* an admin removes a member; removing myself leaves the group */
    static async removeMember(chatId: number, userId: number): Promise<void> {
        this.getAuthDetails();
        await api.delete(`/chats/chat/${chatId}/members/${userId}`);
    }

    static async setAdmin(chatId: number, userId: number, admin: boolean): Promise<Chat> {
        this.getAuthDetails();
        const res = admin
            ? await api.put(`/chats/chat/${chatId}/admins/${userId}`)
            : await api.delete(`/chats/chat/${chatId}/admins/${userId}`);
        return res.data;
    }

    /* creates the account; the caller signs in afterwards */
    static async register(account: { username: string; name: string; surname: string; password: string }): Promise<User> {
        const res = await api.post("/users", account);
        return res.data;
    }

    static async loadProfile(): Promise<User> {
        this.getAuthDetails();
        const res = await api.get("/users/me");
        return res.data;
    }

    static async updateProfile(name: string, surname: string): Promise<User> {
        this.getAuthDetails();
        const res = await api.patch("/users/me", { name, surname });
        return res.data;
    }

    static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        this.getAuthDetails();
        await api.put("/users/me/password", { currentPassword, newPassword });
    }

    static async uploadAvatar(file: File): Promise<User> {
        this.getAuthDetails();
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.put("/users/me/avatar", formData);
        return res.data;
    }

    static async removeAvatar(): Promise<User> {
        this.getAuthDetails();
        const res = await api.delete("/users/me/avatar");
        return res.data;
    }

    static async loadAvatar(userId: number, signal?: AbortSignal): Promise<Blob> {
        this.getAuthDetails();
        const res = await api.get(`/users/${userId}/avatar`, { responseType: "blob", signal });
        return res.data;
    }

    static async loadBlocked(): Promise<User[]> {
        this.getAuthDetails();
        const res = await api.get("/users/blocked");
        return res.data;
    }

    static async blockUser(userId: number): Promise<void> {
        this.getAuthDetails();
        await api.put(`/users/${userId}/block`);
    }

    static async unblockUser(userId: number): Promise<void> {
        this.getAuthDetails();
        await api.delete(`/users/${userId}/block`);
    }

    /* the image bytes; the caller turns them into an object URL */
    static async loadFile(fileName: string, signal?: AbortSignal): Promise<Blob> {
        this.getAuthDetails();
        const res = await api.get(`/message/file/${encodeURIComponent(fileName)}/raw`, { responseType: "blob", signal });
        return res.data;
    }
}

export default ChatAPI;
