import { describe, expect, it } from "vitest";
import reducer, { addChat, addMessage, initialChatState, setActive, setChats, updateStatus } from "./chatsSlice";
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
