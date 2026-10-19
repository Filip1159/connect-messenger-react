import type { Message, MessageType } from "../../types";
import { http } from "../http";

/* resolves with the stored message */
export function postMessage(chatId: number, type: MessageType, content: string | File, replyToId?: number) {
    const formData = new FormData()
    formData.append('chatId', String(chatId))
    formData.append('type', type)
    if (replyToId !== undefined) formData.append('replyToId', String(replyToId))
    formData.append(type === 'TEXT' ? 'textContent' : 'fileContent', content)
    return http.post<Message>("/messages", formData);
}

export async function loadMessage(id: number, signal?: AbortSignal): Promise<Message> {
    const res = await http.get<Message>(`/messages/${id}`, { signal });
    return res.data;
}

/* my reaction to a message (replaces the previous one); resolves with the updated message */
export async function react(id: number, emoji: string): Promise<Message> {
    const res = await http.put<Message>(`/messages/${id}/reaction`, { emoji });
    return res.data;
}

export async function removeReaction(id: number): Promise<Message> {
    const res = await http.delete<Message>(`/messages/${id}/reaction`);
    return res.data;
}

/* the author changes the text; resolves with the updated message */
export async function editMessage(id: number, textContent: string): Promise<Message> {
    const res = await http.patch<Message>(`/messages/${id}`, { textContent });
    return res.data;
}

/* soft delete by the author; resolves with the (content-less) message */
export async function deleteMessage(id: number): Promise<Message> {
    const res = await http.delete<Message>(`/messages/${id}`);
    return res.data;
}

/* the image bytes; the caller turns them into an object URL */
export async function loadFile(fileName: string, signal?: AbortSignal): Promise<Blob> {
    const res = await http.get(`/messages/files/${encodeURIComponent(fileName)}`, { responseType: "blob", signal });
    return res.data;
}
