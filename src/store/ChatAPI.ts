import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import type { IMessage, StompSubscription } from "@stomp/stompjs";
import { baseURL, http } from "../api/http";
import { getToken } from "../api/token";
import { currentUserId, getAuthDetails, isSignedIn, onSignOut, signIn, signOut } from "../api/session";
import type { SignInResult } from "../api/session";
import type { Chat, Message, MessageType, Presence, User } from "../types";

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

export const PAGE_SIZE = 50;

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

    /* chats come without messages, the history is loaded with loadMessages() */
    static async loadAllChats(): Promise<Chat[]> {
        const res = await http.get(`/chats/${getAuthDetails().id}`, { params: { includeMessages: false } });
        return res.data;
    }

    /* messages newer than `after`, oldest first - used to catch up after a lost connection */
    static async loadMessagesAfter(chatId: number, after: number, signal?: AbortSignal): Promise<Message[]> {
        getAuthDetails();
        const res = await http.get(`/chats/chat/${chatId}/messages`, { params: { after, size: PAGE_SIZE }, signal });
        return res.data;
    }

    static async loadPresence(): Promise<Presence[]> {
        getAuthDetails();
        const res = await http.get("/presence");
        return res.data;
    }

    /* a page of the history, oldest first; `before` is the id of the oldest message already known */
    static async loadMessages(chatId: number, before?: number, signal?: AbortSignal): Promise<Message[]> {
        getAuthDetails();
        const res = await http.get(`/chats/chat/${chatId}/messages`, { params: { before, size: PAGE_SIZE }, signal });
        return res.data;
    }

    /* puts new status to api, when I read unseen message.
     * api sends status update through websocket, chatReducer performs context update */
    static updateStatus(chatId: number, messageId: number) {
        getAuthDetails();
        // the user and the time are taken from the session / the server clock
        return http.put("/status", { id: { chatId }, messageId });
    }

    /* resolves with the stored message */
    static postMessage(chatId: number, type: MessageType, content: string | File, replyToId?: number) {
        getAuthDetails();
        const formData = new FormData()
        formData.append('chatId', String(chatId))
        formData.append('type', type)
        if (replyToId !== undefined) formData.append('replyToId', String(replyToId))
        formData.append(type === 'TEXT' ? 'textContent' : 'fileContent', content)
        return http.post<Message>("/message", formData);
    }

    static async loadMessage(id: number, signal?: AbortSignal): Promise<Message> {
        getAuthDetails();
        const res = await http.get<Message>(`/message/${id}`, { signal });
        return res.data;
    }

    /* my reaction to a message (replaces the previous one); resolves with the updated message */
    static async react(id: number, emoji: string): Promise<Message> {
        getAuthDetails();
        const res = await http.put<Message>(`/message/${id}/reaction`, { emoji });
        return res.data;
    }

    static async removeReaction(id: number): Promise<Message> {
        getAuthDetails();
        const res = await http.delete<Message>(`/message/${id}/reaction`);
        return res.data;
    }

    /* the author changes the text; resolves with the updated message */
    static async editMessage(id: number, textContent: string): Promise<Message> {
        getAuthDetails();
        const res = await http.patch<Message>(`/message/${id}`, { textContent });
        return res.data;
    }

    /* soft delete by the author; resolves with the (content-less) message */
    static async deleteMessage(id: number): Promise<Message> {
        getAuthDetails();
        const res = await http.delete<Message>(`/message/${id}`);
        return res.data;
    }

    /* text messages containing `query`, newest first; `before` is the id of the oldest match already shown */
    static async searchMessages(chatId: number, query: string, before?: number, signal?: AbortSignal): Promise<Message[]> {
        getAuthDetails();
        const res = await http.get(`/chats/chat/${chatId}/messages`, { params: { query, before, size: PAGE_SIZE }, signal });
        return res.data;
    }

    static async searchUsersByQuery(query: string, signal?: AbortSignal): Promise<User[]> {
        getAuthDetails();
        const res = await http.get(`/user/${encodeURIComponent(query)}`, { signal });
        return res.data;
    }

    /* a 1:1 chat (an existing one is returned if there is one) or, with a name or more people, a group */
    static async createChat(recipientIds: number[], name?: string): Promise<Chat> {
        const res = await http.post('/chats', {
            userIds: [getAuthDetails().id, ...recipientIds],
            ...(name ? { name } : {})
        });
        return res.data;
    }

    static async loadChat(chatId: number): Promise<Chat> {
        getAuthDetails();
        const res = await http.get(`/chats/chat/${chatId}`);
        return res.data;
    }

    /* archive / mute: my own settings of the chat */
    static async updateChatSettings(chatId: number, settings: { archived?: boolean; muted?: boolean }): Promise<Chat> {
        getAuthDetails();
        const res = await http.patch(`/chats/chat/${chatId}/settings`, settings);
        return res.data;
    }

    static async renameChat(chatId: number, name: string): Promise<Chat> {
        getAuthDetails();
        const res = await http.patch(`/chats/chat/${chatId}`, { name });
        return res.data;
    }

    static async addMembers(chatId: number, userIds: number[]): Promise<Chat> {
        getAuthDetails();
        const res = await http.post(`/chats/chat/${chatId}/members`, { userIds });
        return res.data;
    }

    /* an admin removes a member; removing myself leaves the group */
    static async removeMember(chatId: number, userId: number): Promise<void> {
        getAuthDetails();
        await http.delete(`/chats/chat/${chatId}/members/${userId}`);
    }

    static async setAdmin(chatId: number, userId: number, admin: boolean): Promise<Chat> {
        getAuthDetails();
        const res = admin
            ? await http.put(`/chats/chat/${chatId}/admins/${userId}`)
            : await http.delete(`/chats/chat/${chatId}/admins/${userId}`);
        return res.data;
    }

    /* creates the account; the caller signs in afterwards */
    static async register(account: { username: string; name: string; surname: string; password: string }): Promise<User> {
        const res = await http.post("/users", account);
        return res.data;
    }

    static async loadProfile(): Promise<User> {
        getAuthDetails();
        const res = await http.get("/users/me");
        return res.data;
    }

    static async updateProfile(name: string, surname: string): Promise<User> {
        getAuthDetails();
        const res = await http.patch("/users/me", { name, surname });
        return res.data;
    }

    static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        getAuthDetails();
        await http.put("/users/me/password", { currentPassword, newPassword });
    }

    static async uploadAvatar(file: File): Promise<User> {
        getAuthDetails();
        const formData = new FormData();
        formData.append("file", file);
        const res = await http.put("/users/me/avatar", formData);
        return res.data;
    }

    static async removeAvatar(): Promise<User> {
        getAuthDetails();
        const res = await http.delete("/users/me/avatar");
        return res.data;
    }

    static async loadAvatar(userId: number, signal?: AbortSignal): Promise<Blob> {
        getAuthDetails();
        const res = await http.get(`/users/${userId}/avatar`, { responseType: "blob", signal });
        return res.data;
    }

    static async loadBlocked(): Promise<User[]> {
        getAuthDetails();
        const res = await http.get("/users/blocked");
        return res.data;
    }

    static async blockUser(userId: number): Promise<void> {
        getAuthDetails();
        await http.put(`/users/${userId}/block`);
    }

    static async unblockUser(userId: number): Promise<void> {
        getAuthDetails();
        await http.delete(`/users/${userId}/block`);
    }

    /* the image bytes; the caller turns them into an object URL */
    static async loadFile(fileName: string, signal?: AbortSignal): Promise<Blob> {
        getAuthDetails();
        const res = await http.get(`/message/file/${encodeURIComponent(fileName)}/raw`, { responseType: "blob", signal });
        return res.data;
    }
}

// signing out (also by an expired token or a 401) closes the websocket
onSignOut(() => ChatAPI.closeWebsocket());

export default ChatAPI;
