import { expect, test } from "@playwright/test";
import { annaChat, ME, mockBackend, signInAs } from "./support/backend";

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
        expect(backend.posted.messages[0]).toMatchObject({
            chatId: "10",
            userId: String(ME.id),
            type: "TEXT",
            textContent: "See you soon",
        });
        await expect(input).toHaveValue("");
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
        expect(backend.posted.statuses[0]).toMatchObject({ id: { chatId: 10, userId: ME.id }, messageId: 102 });
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
