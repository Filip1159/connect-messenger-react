import type { Message, MessageType } from "../../types";
import { http } from "../http";

/* resolves with the stored message */
export function postMessage(chatId: number, type: MessageType, content: string | File, replyToId?: number) {
    const formData = new FormData()
    formData.append('chatId', String(chatId))
    formData.append('type', type)
    if (replyToId !== undefined) formData.append('replyToId', String(replyToId))
    formData.append(type === 'TEXT' ? 'textContent' : 'fileContent', content)
    return http.post<Message>("/message", formData);
}

export async function loadMessage(id: number, signal?: AbortSignal): Promise<Message> {
    const res = await http.get<Message>(`/message/${id}`, { signal });
    return res.data;
}

/* my reaction to a message (replaces the previous one); resolves with the updated message */
export async function react(id: number, emoji: string): Promise<Message> {
    const res = await http.put<Message>(`/message/${id}/reaction`, { emoji });
    return res.data;
}

export async function removeReaction(id: number): Promise<Message> {
    const res = await http.delete<Message>(`/message/${id}/reaction`);
    return res.data;
}

/* the author changes the text; resolves with the updated message */
export async function editMessage(id: number, textContent: string): Promise<Message> {
    const res = await http.patch<Message>(`/message/${id}`, { textContent });
    return res.data;
}

/* soft delete by the author; resolves with the (content-less) message */
export async function deleteMessage(id: number): Promise<Message> {
    const res = await http.delete<Message>(`/message/${id}`);
    return res.data;
}

/* the image bytes; the caller turns them into an object URL */
export async function loadFile(fileName: string, signal?: AbortSignal): Promise<Blob> {
    const res = await http.get(`/message/file/${encodeURIComponent(fileName)}/raw`, { responseType: "blob", signal });
    return res.data;
}
