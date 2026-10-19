import type { Chat, ChatStatus, Message, User } from "../../types";

/* helpers for reading chat data, so components don't depend on the position of users / statuses in arrays */

export const getRecipient = (chat: Chat | null | undefined, userId: number | undefined): User | undefined =>
    chat?.users.find(u => u.id !== userId);

export const getMyStatus = (chat: Chat | null | undefined, userId: number | undefined): ChatStatus | undefined =>
    chat?.status.find(s => s.id.userId === userId);

export const getRecipientStatus = (chat: Chat | null | undefined, userId: number | undefined): ChatStatus | undefined =>
    chat?.status.find(s => s.id.userId !== userId);

export const participatesInChat = (chat: Chat, userId: number): boolean => chat.users.some(u => u.id === userId);

export const getLastMessage = (chat: Chat | null | undefined): Message | undefined =>
    chat?.messages[chat.messages.length - 1];

/* chats without messages (just created) come first, the rest is ordered by the newest message */
const lastActivity = (chat: Chat): string => getLastMessage(chat)?.time ?? "9999";

export const sortChats = (chats: Chat[]): Chat[] =>
    [...chats].sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)));
