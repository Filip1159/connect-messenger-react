import { expect, test } from "@playwright/test";
import { annaChat, makeMessage, ME, mockBackend, PIOTR, signInAs } from "./support/backend";

test.describe("chat", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
    });

    test("lists chats with the last message preview", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");

        const item = page.getByRole("button", { name: /Anna Nowak/ });
        await expect(item).toContainText("Ty: Yes, see you at five");
    });

    test("shows the search field and empty state when there are no chats", async ({ page }) => {
        await mockBackend(page, { chats: [] });
        await page.goto("/");
        await expect(page.getByLabel("Szukaj:")).toBeVisible();
        await expect(page.getByText("Brak wiadomości")).toBeVisible();
    });

    test("opens a conversation when a chat is selected", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");

        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        await expect(page.getByText("Hi Jan, are we still on for today?")).toBeVisible();
        await expect(page.locator("#messageId101")).toBeVisible();
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toHaveAttribute("aria-current", "true");
    });

    test("can be selected with the keyboard", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");

        await page.getByRole("button", { name: /Anna Nowak/ }).focus();
        await page.keyboard.press("Enter");

        await expect(page.getByText("Hi Jan, are we still on for today?")).toBeVisible();
    });

    test("sends a text message", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        const input = page.getByLabel("Message");
        await input.fill("See you soon");
        await page.getByRole("button", { name: "Send" }).click();

        await expect.poll(() => backend.posted.messages.length).toBe(1);
        expect(backend.posted.messages[0]).not.toHaveProperty("userId");
        expect(backend.posted.messages[0]).toMatchObject({
            chatId: "10",
            type: "TEXT",
            textContent: "See you soon",
        });
        await expect(input).toHaveValue("");
    });

    test("shows a sent message at once and keeps it in the conversation", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        await page.getByLabel("Message").fill("See you soon");
        await page.getByRole("button", { name: "Send" }).click();

        await expect(page.locator(".singleMessage", { hasText: "See you soon" })).toBeVisible();
        await expect(page.getByTestId("pending-message")).toHaveCount(0); // confirmed by the server
    });

    test("a message that could not be sent can be retried", async ({ page }) => {
        const backend = await mockBackend(page, { failMessagePosts: 1 });
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        await page.getByLabel("Message").fill("Flaky network");
        await page.getByRole("button", { name: "Send" }).click();

        await expect(page.getByRole("alert").filter({ hasText: "Not sent" })).toBeVisible();
        await page.getByRole("button", { name: "Retry" }).click();

        await expect(page.getByTestId("pending-message")).toHaveCount(0);
        await expect(page.locator(".singleMessage", { hasText: "Flaky network" })).toBeVisible();
        expect(backend.posted.messages).toHaveLength(2);
    });

    test("a failed message can be discarded", async ({ page }) => {
        await mockBackend(page, { failMessagePosts: 1 });
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        await page.getByLabel("Message").fill("Never mind");
        await page.getByRole("button", { name: "Send" }).click();
        await page.getByRole("button", { name: "Discard" }).click();

        await expect(page.locator(".singleMessage", { hasText: "Never mind" })).toHaveCount(0);
    });

    test("shows unread counts, clears the open chat and counts the rest in the tab title", async ({ page }) => {
        const chat = { ...annaChat(), unreadCount: 3 };
        await mockBackend(page, { chats: [chat, { ...annaChat(), id: 11, users: [ME, PIOTR], unreadCount: 2,
            messages: [makeMessage(200, 11, PIOTR.id, "Ping", "2021-05-04T11:00:00")],
            status: [{ id: { chatId: 11, userId: ME.id }, messageId: null }, { id: { chatId: 11, userId: PIOTR.id }, messageId: 200 }] }] });
        await page.goto("/");

        // the newest chat (Anna's) is open and read at once, Piotr's stays unread
        await expect(page.getByRole("status", { name: "2 unread messages" })).toBeVisible();
        await expect(page.getByRole("status", { name: "3 unread messages" })).toHaveCount(0);
        await expect(page).toHaveTitle("(2) CONNECT");
    });

    test("shows the online state of the person I'm talking to", async ({ page }) => {
        await mockBackend(page, { presence: [{ userId: 2, online: true, lastSeen: null }] });
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        await expect(page.locator(".conversationStatus")).toContainText("online");
        await expect(page.getByRole("img", { name: "online" })).toBeVisible();
    });

    test("does not send an empty message", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        await page.getByRole("button", { name: "Send" }).click();

        await page.waitForTimeout(200);
        expect(backend.posted.messages).toHaveLength(0);
    });

    test("marks the newest message as read when the chat is opened", async ({ page }) => {
        const chat = annaChat();
        chat.messages.push({ id: 102, chatId: 10, userId: 2, type: "TEXT", content: "Great!", time: "2021-05-04T12:02:00" });
        const backend = await mockBackend(page, { chats: [chat] });
        await page.goto("/");

        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        await expect.poll(() => backend.posted.statuses.length).toBe(1);
        expect(backend.posted.statuses[0]).toEqual({ id: { chatId: 10 }, messageId: 102 });
    });

    test("does not report a read status for messages that are already read", async ({ page }) => {
        const backend = await mockBackend(page, { chats: [{ ...annaChat(), status: [
            { id: { chatId: 10, userId: ME.id }, messageId: 101 },
            { id: { chatId: 10, userId: 2 }, messageId: 101 },
        ] }] });
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        await expect(page.getByText("Hi Jan, are we still on for today?")).toBeVisible();
        expect(backend.posted.statuses).toHaveLength(0);
    });

    test("loads older messages when scrolled to the top", async ({ page }) => {
        const chat = annaChat();
        chat.messages = Array.from({ length: 120 }, (_, i) =>
            makeMessage(100 + i, 10, i % 2 ? 1 : 2, `message ${i}`, "2021-05-04T12:00:00"));
        const backend = await mockBackend(page, { chats: [chat] });
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        await expect(page.locator("#messageId219")).toBeVisible();
        await expect(page.locator("#messageId100")).toHaveCount(0);

        // each scroll to the top brings the next older page (120 messages = 3 pages of 50 at most)
        await expect(async () => {
            await page.locator(".messages__container").evaluate(el => { el.scrollTop = 0; });
            await expect(page.locator("#messageId100")).toHaveCount(1, { timeout: 500 });
        }).toPass();
        expect(backend.requests.filter(r => r.includes("/messages"))).toHaveLength(3);
    });

    test("starts a new chat from the user search", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");

        await page.getByLabel("Szukaj:").fill("piotr");

        await page.getByRole("button", { name: "Piotr Zielinski" }).click();

        await expect.poll(() => backend.posted.chats.length).toBe(1);
        expect(backend.posted.chats[0]).toEqual({ userIds: [ME.id, 3] });
    });

    test("search hides users that already have a chat", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");

        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeVisible(); // chats are loaded
        await page.getByLabel("Szukaj:").fill("n");

        await expect.poll(() => backend.requests.some(r => r.startsWith("GET /user/"))).toBe(true);
        await expect(page.getByRole("button", { name: "Piotr Zielinski" })).toBeVisible();
        await expect(page.locator(".search__queryResult").getByText("Anna Nowak")).toHaveCount(0);
    });

    test("debounces the search requests", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");

        await page.getByLabel("Szukaj:").pressSequentially("piotr", { delay: 30 });

        await expect(page.getByRole("button", { name: "Piotr Zielinski" })).toBeVisible();
        expect(backend.requests.filter(r => r.startsWith("GET /user/"))).toHaveLength(1);
    });
});
