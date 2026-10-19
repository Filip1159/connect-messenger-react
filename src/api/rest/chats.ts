import type { Chat, Message, Presence } from "../../types";
import { http } from "../http";
import { getAuthDetails } from "../session";

export const PAGE_SIZE = 50;

/* chats come without messages, the history is loaded with loadMessages() */
export async function loadAllChats(): Promise<Chat[]> {
    const res = await http.get("/chats", { params: { includeMessages: false } });
    return res.data;
}

/* messages newer than `after`, oldest first - used to catch up after a lost connection */
export async function loadMessagesAfter(chatId: number, after: number, signal?: AbortSignal): Promise<Message[]> {
    const res = await http.get(`/chats/${chatId}/messages`, { params: { after, size: PAGE_SIZE }, signal });
    return res.data;
}

export async function loadPresence(): Promise<Presence[]> {
    const res = await http.get("/presence");
    return res.data;
}

/* a page of the history, oldest first; `before` is the id of the oldest message already known */
export async function loadMessages(chatId: number, before?: number, signal?: AbortSignal): Promise<Message[]> {
    const res = await http.get(`/chats/${chatId}/messages`, { params: { before, size: PAGE_SIZE }, signal });
    return res.data;
}

/* puts new status to api, when I read unseen message.
 * api sends status update through websocket, chatReducer performs context update */
export function updateStatus(chatId: number, messageId: number) {
    // the user and the time are taken from the session / the server clock
    return http.put("/status", { id: { chatId }, messageId });
}

/* text messages containing `query`, newest first; `before` is the id of the oldest match already shown */
export async function searchMessages(chatId: number, query: string, before?: number, signal?: AbortSignal): Promise<Message[]> {
    const res = await http.get(`/chats/${chatId}/messages`, { params: { query, before, size: PAGE_SIZE }, signal });
    return res.data;
}

/* a 1:1 chat (an existing one is returned if there is one) or, with a name or more people, a group */
export async function createChat(recipientIds: number[], name?: string): Promise<Chat> {
    const res = await http.post('/chats', {
        userIds: [getAuthDetails().id, ...recipientIds],
        ...(name ? { name } : {})
    });
    return res.data;
}

export async function loadChat(chatId: number): Promise<Chat> {
    const res = await http.get(`/chats/${chatId}`);
    return res.data;
}

/* archive / mute: my own settings of the chat */
export async function updateChatSettings(chatId: number, settings: { archived?: boolean; muted?: boolean }): Promise<Chat> {
    const res = await http.patch(`/chats/${chatId}/settings`, settings);
    return res.data;
}

export async function renameChat(chatId: number, name: string): Promise<Chat> {
    const res = await http.patch(`/chats/${chatId}`, { name });
    return res.data;
}

export async function addMembers(chatId: number, userIds: number[]): Promise<Chat> {
    const res = await http.post(`/chats/${chatId}/members`, { userIds });
    return res.data;
}

/* an admin removes a member; removing myself leaves the group */
export async function removeMember(chatId: number, userId: number): Promise<void> {
    await http.delete(`/chats/${chatId}/members/${userId}`);
}

export async function setAdmin(chatId: number, userId: number, admin: boolean): Promise<Chat> {
    const res = admin
        ? await http.put(`/chats/${chatId}/admins/${userId}`)
        : await http.delete(`/chats/${chatId}/admins/${userId}`);
    return res.data;
}
