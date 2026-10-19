export interface User {
    id: number;
    username: string;
    name: string;
    surname: string;
}

/* claims of the JWT issued by the backend */
export interface AuthDetails extends User {
    exp: number;
}

export type MessageType = "TEXT" | "FILE";

export interface Message {
    id: number;
    chatId: number;
    userId: number;
    type: MessageType;
    /* text of the message, or the name of the file for MessageType FILE */
    content: string;
    /* local date and time without timezone, e.g. 2021-05-04T12:30:15 */
    time: string;
    /* set once the author changed the text */
    editedAt?: string | null;
    /* the author deleted the message: it keeps its place but has no content */
    deleted?: boolean;
    /* the message this one answers (same chat) */
    replyToId?: number | null;
    /* who reacted with which emoji, grouped by emoji */
    reactions?: Reaction[];
}

export interface Reaction {
    emoji: string;
    userIds: number[];
}

export interface ChatStatus {
    id: { chatId: number; userId: number };
    /* the last message seen by the user */
    messageId: number | null;
    time?: string;
}

export interface Chat {
    id: number;
    users: User[];
    messages: Message[];
    status: ChatStatus[];
    /* client-side: older messages exist on the server (history is loaded page by page) */
    hasMore?: boolean;
    /* messages of other users that I haven't seen yet */
    unreadCount?: number;
}

export interface Presence {
    userId: number;
    online: boolean;
    /* local date and time of the last closed session, null if the user was never seen */
    lastSeen: string | null;
}

/* a message of mine that isn't confirmed by the server yet */
export interface OutboxItem {
    localId: string;
    chatId: number;
    type: MessageType;
    /* the text, or the name of the chosen file */
    content: string;
    status: "sending" | "failed";
    replyToId?: number;
}
