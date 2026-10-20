import { beforeEach, describe, expect, it, vi } from "vitest";

/* a Socket.IO client that records what the socket asks of it and lets the test play the server */
const sio = vi.hoisted(() => {
    type Listener = (...args: unknown[]) => void;
    const state = {
        url: "",
        options: null as null | { auth: (send: (data: unknown) => void) => void },
        listeners: new Map<string, Listener>(),
        emitted: [] as { event: string; args: unknown[] }[],
        connected: false,
        disconnected: 0,
    };
    class FakeClient {
        get connected() { return state.connected; }
        on(event: string, listener: Listener) { state.listeners.set(event, listener); return this; }
        removeAllListeners() { state.listeners.clear(); return this; }
        emit(event: string, ...args: unknown[]) { state.emitted.push({ event, args }); return this; }
        disconnect() { state.disconnected++; return this; }
    }
    return { state, io: vi.fn((url: string, options: typeof state.options) => {
        state.url = url;
        state.options = options;
        return new FakeClient();
    }) };
});
vi.mock("socket.io-client", () => ({ io: sio.io }));
vi.mock("./session", () => ({
    isSignedIn: vi.fn(() => true),
    getAuthDetails: vi.fn(() => ({ id: 1 })),
    currentUserId: vi.fn(() => 1),
    onSignOut: vi.fn(),
}));

import { createSocket } from "./socket";
import type { ChatCallbacks, SocketHandlers } from "./socket";
import * as session from "./session";
import { makeChat } from "../test/fixtures";

const callbacks = (): ChatCallbacks => ({ onMessage: vi.fn(), onStatus: vi.fn(), onTyping: vi.fn() });
const handlers = (): SocketHandlers => ({
    onNewChat: vi.fn(), onChatRemoved: vi.fn(), onPresence: vi.fn(), onReconnect: vi.fn(), onConnection: vi.fn()
});

const server = {
    connects: () => { sio.state.connected = true; sio.state.listeners.get("connect")!(); },
    drops: () => { sio.state.connected = false; sio.state.listeners.get("disconnect")!(); },
    pushes: (event: unknown) => sio.state.listeners.get("event")!(event),
};
const followed = () => sio.state.emitted.filter(e => e.event === "subscribe").map(e => e.args[0]);
const unfollowed = () => sio.state.emitted.filter(e => e.event === "unsubscribe").map(e => e.args[0]);
const typings = () => sio.state.emitted.filter(e => e.event === "typing").map(e => e.args[0]);

describe("socket", () => {
    beforeEach(() => {
        Object.assign(sio.state, { listeners: new Map(), emitted: [], connected: false, disconnected: 0 });
        vi.mocked(session.isSignedIn).mockReturnValue(true);
    });

    it("follows my own rooms, the chats and the people in them once connected", () => {
        const socket = createSocket();
        socket.connect([ makeChat(5, null) ], callbacks(), handlers());
        expect(followed()).toEqual([]);  // nothing before the server accepts

        server.connects();

        expect(followed()).toEqual([
            "/topic/new-chats/1", "/topic/removed-chats/1",
            "/topic/messages/5", "/topic/status/5", "/topic/typing/5",
            "/topic/presence/2"
        ]);
    });

    it("reports the connection, and a reconnect only from the second connection on", () => {
        const h = handlers();
        createSocket().connect([], callbacks(), h);

        server.connects();
        expect(h.onConnection).toHaveBeenLastCalledWith("connected");
        expect(h.onReconnect).not.toHaveBeenCalled();

        server.drops();
        expect(h.onConnection).toHaveBeenLastCalledWith("reconnecting");

        server.connects();
        expect(h.onReconnect).toHaveBeenCalledTimes(1);
    });

    it("says nothing about a connection that never worked", () => {
        const h = handlers();
        createSocket().connect([], callbacks(), h);
        server.drops();
        expect(h.onConnection).not.toHaveBeenCalled();
    });

    it("follows everything again after a reconnect (a new connection has no rooms)", () => {
        const socket = createSocket();
        socket.connect([ makeChat(5, null) ], callbacks(), handlers());
        server.connects();
        sio.state.emitted.length = 0;

        server.connects();

        expect(followed()).toContain("/topic/messages/5");
        expect(followed()).toContain("/topic/presence/2");
    });

    it("follows a chat that appears later, and stops following a chat I left", () => {
        const socket = createSocket();
        socket.connect([], callbacks(), handlers());
        server.connects();

        socket.subscribeToChat(9, callbacks());
        expect(followed()).toContain("/topic/messages/9");
        socket.subscribeToChat(9, callbacks());  // not twice
        expect(followed().filter(room => room === "/topic/messages/9")).toHaveLength(1);

        socket.unsubscribeChat(9);
        expect(unfollowed()).toEqual([ "/topic/messages/9", "/topic/status/9", "/topic/typing/9" ]);

        sio.state.emitted.length = 0;
        server.connects();  // a reconnect doesn't bring it back
        expect(followed()).not.toContain("/topic/messages/9");
    });

    it("follows the presence of a new contact, but not my own", () => {
        const socket = createSocket();
        socket.connect([], callbacks(), handlers());
        server.connects();

        socket.watchUser(1);
        socket.watchUser(3);

        expect(followed()).toContain("/topic/presence/3");
        expect(followed()).not.toContain("/topic/presence/1");
    });

    it("hands every event to the callback that is for it", () => {
        const chat = callbacks();
        const h = handlers();
        createSocket().connect([ makeChat(5, null) ], chat, h);
        server.connects();

        const created = { type: "message.created", payload: { chatId: 5, id: 1 } };
        const deleted = { type: "message.deleted", payload: { chatId: 5, id: 1 } };
        const status = { type: "status.updated", payload: { id: { chatId: 5, userId: 2 }, messageId: 1 } };
        const typing = { type: "typing", payload: { chatId: 5, userId: 2 } };
        const presence = { type: "presence.changed", payload: { userId: 2, online: true } };
        const changed = { type: "chat.changed", payload: { id: 7 } };
        const removed = { type: "chat.removed", payload: { chatId: 7 } };
        [ created, deleted, status, typing, presence, changed, removed ].forEach(server.pushes);

        expect(chat.onMessage).toHaveBeenCalledWith(created);
        expect(chat.onMessage).toHaveBeenCalledWith(deleted);
        expect(chat.onStatus).toHaveBeenCalledWith(status);
        expect(chat.onTyping).toHaveBeenCalledWith(typing);
        expect(h.onPresence).toHaveBeenCalledWith(presence);
        expect(h.onNewChat).toHaveBeenCalledWith(changed);
        expect(h.onChatRemoved).toHaveBeenCalledWith(removed);
    });

    it("ignores events of chats it doesn't follow, of unknown types and of no shape at all", () => {
        const chat = callbacks();
        const h = handlers();
        createSocket().connect([ makeChat(5, null) ], chat, h);
        server.connects();

        server.pushes({ type: "message.created", payload: { chatId: 99 } });  // another chat
        server.pushes({ type: "reaction.somethingNew", payload: { chatId: 5 } });  // a newer backend
        server.pushes("garbage");
        server.pushes(null);

        expect(chat.onMessage).not.toHaveBeenCalled();
        expect(chat.onStatus).not.toHaveBeenCalled();
        expect(chat.onTyping).not.toHaveBeenCalled();
        expect(h.onPresence).not.toHaveBeenCalled();
    });

    it("stops delivering the events of a chat after leaving it", () => {
        const chat = callbacks();
        const socket = createSocket();
        socket.connect([ makeChat(5, null) ], chat, handlers());
        server.connects();

        socket.unsubscribeChat(5);
        server.pushes({ type: "message.created", payload: { chatId: 5 } });

        expect(chat.onMessage).not.toHaveBeenCalled();
    });

    it("sends the typing notification only while connected", () => {
        const socket = createSocket();
        socket.connect([], callbacks(), handlers());
        socket.sendTyping(5);
        expect(typings()).toEqual([]);

        server.connects();
        socket.sendTyping(5);
        expect(typings()).toEqual([ 5 ]);
    });

    it("closes the connection and forgets everything", () => {
        const socket = createSocket();
        socket.connect([ makeChat(5, null) ], callbacks(), handlers());
        server.connects();

        socket.close();

        expect(sio.state.disconnected).toBe(1);
        socket.sendTyping(5);
        expect(typings()).toEqual([]);
        expect(() => socket.subscribeToChat(5, callbacks())).toThrow("Call connect() first");
    });

    it("refuses to connect without a session", () => {
        vi.mocked(session.isSignedIn).mockReturnValue(false);
        expect(() => createSocket().connect([], callbacks(), handlers())).toThrow("signed in");
    });

    it("sends the current token with every attempt", () => {
        createSocket().connect([], callbacks(), handlers());
        const sent: unknown[] = [];

        localStorage.setItem("token", "Bearer abc");
        sio.state.options!.auth(data => sent.push(data));
        localStorage.setItem("token", "Bearer renewed");
        sio.state.options!.auth(data => sent.push(data));

        expect(sent).toEqual([ { token: "Bearer abc" }, { token: "Bearer renewed" } ]);
    });

    it("stops trying once the session is gone", () => {
        createSocket().connect([], callbacks(), handlers());
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.mocked(session.isSignedIn).mockReturnValue(false);

        sio.state.listeners.get("connect_error")!(new Error("unauthorized"));

        expect(sio.state.disconnected).toBe(1);
    });
});
