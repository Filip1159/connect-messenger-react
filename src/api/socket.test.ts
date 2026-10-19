import { beforeEach, describe, expect, it, vi } from "vitest";

/* a STOMP client that records what the socket asks of it and lets the test play the server */
const stomp = vi.hoisted(() => {
    const state = {
        config: null as null | Record<string, (...args: unknown[]) => void>,
        client: null as null | { connectHeaders: unknown },
        subscribed: [] as string[],
        unsubscribed: [] as string[],
        published: [] as string[],
        connected: false,
        deactivated: 0,
    };
    class FakeClient {
        connectHeaders: unknown;
        constructor(config: NonNullable<typeof state.config>) { state.config = config; state.client = this; }
        get connected() { return state.connected; }
        activate() {}
        deactivate() { state.deactivated++; }
        subscribe(destination: string) {
            state.subscribed.push(destination);
            return { unsubscribe: () => state.unsubscribed.push(destination) };
        }
        publish({ destination }: { destination: string }) { state.published.push(destination); }
    }
    return { state, FakeClient };
});
vi.mock("@stomp/stompjs", () => ({ Client: stomp.FakeClient }));
vi.mock("sockjs-client", () => ({ default: vi.fn() }));
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

/* the server accepts the connection */
const serverConnects = () => {
    stomp.state.connected = true;
    stomp.state.config!.onConnect();
};

describe("socket", () => {
    beforeEach(() => {
        Object.assign(stomp.state, { config: null, subscribed: [], unsubscribed: [], published: [], connected: false, deactivated: 0 });
        vi.mocked(session.isSignedIn).mockReturnValue(true);
    });

    it("follows my own topics, the chats and the people in them once connected", () => {
        const socket = createSocket();
        socket.connect([ makeChat(5, null) ], callbacks(), handlers());
        expect(stomp.state.subscribed).toEqual([]);  // nothing before the server accepts

        serverConnects();

        expect(stomp.state.subscribed).toEqual([
            "/topic/new-chats/1", "/topic/removed-chats/1",
            "/topic/messages/5", "/topic/status/5", "/topic/typing/5",
            "/topic/presence/2"
        ]);
    });

    it("reports the connection, and a reconnect only from the second connection on", () => {
        const h = handlers();
        createSocket().connect([], callbacks(), h);

        serverConnects();
        expect(h.onConnection).toHaveBeenLastCalledWith("connected");
        expect(h.onReconnect).not.toHaveBeenCalled();

        stomp.state.config!.onWebSocketClose();
        expect(h.onConnection).toHaveBeenLastCalledWith("reconnecting");

        serverConnects();
        expect(h.onReconnect).toHaveBeenCalledTimes(1);
    });

    it("says nothing about a connection that never worked", () => {
        const h = handlers();
        createSocket().connect([], callbacks(), h);
        stomp.state.config!.onWebSocketClose();
        expect(h.onConnection).not.toHaveBeenCalled();
    });

    it("subscribes again to everything after a reconnect", () => {
        const socket = createSocket();
        socket.connect([ makeChat(5, null) ], callbacks(), handlers());
        serverConnects();
        stomp.state.subscribed.length = 0;

        serverConnects();

        expect(stomp.state.subscribed).toContain("/topic/messages/5");
        expect(stomp.state.subscribed).toContain("/topic/presence/2");
    });

    it("follows a chat that appears later, and stops following a chat I left", () => {
        const socket = createSocket();
        socket.connect([], callbacks(), handlers());
        serverConnects();

        socket.subscribeToChat(9, callbacks());
        expect(stomp.state.subscribed).toContain("/topic/messages/9");
        socket.subscribeToChat(9, callbacks());  // not twice
        expect(stomp.state.subscribed.filter(d => d === "/topic/messages/9")).toHaveLength(1);

        socket.unsubscribeChat(9);
        expect(stomp.state.unsubscribed).toEqual([ "/topic/messages/9", "/topic/status/9", "/topic/typing/9" ]);

        stomp.state.subscribed.length = 0;
        serverConnects();  // a reconnect doesn't bring it back
        expect(stomp.state.subscribed).not.toContain("/topic/messages/9");
    });

    it("follows the presence of a new contact, but not my own", () => {
        const socket = createSocket();
        socket.connect([], callbacks(), handlers());
        serverConnects();

        socket.watchUser(1);
        socket.watchUser(3);

        expect(stomp.state.subscribed).toContain("/topic/presence/3");
        expect(stomp.state.subscribed).not.toContain("/topic/presence/1");
    });

    it("sends the typing notification only while connected", () => {
        const socket = createSocket();
        socket.connect([], callbacks(), handlers());
        socket.sendTyping(5);
        expect(stomp.state.published).toEqual([]);

        serverConnects();
        socket.sendTyping(5);
        expect(stomp.state.published).toEqual([ "/app/chats/5/typing" ]);
    });

    it("closes the connection and forgets everything", () => {
        const socket = createSocket();
        socket.connect([ makeChat(5, null) ], callbacks(), handlers());
        serverConnects();

        socket.close();

        expect(stomp.state.deactivated).toBe(1);
        socket.sendTyping(5);
        expect(stomp.state.published).toEqual([]);
        expect(() => socket.subscribeToChat(5, callbacks())).toThrow("Call connect() first");
    });

    it("refuses to connect without a session", () => {
        vi.mocked(session.isSignedIn).mockReturnValue(false);
        expect(() => createSocket().connect([], callbacks(), handlers())).toThrow("signed in");
    });

    it("sends the current token before every attempt and stops when the session is gone", () => {
        createSocket().connect([], callbacks(), handlers());
        localStorage.setItem("token", "abc");
        stomp.state.config!.beforeConnect();
        expect(stomp.state.client!.connectHeaders).toEqual({ Authentication: "abc" });

        vi.mocked(session.isSignedIn).mockReturnValue(false);
        stomp.state.config!.beforeConnect();
        expect(stomp.state.deactivated).toBe(1);
    });
});
