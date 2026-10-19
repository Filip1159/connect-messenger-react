import type { Chat, ChatStatus, Message, User } from "../../types";

/* helpers for reading chat data, so components don't depend on the position of users / statuses in arrays */

export const getRecipient = (chat: Chat | null | undefined, userId: number | undefined): User | undefined =>
    chat?.users.find(u => u.id !== userId);

export const isGroup = (chat: Chat | null | undefined): boolean => !!chat?.group;

export const getOthers = (chat: Chat | null | undefined, userId: number | undefined): User[] =>
    chat?.users.filter(u => u.id !== userId) ?? [];

export const fullName = (user: User): string => `${user.name} ${user.surname}`;

/* a 1:1 chat is named after the other person, a group has a title (or lists its members) */
export const chatTitle = (chat: Chat | null | undefined, userId: number | undefined): string => {
    if (!chat) return "";
    if (!isGroup(chat)) {
        const other = getRecipient(chat, userId);
        return other ? fullName(other) : "";
    }
    return chat.name || getOthers(chat, userId).map(u => u.name).join(", ");
};

export const isAdmin = (chat: Chat | null | undefined, userId: number | undefined): boolean =>
    userId !== undefined && !!chat?.adminIds?.includes(userId);

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
