import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { makeStore } from "../index";
import { createChatSync } from "./chatSync";
import type { ChatSyncApi } from "./chatSync";
import type { ChatCallbacks, Socket, SocketHandlers } from "../../api/socket";
import type { Message } from "../../types";
import { makeChat } from "../../test/fixtures";

/* the sync only needs the page size to be small, to see pages being followed */
vi.mock("../../api/rest/chats", () => ({ PAGE_SIZE: 2 }));

const api = {
    loadAllChats: vi.fn(),
    loadMessages: vi.fn(),
    loadMessagesAfter: vi.fn(),
    loadPresence: vi.fn(),
    loadProfile: vi.fn(),
    loadBlocked: vi.fn()
} satisfies Record<keyof ChatSyncApi, unknown>;
const sock = {
    connect: vi.fn(),
    close: vi.fn(),
    subscribeToChat: vi.fn(),
    unsubscribeChat: vi.fn(),
    watchUser: vi.fn(),
    sendTyping: vi.fn()
} satisfies Record<keyof Socket, unknown>;
const me = { id: 1, username: "user1", name: "Name1", surname: "Surname1", exp: 0 };
const raw = (body: unknown) => body;
/* what the backend sends: { type, payload } */
const frame = (type: string, payload: unknown) => raw({ type, payload });
const msg = (id: number, chatId: number, userId: number): Message =>
    ({ id, chatId, userId, type: "TEXT", content: `m${id}`, time: "2021-01-01T10:00:00" });

const start = async () => {
    const store = makeStore({ auth: { details: me } });
    const stop = createChatSync({
        dispatch: store.dispatch, getState: store.getState, myId: 1, api: api as unknown as ChatSyncApi, socket: sock
    }).start();
    await waitFor(() => expect(sock.connect).toHaveBeenCalled());
    const [ , callbacks, handlers ] = sock.connect.mock.calls[0] as unknown as [ unknown, ChatCallbacks, SocketHandlers ];
    return { store, callbacks, handlers, stop };
};

describe("chat sync", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.loadAllChats.mockResolvedValue([ makeChat(1, null) ]);
        api.loadMessages.mockResolvedValue([ msg(1, 1, 2), msg(2, 1, 1) ]);
        api.loadPresence.mockResolvedValue([ { userId: 2, online: true, lastSeen: null } ]);
        api.loadProfile.mockResolvedValue({ id: 1, username: "user1", name: "Fresh", surname: "Name", avatarKey: "a.png" });
        api.loadBlocked.mockResolvedValue([ { id: 9, username: "user9", name: "Name9", surname: "Surname9" } ]);
    });

    it("closes the socket when it is ended", async () => {
        const { stop } = await start();
        stop();
        expect(sock.close).toHaveBeenCalledTimes(1);
    });

    it("shows the chat list as failed when it can't be loaded, without connecting", async () => {
        api.loadAllChats.mockRejectedValue(new Error("down"));
        const store = makeStore({ auth: { details: me } });
        createChatSync({ dispatch: store.dispatch, getState: store.getState, myId: 1, api: api as unknown as ChatSyncApi, socket: sock }).start();
        await waitFor(() => expect(store.getState().ui.chatsStatus).toBe("failed"));
        expect(sock.connect).not.toHaveBeenCalled();
    });

    it("shows the connection state it is told about", async () => {
        const { store, handlers } = await start();
        expect(store.getState().ui.chatsStatus).toBe("ready");
        handlers.onConnection("reconnecting");
        expect(store.getState().ui.connection).toBe("reconnecting");
    });

    it("takes my current profile and the people I blocked from the server", async () => {
        const { store } = await start();
        await waitFor(() => expect(store.getState().auth.details).toMatchObject({ name: "Fresh", avatarKey: "a.png" }));
        await waitFor(() => expect(store.getState().chats.blocked.map(u => u.id)).toEqual([ 9 ]));
    });

    it("loads the messages of a chat that is new to me (a group I was added to) and follows it", async () => {
        const { store, handlers } = await start();
        api.loadMessages.mockResolvedValue([ msg(7, 5, 2) ]);

        await handlers.onNewChat(frame("chat.changed", { ...makeChat(5, null, { users: [ 1, 2, 3 ] }), group: true, name: "Team" }));

        const group = store.getState().chats.chats.find(c => c.id === 5)!;
        expect(group).toMatchObject({ group: true, name: "Team" });
        expect(group.messages.map(m => m.id)).toEqual([ 7 ]);
        expect(sock.subscribeToChat).toHaveBeenCalledWith(5, expect.anything());
    });

    it("updates a known chat instead of replacing it (the messages stay)", async () => {
        const { store, handlers } = await start();

        await handlers.onNewChat(frame("chat.changed", { ...makeChat(1, null, { users: [ 1, 2, 3 ] }), group: true, name: "Renamed", adminIds: [ 1 ] }));

        const chat = store.getState().chats.chats.find(c => c.id === 1)!;
        expect(chat).toMatchObject({ name: "Renamed", adminIds: [ 1 ] });
        expect(chat.users).toHaveLength(3);
        expect(chat.messages.map(m => m.id)).toEqual([ 1, 2 ]);
    });

    it("drops a chat I was removed from and stops following it", async () => {
        const { store, handlers } = await start();

        handlers.onChatRemoved(frame("chat.removed", { chatId: 1 }));

        expect(store.getState().chats.chats).toEqual([]);
        expect(sock.unsubscribeChat).toHaveBeenCalledWith(1);
    });

    it("loads the newest page of every chat, presence and flags that older messages exist", async () => {
        const { store } = await start();
        await waitFor(() => expect(store.getState().chats.presence[2]?.online).toBe(true));
        const chat = store.getState().chats.chats[0];
        expect(chat.messages.map(m => m.id)).toEqual([ 1, 2 ]);
        expect(chat.hasMore).toBe(true);
    });

    it("counts live messages of others as unread, but not my own", async () => {
        const { store, callbacks } = await start();
        callbacks.onMessage(frame("message.created", msg(3, 1, 2)));
        callbacks.onMessage(frame("message.created", msg(4, 1, 1)));
        expect(store.getState().chats.chats[0].unreadCount).toBe(1);
    });

    it("treats edits, reactions and deletions of known messages as updates, not as new messages", async () => {
        const { store, callbacks } = await start();
        const known = store.getState().chats.chats[0].messages[0];
        const unreadBefore = store.getState().chats.chats[0].unreadCount;

        callbacks.onMessage(frame("message.edited", { ...known, userId: 2, content: "changed", editedAt: "2021-01-01T11:00:00" }));
        callbacks.onMessage(frame("message.reacted", { ...known, userId: 2, content: "changed", reactions: [ { userId: 2, emoji: "👍" } ] }));

        const chat = store.getState().chats.chats[0];
        expect(chat.messages.find(m => m.id === known.id)).toMatchObject({ content: "changed" });
        expect(chat.unreadCount).toBe(unreadBefore);
        callbacks.onMessage(frame("message.deleted", { ...known, userId: 2, content: null, deletedAt: "2021-01-01T12:00:00" }));
        expect(store.getState().chats.chats[0].messages.find(m => m.id === known.id)).toMatchObject({ deletedAt: "2021-01-01T12:00:00" });
    });

    it("applies read statuses and presence only from events of their own type", async () => {
        const { store, callbacks, handlers } = await start();

        callbacks.onStatus(frame("status.updated", { id: { chatId: 1, userId: 2 }, messageId: 2 }));
        expect(store.getState().chats.chats[0].status.find(s => s.id.userId === 2)?.messageId).toBe(2);

        handlers.onPresence(frame("presence.changed", { userId: 2, online: false, lastSeen: "2021-01-01T10:00:00" }));
        expect(store.getState().chats.presence[2]?.online).toBe(false);

        callbacks.onStatus(frame("typing", { id: { chatId: 1, userId: 2 }, messageId: 1 }));  // the wrong type for this topic
        expect(store.getState().chats.chats[0].status.find(s => s.id.userId === 2)?.messageId).toBe(2);
    });

    it("skips unknown event types and survives malformed frames", async () => {
        const { store, callbacks } = await start();
        const error = vi.spyOn(console, "error").mockImplementation(() => {});

        callbacks.onMessage(frame("message.pinned", msg(9, 1, 2)));
        callbacks.onMessage(raw(msg(10, 1, 2)));  // an old style frame without the envelope
        callbacks.onMessage("not an envelope");

        expect(store.getState().chats.chats[0].messages.map(m => m.id)).toEqual([ 1, 2 ]);
        expect(error).toHaveBeenCalledTimes(2);  // the unknown type is not an error
        error.mockRestore();
    });

    it("shows who is typing and ignores my own typing", async () => {
        const { store, callbacks } = await start();
        callbacks.onTyping(frame("typing", { chatId: 1, userId: 1 }));
        expect(store.getState().chats.typing[1] ?? []).toEqual([]);
        callbacks.onTyping(frame("typing", { chatId: 1, userId: 2 }));
        expect(store.getState().chats.typing[1]).toEqual([ 2 ]);
    });

    it("catches up after a reconnect: missed messages, server unread counts and new chats", async () => {
        const { store, handlers } = await start();
        api.loadAllChats.mockResolvedValue([
            { ...makeChat(1, null), unreadCount: 2 },
            makeChat(2, null, { users: [ 1, 3 ] })
        ]);
        api.loadMessagesAfter.mockResolvedValue([ msg(3, 1, 2) ]);

        await handlers.onReconnect();

        expect(api.loadMessagesAfter).toHaveBeenCalledWith(1, 2); // after the last known message
        const chats = store.getState().chats.chats;
        expect(chats.find(c => c.id === 1)).toMatchObject({ unreadCount: 2 });
        expect(chats.find(c => c.id === 1)!.messages.map(m => m.id)).toEqual([ 1, 2, 3 ]);
        expect(chats.some(c => c.id === 2)).toBe(true);
        expect(sock.subscribeToChat).toHaveBeenCalledWith(2, expect.anything());
        expect(sock.watchUser).toHaveBeenCalledWith(3);
    });

    it("drops the chats I was removed from while offline", async () => {
        const { store, handlers } = await start();
        api.loadAllChats.mockResolvedValue([ makeChat(2, null, { users: [ 1, 3 ] }) ]);

        await handlers.onReconnect();

        expect(store.getState().chats.chats.map(c => c.id)).toEqual([ 2 ]);
        expect(sock.unsubscribeChat).toHaveBeenCalledWith(1);
    });

    it("follows pages while catching up", async () => {
        const { handlers } = await start();
        api.loadMessagesAfter
            .mockResolvedValueOnce([ msg(3, 1, 2), msg(4, 1, 2) ]) // a full page (PAGE_SIZE is 2 here)
            .mockResolvedValueOnce([ msg(5, 1, 2) ]);

        await handlers.onReconnect();

        expect(api.loadMessagesAfter).toHaveBeenNthCalledWith(2, 1, 4);
    });
});
