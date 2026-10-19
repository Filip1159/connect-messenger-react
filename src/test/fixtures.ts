import type { Chat } from "../types";

export const makeChat = (id: number, lastMessageTime: string | null, { users = [1, 2] } = {}): Chat => ({
    id,
    users: users.map(u => ({ id: u, username: `user${u}`, name: `Name${u}`, surname: `Surname${u}` })),
    messages: lastMessageTime
        ? [{ id: id * 10, chatId: id, userId: users[0], type: "TEXT" as const, content: "hi", time: lastMessageTime }]
        : [],
    status: users.map(u => ({ id: { chatId: id, userId: u }, messageId: null }))
});
