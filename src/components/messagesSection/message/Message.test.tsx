import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { makeStore } from "../../../store";
import * as messagesApi from "../../../api/rest/messages";
import DateFormatter from "../../../DateFormatter";
import { Message } from "./Message";
import type { Message as MessageModel } from "../../../types";

vi.mock("../../../api/rest/messages", () => ({
    loadFile: vi.fn(),
    editMessage: vi.fn(),
    react: vi.fn(),
    removeReaction: vi.fn(),
    loadMessage: vi.fn(),
    deleteMessage: vi.fn()
}));

const api = vi.mocked(messagesApi);

const text = (over: Partial<MessageModel> = {}): MessageModel =>
    ({ id: 7, chatId: 1, userId: 1, type: "TEXT", content: "hello", time: "2021-05-04T12:00:00", ...over });

const renderMessage = (message: MessageModel, mine = true, onJump?: (id: number) => void) => {
    const date = DateFormatter.sqlToDateObject(message.time);
    const store = makeStore({ auth: { details: { id: 1, username: "u", name: "N", surname: "S", exp: 0 } } });
    render(
        <Provider store={store}>
            <Message message={message} modifier=" singleMessage--myMsg" dateFormatter={new DateFormatter(null, date, null)}
                     mine={mine} onJump={onJump}/>
        </Provider>
    );
    return store;
};

beforeEach(() => vi.clearAllMocks());

describe("Message", () => {
    it("links urls safely and keeps everything else as text", () => {
        renderMessage(text({ content: "see https://example.com/x, <b>bold</b>" }));
        const link = screen.getByRole("link", { name: "https://example.com/x" });
        expect(link).toHaveAttribute("href", "https://example.com/x");
        expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
        expect(link).toHaveAttribute("target", "_blank");
        expect(screen.getByText(/<b>bold<\/b>/)).toBeInTheDocument();
    });

    it("marks edited messages and shows deleted ones without content", () => {
        renderMessage(text({ editedAt: "2021-05-04T12:05:00" }));
        expect(screen.getByText("(edited)")).toBeInTheDocument();
        cleanup();

        renderMessage(text({ content: "", deleted: true }));
        expect(screen.getByText("This message was deleted")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    });

    it("offers edit and delete only on my messages", () => {
        renderMessage(text(), false);
        expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
        cleanup();

        renderMessage(text(), true);
        expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    it("saves an edit with Enter and cancels it with Escape", async () => {
        api.editMessage.mockResolvedValue(text({ content: "hello there", editedAt: "2021-05-04T12:05:00" }));
        renderMessage(text());

        await userEvent.click(screen.getByRole("button", { name: "Edit" }));
        const editor = screen.getByRole("textbox", { name: "Edit" });
        expect(editor).toHaveValue("hello");
        await userEvent.keyboard("{Escape}");
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        expect(api.editMessage).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole("button", { name: "Edit" }));
        await userEvent.type(screen.getByRole("textbox", { name: "Edit" }), " there{Enter}");
        expect(api.editMessage).toHaveBeenCalledWith(7, "hello there");
        await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
    });

    it("shows an error and stays in the editor when saving fails", async () => {
        api.editMessage.mockRejectedValue(new Error("boom"));
        vi.spyOn(console, "error").mockImplementation(() => {});
        renderMessage(text());

        await userEvent.click(screen.getByRole("button", { name: "Edit" }));
        await userEvent.type(screen.getByRole("textbox", { name: "Edit" }), "!{Enter}");
        expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the change");
        expect(screen.getByRole("textbox", { name: "Edit" })).toBeInTheDocument();
    });

    it("asks before deleting", async () => {
        api.deleteMessage.mockResolvedValue(text({ content: "", deleted: true }));
        renderMessage(text());

        await userEvent.click(screen.getByRole("button", { name: "Delete" }));
        expect(api.deleteMessage).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole("button", { name: "No" }));
        expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Delete" }));
        await userEvent.click(screen.getByRole("button", { name: "Yes" }));
        expect(api.deleteMessage).toHaveBeenCalledWith(7);
    });

    describe("reactions and replies", () => {
        it("shows the reactions as informative chips, only mine can be clicked, and that takes it back", async () => {
            const reacted = text({ reactions: [ { emoji: "👍", userIds: [ 1, 2 ] }, { emoji: "❤️", userIds: [ 2 ] } ] });
            api.removeReaction.mockResolvedValue(text({ reactions: [ { emoji: "👍", userIds: [ 2 ] }, { emoji: "❤️", userIds: [ 2 ] } ] }));
            renderMessage(reacted, false);

            expect(screen.getByRole("img", { name: "Love 1" })).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Love 1" })).not.toBeInTheDocument();
            await userEvent.click(screen.getByRole("img", { name: "Love 1" }));
            expect(api.react).not.toHaveBeenCalled();

            await userEvent.click(screen.getByRole("button", { name: "Like 2" }));
            expect(api.removeReaction).toHaveBeenCalledWith(7);
        });

        it("reacts from the picker", async () => {
            api.react.mockResolvedValue(text({ reactions: [ { emoji: "😂", userIds: [ 1 ] } ] }));
            renderMessage(text(), false);

            await userEvent.click(screen.getByRole("button", { name: "React" }));
            await userEvent.click(screen.getByRole("button", { name: "React Haha" }));
            expect(api.react).toHaveBeenCalledWith(7, "😂");
        });

        it("starts a reply to the message", async () => {
            const store = renderMessage(text(), false);
            await userEvent.click(screen.getByRole("button", { name: "Reply" }));
            expect(store.getState().chats.replyTo).toBe(7);
        });

        it("quotes the replied message, fetching it when it is not loaded, and jumps to it", async () => {
            api.loadMessage.mockResolvedValue(text({ id: 3, content: "the original", userId: 2 }));
            const onJump = vi.fn();
            renderMessage(text({ replyToId: 3 }), true, onJump);

            const quote = await screen.findByRole("button", { name: "Go to the original message" });
            await waitFor(() => expect(quote).toHaveTextContent("the original"));
            await userEvent.click(quote);
            expect(onJump).toHaveBeenCalledWith(3);
            expect(api.loadMessage).toHaveBeenCalledWith(3, expect.anything());
        });

        it("says so when the replied message is gone", async () => {
            api.loadMessage.mockRejectedValue(new Error("404"));
            renderMessage(text({ replyToId: 3 }));
            expect(await screen.findByText("The original message is not available")).toBeInTheDocument();
        });

        it("offers no reactions or replies on deleted messages", () => {
            renderMessage(text({ content: "", deleted: true }), false);
            expect(screen.queryByRole("button", { name: "Reply" })).not.toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "React" })).not.toBeInTheDocument();
        });
    });

    describe("images", () => {
        const image = text({ type: "FILE", content: "1_a.png" });

        beforeEach(() => {
            URL.createObjectURL = vi.fn(() => "blob:image");
            URL.revokeObjectURL = vi.fn();
        });

        it("shows a placeholder, then the image, which opens full size", async () => {
            api.loadFile.mockResolvedValue(new Blob(["x"], { type: "image/png" }));
            renderMessage(image, false);
            expect(screen.getByRole("status")).toHaveTextContent("Loading image...");

            await userEvent.click(await screen.findByRole("button", { name: "Open image" }));
            const dialog = screen.getByRole("dialog", { name: "Image preview" });
            expect(dialog.querySelector("img")).toHaveAttribute("src", "blob:image");

            await userEvent.keyboard("{Escape}");
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        it("shows an error when the image cannot be loaded", async () => {
            api.loadFile.mockRejectedValue(new Error("404"));
            vi.spyOn(console, "error").mockImplementation(() => {});
            renderMessage(image, false);
            expect(await screen.findByRole("alert")).toHaveTextContent("The image could not be loaded");
        });
    });
});
