import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { makeStore } from "../../../store";
import NewMessageInput from "./NewMessageInput";
import { sendMessage } from "../../../store/chats/outbox";
import { makeChat } from "../../../test/fixtures";

vi.mock("../../../store/ChatAPI", () => ({
    default: { sendTyping: vi.fn(), onSignOut: vi.fn(), getAuthDetails: vi.fn(() => ({ id: 1 })) }
}));
vi.mock("../../../store/chats/outbox", () => ({ sendMessage: vi.fn(() => Promise.resolve()) }));

const send = vi.mocked(sendMessage);

const renderInput = (replyTo: number | null = null) => {
    const chat = makeChat(1, "2021-01-01T10:00:00");  // message 10 by user 1
    return render(
        <Provider store={makeStore({ chats: { chats: [ chat ], activeId: 1, presence: {}, typing: {}, outbox: [], replyTo, listOpen: false } })}>
            <NewMessageInput/>
        </Provider>
    );
};

const png = (name = "a.png", type = "image/png", size = 10) => {
    const file = new File(["x"], name, { type });
    Object.defineProperty(file, "size", { value: size });
    return file;
};

beforeEach(() => vi.clearAllMocks());

describe("NewMessageInput", () => {
    it("sends with Enter and starts a new line with Shift+Enter", async () => {
        renderInput();
        const input = screen.getByRole("textbox", { name: "Message" });

        await userEvent.type(input, "first{Shift>}{Enter}{/Shift}second");
        expect(input).toHaveValue("first\nsecond");
        expect(send).not.toHaveBeenCalled();

        await userEvent.keyboard("{Enter}");
        expect(send).toHaveBeenCalledWith(expect.anything(), 1, "TEXT", "first\nsecond", undefined);
        expect(input).toHaveValue("");
    });

    it("does not send an empty message", async () => {
        renderInput();
        await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "   {Enter}");
        expect(send).not.toHaveBeenCalled();
    });

    it("inserts an emoji from the picker", async () => {
        renderInput();
        await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "hi ");
        await userEvent.click(screen.getByRole("button", { name: "Emoji" }));
        await userEvent.click(screen.getByRole("option", { name: "👍" }));
        expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("hi 👍");
    });

    it("previews an attached image, which can be removed", async () => {
        const { container } = renderInput();
        const picker = container.querySelector<HTMLInputElement>("#message_img")!;
        await userEvent.upload(picker, png("holiday.png"));
        expect(screen.getByText("holiday.png")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Remove attachment" }));
        expect(screen.queryByText("holiday.png")).not.toBeInTheDocument();
    });

    it("sends the image first and then the text", async () => {
        const { container } = renderInput();
        const file = png("holiday.png");
        await userEvent.upload(container.querySelector<HTMLInputElement>("#message_img")!, file);
        await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "look{Enter}");

        expect(send).toHaveBeenNthCalledWith(1, expect.anything(), 1, "FILE", file, undefined);
        await vi.waitFor(() => expect(send).toHaveBeenNthCalledWith(2, expect.anything(), 1, "TEXT", "look"));
    });

    it("refuses files that are not images or too large", () => {
        const { container } = renderInput();
        const picker = container.querySelector<HTMLInputElement>("#message_img")!;

        fireEvent.change(picker, { target: { files: [ png("doc.pdf", "application/pdf") ] } });
        expect(screen.getByRole("alert")).toHaveTextContent("Only JPG, PNG and GIF");

        fireEvent.change(picker, { target: { files: [ png("big.png", "image/png", 6 * 1024 * 1024) ] } });
        expect(screen.getByRole("alert")).toHaveTextContent("too large");
        expect(screen.queryByText("big.png")).not.toBeInTheDocument();
    });

    it("accepts an image dropped on the form and pasted into the field", () => {
        renderInput();
        const form = screen.getByRole("textbox", { name: "Message" }).closest("form")!;
        fireEvent.drop(form, { dataTransfer: { files: [ png("dropped.png") ] } });
        expect(screen.getByText("dropped.png")).toBeInTheDocument();

        fireEvent.paste(screen.getByRole("textbox", { name: "Message" }), { clipboardData: { files: [ png("pasted.png") ] } });
        expect(screen.getByText("pasted.png")).toBeInTheDocument();
    });

    it("sends a reply to the chosen message and then forgets it", async () => {
        renderInput(10);
        expect(screen.getByText(/Replying to/)).toHaveTextContent("hi");

        await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "answer{Enter}");
        expect(send).toHaveBeenCalledWith(expect.anything(), 1, "TEXT", "answer", 10);
        expect(screen.queryByText(/Replying to/)).not.toBeInTheDocument();
    });

    it("cancels the reply with the button", async () => {
        renderInput(10);
        await userEvent.click(screen.getByRole("button", { name: "Cancel reply" }));
        expect(screen.queryByText(/Replying to/)).not.toBeInTheDocument();
    });
});
