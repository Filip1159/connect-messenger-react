import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { makeStore } from "../../../store";
import { ChatItem } from "./ChatItem";
import type { Chat } from "../../../types";
import { makeChat } from "../../../test/fixtures";

const user = { id: 1, username: "user1", name: "Name1", surname: "Surname1", exp: 0 };

const renderItem = (chat: Chat, onClick = () => {}) => render(
    <Provider store={makeStore({ auth: { details: user } })}>
        <ChatItem chat={chat} modifier=" chatItem--active" onClick={onClick} />
    </Provider>
);

describe("ChatItem", () => {
    it("shows the recipient and the last message preview", () => {
        renderItem(makeChat(1, "2021-01-01T10:00:00"));
        expect(screen.getByText("Name2 Surname2")).toBeInTheDocument();
        expect(screen.getByText("Ty: hi")).toBeInTheDocument();
    });

    it("shows a placeholder instead of the file name for image messages", () => {
        const chat = makeChat(1, "2021-01-01T10:00:00");
        chat.messages[0] = { ...chat.messages[0], type: "FILE", content: "abc.png" };
        renderItem(chat);
        expect(screen.getByText("Ty: Zdjęcie")).toBeInTheDocument();
    });

    it("shows how many messages are unread", () => {
        renderItem({ ...makeChat(1, "2021-01-01T10:00:00"), unreadCount: 3 });
        expect(screen.getByRole("status", { name: "3 unread messages" })).toHaveTextContent("3");
    });

    it("shows no badge when everything is read", () => {
        renderItem({ ...makeChat(1, "2021-01-01T10:00:00"), unreadCount: 0 });
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("shows the title of a group and who wrote the last message", () => {
        const group = { ...makeChat(1, "2021-01-01T10:00:00", { users: [ 2, 1, 3 ] }), group: true, name: "Team" };
        renderItem(group);
        expect(screen.getByText("Team")).toBeInTheDocument();
        expect(screen.getByText("Name2: hi")).toBeInTheDocument();
        expect(screen.queryByRole("img", { name: "online" })).not.toBeInTheDocument();
    });

    it("lists the members of a group without a name", () => {
        renderItem({ ...makeChat(1, null, { users: [ 1, 2, 3 ] }), group: true });
        expect(screen.getByText("Name2, Name3")).toBeInTheDocument();
    });

    it("marks a muted chat", () => {
        renderItem({ ...makeChat(1, "2021-01-01T10:00:00"), muted: true, unreadCount: 2 });
        expect(screen.getByTitle("Muted")).toBeInTheDocument();
    });

    it("can be activated with the keyboard", async () => {
        const onClick = vi.fn();
        renderItem(makeChat(1, null), onClick);
        await userEvent.tab();
        expect(screen.getByRole("button")).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
