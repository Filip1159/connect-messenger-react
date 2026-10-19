import { describe, expect, it } from "vitest";
import reducer, {
    addChat, addMessage, initialChatState, markRead, outboxAdd, outboxRemove, outboxStatus, prependMessages, setActive,
    setChats, setPresence, setTyping, syncChats, updatePresence, updateStatus
} from "./chatsSlice";
import { resetDetails } from "../auth/authSlice";
import type { Message } from "../../types";
import { makeChat } from "../../test/fixtures";

const message = (id: number, chatId: number, time: string, content: string): Message =>
    ({ id, chatId, userId: 1, type: "TEXT", time, content });

const withChats = () => reducer(initialChatState, setChats([
    makeChat(1, "2021-01-01T10:00:00"),
    makeChat(2, "2021-01-02T10:00:00")
]));

describe("chatsSlice", () => {
    it("sorts chats by newest message and activates the first one", () => {
        const state = withChats();
        expect(state.chats.map(c => c.id)).toEqual([2, 1]);
        expect(state.activeId).toBe(2);
    });

    it("keeps the active chat (by id) when new data arrives", () => {
        let state = reducer(withChats(), setActive(1));
        state = reducer(state, addMessage(message(99, 1, "2021-01-03T00:00:00", "x")));
        expect(state.chats.map(c => c.id)).toEqual([1, 2]);
        expect(state.activeId).toBe(1);
    });

    it("ignores duplicated messages and messages of unknown chats", () => {
        const state = withChats();
        const existing = message(20, 2, "2021-01-02T10:00:00", "hi");
        expect(reducer(state, addMessage(existing))).toBe(state);
        expect(reducer(state, addMessage({ ...existing, id: 5, chatId: 404 }))).toBe(state);
    });

    it("puts older messages in front, skipping the ones already known", () => {
        const state = reducer(withChats(), prependMessages({
            chatId: 1,
            messages: [message(5, 1, "2020-12-31T10:00:00", "old"), message(10, 1, "2021-01-01T10:00:00", "dup")],
            hasMore: true
        }));
        const chat = state.chats.find(c => c.id === 1)!;
        expect(chat.messages.map(m => m.id)).toEqual([5, 10]);
        expect(chat.hasMore).toBe(true);
    });

    it("counts live messages of others as unread until the chat is marked read", () => {
        let state = withChats();
        state = reducer(state, addMessage(message(50, 1, "2021-01-03T00:00:00", "x"), true));
        state = reducer(state, addMessage(message(51, 1, "2021-01-03T00:01:00", "y"), true));
        state = reducer(state, addMessage(message(52, 1, "2021-01-03T00:02:00", "mine"))); // my own or catch-up
        expect(state.chats.find(c => c.id === 1)!.unreadCount).toBe(2);

        state = reducer(state, markRead(1));
        expect(state.chats.find(c => c.id === 1)!.unreadCount).toBe(0);
    });

    it("does not count a duplicated message twice", () => {
        let state = withChats();
        state = reducer(state, addMessage(message(50, 1, "2021-01-03T00:00:00", "x"), true));
        state = reducer(state, addMessage(message(50, 1, "2021-01-03T00:00:00", "x"), true));
        expect(state.chats.find(c => c.id === 1)!.unreadCount).toBe(1);
    });

    it("takes statuses and unread counts from fresh chat data without touching the messages", () => {
        const fresh = { ...makeChat(1, null), unreadCount: 7, status: [ { id: { chatId: 1, userId: 2 }, messageId: 10 } ] };
        const state = reducer(withChats(), syncChats([ fresh, makeChat(99, null) ]));
        const chat = state.chats.find(c => c.id === 1)!;
        expect(chat.unreadCount).toBe(7);
        expect(chat.status).toEqual(fresh.status);
        expect(chat.messages).toHaveLength(1);
        expect(state.chats.some(c => c.id === 99)).toBe(false);
    });

    it("tracks presence of users", () => {
        let state = reducer(withChats(), setPresence([ { userId: 2, online: false, lastSeen: "2021-01-01T10:00:00" } ]));
        expect(state.presence[2].online).toBe(false);
        state = reducer(state, updatePresence({ userId: 2, online: true, lastSeen: null }));
        expect(state.presence[2].online).toBe(true);
    });

    it("tracks who is typing and clears it when their message arrives", () => {
        let state = reducer(withChats(), setTyping({ chatId: 1, userId: 2, active: true }));
        state = reducer(state, setTyping({ chatId: 1, userId: 2, active: true }));
        expect(state.typing[1]).toEqual([ 2 ]);

        state = reducer(state, addMessage({ ...message(60, 1, "2021-01-03T00:00:00", "hi"), userId: 2 }, true));
        expect(state.typing[1]).toEqual([]);
        state = reducer(state, setTyping({ chatId: 1, userId: 2, active: true }));
        state = reducer(state, setTyping({ chatId: 1, userId: 2, active: false }));
        expect(state.typing[1]).toEqual([]);
    });

    it("keeps messages that are being sent in the outbox until they are confirmed", () => {
        const item = { localId: "l1", chatId: 1, type: "TEXT" as const, content: "hello", status: "sending" as const };
        let state = reducer(withChats(), outboxAdd(item));
        state = reducer(state, outboxStatus({ localId: "l1", status: "failed" }));
        expect(state.outbox).toEqual([ { ...item, status: "failed" } ]);
        state = reducer(state, outboxRemove("l1"));
        expect(state.outbox).toEqual([]);
    });

    it("updates the status of the right user", () => {
        const state = reducer(withChats(), updateStatus({ id: { chatId: 1, userId: 2 }, messageId: 10 }));
        const statuses = state.chats.find(c => c.id === 1)!.status;
        expect(statuses.map(s => s.messageId)).toEqual([null, 10]);
    });

    it("does not add the same chat twice, and puts new empty chats first", () => {
        let state = withChats();
        expect(reducer(state, addChat(makeChat(1, null)))).toBe(state);
        state = reducer(state, addChat(makeChat(3, null)));
        expect(state.chats[0].id).toBe(3);
    });

    it("drops all chats when the user signs out", () => {
        expect(reducer(withChats(), resetDetails())).toEqual(initialChatState);
    });
});
