import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "../index";
import { handleIncoming } from "./incoming";
import { setNotifications, setSound } from "../settings/settingsSlice";
import { setActive } from "./chatsSlice";
import { makeChat } from "../../test/fixtures";
import type { Message } from "../../types";
import * as notifications from "../../notifications";

vi.mock("../../notifications", () => ({
    notificationsGranted: vi.fn(() => true),
    showNotification: vi.fn(),
    playBeep: vi.fn()
}));

const message = (over: Partial<Message> = {}): Message =>
    ({ id: 5, chatId: 1, userId: 2, type: "TEXT", content: "hello there", time: "2021-01-01T10:00:00", ...over });

const setup = (options: { notify?: boolean; sound?: boolean; active?: number; chat?: object } = {}) => {
    const store = makeStore({ auth: { details: { id: 1, username: "user1", name: "Name1", surname: "S", exp: 0 } } });
    const chat = { ...makeChat(1, null), ...options.chat };
    const chat2 = makeChat(2, null, { users: [ 1, 3 ] });
    store.dispatch({ type: "chats/setChats", payload: [ chat, chat2 ] });
    store.dispatch(setActive(options.active ?? 2));
    store.dispatch(setNotifications(options.notify ?? true));
    store.dispatch(setSound(options.sound ?? true));
    const run = (m: Message = message()) => handleIncoming(store.dispatch, store.getState(), store.getState().chats.chats.find(c => c.id === 1)!, m, 1);
    return { store, run };
};

describe("handleIncoming", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(notifications.notificationsGranted).mockReturnValue(true);
        Object.defineProperty(document, "hidden", { value: false, configurable: true });
    });
    afterEach(() => Object.defineProperty(document, "hidden", { value: false, configurable: true }));

    it("announces a new message to screen readers", () => {
        const { store, run } = setup({ notify: false });
        run();
        expect(store.getState().ui.announcement).toBe("New message from Name2: hello there");
    });

    it("names the group as well", () => {
        const { store, run } = setup({ chat: { group: true, name: "Team", users: makeChat(1, null, { users: [ 1, 2, 3 ] }).users } });
        run();
        expect(store.getState().ui.announcement).toBe("New message from Name2 in Team: hello there");
    });

    it("notifies about a message in a chat that isn't open, with a beep", () => {
        const { run } = setup();
        run();
        expect(notifications.showNotification).toHaveBeenCalledWith("Name2", "hello there", "chat-1", expect.any(Function));
        expect(notifications.playBeep).toHaveBeenCalled();
    });

    it("notifies when the open chat is in a hidden tab", () => {
        Object.defineProperty(document, "hidden", { value: true, configurable: true });
        const { run } = setup({ active: 1 });
        run();
        expect(notifications.showNotification).toHaveBeenCalled();
    });

    it("doesn't notify about the chat I'm looking at", () => {
        const { run } = setup({ active: 1 });
        run();
        expect(notifications.showNotification).not.toHaveBeenCalled();
    });

    it("respects the settings and the permission", () => {
        setup({ notify: false }).run();
        expect(notifications.showNotification).not.toHaveBeenCalled();
        vi.mocked(notifications.notificationsGranted).mockReturnValue(false);
        setup().run();
        expect(notifications.showNotification).not.toHaveBeenCalled();
    });

    it("can be silent", () => {
        setup({ sound: false }).run();
        expect(notifications.showNotification).toHaveBeenCalled();
        expect(notifications.playBeep).not.toHaveBeenCalled();
    });

    it("says nothing about muted chats, my own messages and deleted ones", () => {
        const muted = setup({ chat: { muted: true } });
        muted.run();
        const mine = setup();
        mine.run(message({ userId: 1 }));
        mine.run(message({ deleted: true }));
        expect(notifications.showNotification).not.toHaveBeenCalled();
        expect(muted.store.getState().ui.announcement).toBe("");
        expect(mine.store.getState().ui.announcement).toBe("");
    });

    it("shows a photo as such", () => {
        setup().run(message({ type: "FILE", content: "a.png" }));
        expect(notifications.showNotification).toHaveBeenCalledWith("Name2", "Photo", "chat-1", expect.any(Function));
    });

    it("opens the chat when the notification is clicked", () => {
        const { store, run } = setup();
        run();
        vi.mocked(notifications.showNotification).mock.calls[0][3]();
        expect(store.getState().chats.activeId).toBe(1);
        expect(store.getState().ui.focusRequest).toBe(1);
    });
});
