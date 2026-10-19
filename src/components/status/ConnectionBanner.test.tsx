import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "../../store";
import { setConnection } from "../../store/ui/uiSlice";
import { ConnectionBanner } from "./ConnectionBanner";

const setup = () => {
    const store = makeStore();
    render(<Provider store={store}><ConnectionBanner/></Provider>);
    return store;
};

describe("ConnectionBanner", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        vi.useRealTimers();
        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    });

    it("says nothing while everything works", () => {
        const store = setup();
        act(() => { store.dispatch(setConnection("connected")); });
        expect(screen.getByRole("status")).toHaveTextContent("");
    });

    it("tells when the websocket dropped", () => {
        const store = setup();
        act(() => { store.dispatch(setConnection("reconnecting")); });
        expect(screen.getByRole("status")).toHaveTextContent("Connection lost. Reconnecting...");
        act(() => { store.dispatch(setConnection("connected")); });
        expect(screen.getByRole("status")).toHaveTextContent("");
    });

    it("mentions a first connection only when it takes a while", () => {
        setup();
        expect(screen.getByRole("status")).toHaveTextContent("");
        act(() => { vi.advanceTimersByTime(3100); });
        expect(screen.getByRole("status")).toHaveTextContent("Connecting...");
    });

    it("tells when the browser is offline, and when it is back", () => {
        const store = setup();
        act(() => { store.dispatch(setConnection("connected")); });
        Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
        act(() => { window.dispatchEvent(new Event("offline")); });
        expect(screen.getByRole("status")).toHaveTextContent("You're offline");
        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
        act(() => { window.dispatchEvent(new Event("online")); });
        expect(screen.getByRole("status")).toHaveTextContent("");
    });
});
