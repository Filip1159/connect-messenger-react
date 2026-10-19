import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { makeStore } from "../index";
import useChatSync from "./useChatSync";
import { createChatSync } from "./chatSync";
import { updateDetails } from "../auth/authSlice";
import { reloadChats } from "../ui/uiSlice";
import { resetDetails } from "../auth/authSlice";

const stop = vi.fn();
const start = vi.fn(() => stop);
vi.mock("./chatSync", () => ({ createChatSync: vi.fn(() => ({ start })) }));
vi.mock("../../api/socket", () => ({ socket: {} }));

const me = { id: 1, username: "user1", name: "Name1", surname: "Surname1", exp: 0 };

const render = (details: typeof me | null) => {
    const store = makeStore({ auth: { details } });
    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
    const hook = renderHook(() => useChatSync(), { wrapper });
    return { store, ...hook };
};

describe("useChatSync", () => {
    beforeEach(() => vi.clearAllMocks());

    it("syncs for the signed in user, and ends when the component goes", () => {
        const { unmount } = render(me);
        expect(createChatSync).toHaveBeenCalledWith(expect.objectContaining({ myId: 1 }));
        expect(start).toHaveBeenCalledTimes(1);
        unmount();
        expect(stop).toHaveBeenCalledTimes(1);
    });

    it("does nothing while nobody is signed in", () => {
        render(null);
        expect(start).not.toHaveBeenCalled();
    });

    it("starts afresh after 'try again', but not after a profile change", () => {
        const { store } = render(me);

        act(() => { store.dispatch(updateDetails({ name: "New name" })); });
        expect(start).toHaveBeenCalledTimes(1);

        act(() => { store.dispatch(reloadChats()); });
        expect(stop).toHaveBeenCalledTimes(1);
        expect(start).toHaveBeenCalledTimes(2);
    });

    it("ends when the user signs out", () => {
        const { store } = render(me);
        act(() => { store.dispatch(resetDetails()); });
        expect(stop).toHaveBeenCalledTimes(1);
        expect(start).toHaveBeenCalledTimes(1);
    });
});
