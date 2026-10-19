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
}
