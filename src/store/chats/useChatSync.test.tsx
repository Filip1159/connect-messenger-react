import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { makeStore } from "../index";
import useChatSync from "./useChatSync";
import ChatAPI from "../ChatAPI";
import type { ChatCallbacks, SocketHandlers } from "../ChatAPI";
import type { IMessage } from "@stomp/stompjs";
import type { Message } from "../../types";
import { makeChat } from "../../test/fixtures";

vi.mock("../ChatAPI", () => ({
    PAGE_SIZE: 2,
    default: {
        onSignOut: vi.fn(),
        getAuthDetails: vi.fn(() => { throw new Error("not signed in"); }),
        loadAllChats: vi.fn(),
        loadMessages: vi.fn(),
        loadMessagesAfter: vi.fn(),
        loadPresence: vi.fn(),
        initWebsocket: vi.fn(),
        closeWebsocket: vi.fn(),
        subscribeToChat: vi.fn(),
        watchUser: vi.fn(),
        unsubscribeChat: vi.fn(),
        loadProfile: vi.fn(),
        loadBlocked: vi.fn(),
    }
}));

const api = vi.mocked(ChatAPI);
const me = { id: 1, username: "user1", name: "Name1", surname: "Surname1", exp: 0 };
const frame = (body: unknown) => ({ body: JSON.stringify(body) }) as IMessage;
const msg = (id: number, chatId: number, userId: number): Message =>
    ({ id, chatId, userId, type: "TEXT", content: `m${id}`, time: "2021-01-01T10:00:00" });

const start = async () => {
    const store = makeStore({ auth: { details: me } });
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    renderHook(() => useChatSync(), { wrapper });
    await waitFor(() => expect(api.initWebsocket).toHaveBeenCalled());
    const [ , callbacks, handlers ] = api.initWebsocket.mock.calls[0] as unknown as [ unknown, ChatCallbacks, SocketHandlers ];
    return { store, callbacks, handlers };
};

describe("useChatSync", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.loadAllChats.mockResolvedValue([ makeChat(1, null) ]);
        api.loadMessages.mockResolvedValue([ msg(1, 1, 2), msg(2, 1, 1) ]);
        api.loadPresence.mockResolvedValue([ { userId: 2, online: true, lastSeen: null } ]);
        api.loadProfile.mockResolvedValue({ id: 1, username: "user1", name: "Fresh", surname: "Name", avatarKey: "a.png" });
        api.loadBlocked.mockResolvedValue([ { id: 9, username: "user9", name: "Name9", surname: "Surname9" } ]);
    });

    it("takes my current profile and the people I blocked from the server", async () => {
        const { store } = await start();
        await waitFor(() => expect(store.getState().auth.details).toMatchObject({ name: "Fresh", avatarKey: "a.png" }));
        await waitFor(() => expect(store.getState().chats.blocked.map(u => u.id)).toEqual([ 9 ]));
    });

    it("loads the messages of a chat that is new to me (a group I was added to) and follows it", async () => {
        const { store, handlers } = await start();
        api.loadMessages.mockResolvedValue([ msg(7, 5, 2) ]);

        await handlers.onNewChat(frame({ ...makeChat(5, null, { users: [ 1, 2, 3 ] }), group: true, name: "Team" }));

        const group = store.getState().chats.chats.find(c => c.id === 5)!;
        expect(group).toMatchObject({ group: true, name: "Team" });
        expect(group.messages.map(m => m.id)).toEqual([ 7 ]);
        expect(api.subscribeToChat).toHaveBeenCalledWith(5, expect.anything());
    });

    it("updates a known chat instead of replacing it (the messages stay)", async () => {
        const { store, handlers } = await start();

        await handlers.onNewChat(frame({ ...makeChat(1, null, { users: [ 1, 2, 3 ] }), group: true, name: "Renamed", adminIds: [ 1 ] }));

        const chat = store.getState().chats.chats.find(c => c.id === 1)!;
        expect(chat).toMatchObject({ name: "Renamed", adminIds: [ 1 ] });
        expect(chat.users).toHaveLength(3);
        expect(chat.messages.map(m => m.id)).toEqual([ 1, 2 ]);
    });

    it("drops a chat I was removed from and stops following it", async () => {
        const { store, handlers } = await start();

        handlers.onChatRemoved(frame({ chatId: 1 }));

        expect(store.getState().chats.chats).toEqual([]);
        expect(api.unsubscribeChat).toHaveBeenCalledWith(1);
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
        callbacks.onMessage(frame(msg(3, 1, 2)));
        callbacks.onMessage(frame(msg(4, 1, 1)));
        expect(store.getState().chats.chats[0].unreadCount).toBe(1);
    });

    it("shows who is typing and ignores my own typing", async () => {
        const { store, callbacks } = await start();
        callbacks.onTyping(frame({ chatId: 1, userId: 1 }));
        expect(store.getState().chats.typing[1] ?? []).toEqual([]);
        callbacks.onTyping(frame({ chatId: 1, userId: 2 }));
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
        expect(api.subscribeToChat).toHaveBeenCalledWith(2, expect.anything());
        expect(api.watchUser).toHaveBeenCalledWith(3);
    });

    it("drops the chats I was removed from while offline", async () => {
        const { store, handlers } = await start();
        api.loadAllChats.mockResolvedValue([ makeChat(2, null, { users: [ 1, 3 ] }) ]);

        await handlers.onReconnect();

        expect(store.getState().chats.chats.map(c => c.id)).toEqual([ 2 ]);
        expect(api.unsubscribeChat).toHaveBeenCalledWith(1);
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
