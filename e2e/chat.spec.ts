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

    test("choosing somebody who already has a chat opens that chat instead of a second one", async ({ page }) => {
        const backend = await mockBackend(page, { chats: [ annaChat(), { ...annaChat(), id: 11, users: [ ME, PIOTR ], messages: [] } ] });
        await page.goto("/");
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeVisible(); // chats are loaded
        await page.getByRole("button", { name: /Piotr Zielinski/ }).click();  // another chat is open

        await page.getByLabel("Szukaj:").fill("anna");
        await page.locator(".search__queryResult").getByText("Anna Nowak").click();

        await expect.poll(() => backend.posted.chats.length).toBe(1);
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toHaveCount(1);
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toHaveAttribute("aria-current", "true");
        await expect(page.getByText("Hi Jan, are we still on for today?")).toBeVisible();
        await expect(page.getByLabel("Szukaj:")).toHaveValue("");
    });

    test("opens the chat that was just started", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");

        await page.getByLabel("Szukaj:").fill("piotr");
        await page.getByRole("button", { name: "Piotr Zielinski" }).click();

        await expect(page.getByRole("button", { name: /Piotr Zielinski/ })).toHaveAttribute("aria-current", "true");
        await expect(page.locator(".conversationStatus__name")).toHaveText("Piotr Zielinski");
    });

    test("debounces the search requests", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");

        await page.getByLabel("Szukaj:").pressSequentially("piotr", { delay: 30 });

        await expect(page.getByRole("button", { name: "Piotr Zielinski" })).toBeVisible();
        expect(backend.requests.filter(r => r.startsWith("GET /user/"))).toHaveLength(1);
    });
});

test.describe("message features", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
    });

    test("edits my own message and marks it as edited", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        const mine = page.locator("#messageId101");

        await mine.hover();
        await mine.getByRole("button", { name: "Edit" }).click();
        await page.getByRole("textbox", { name: "Edit" }).fill("Yes, see you at six");
        await page.keyboard.press("Enter");

        await expect(mine).toContainText("Yes, see you at six");
        await expect(mine).toContainText("(edited)");
        expect(backend.edited).toEqual([{ id: 101, textContent: "Yes, see you at six" }]);
    });

    test("deletes my own message after a confirmation, but offers no actions on the other person's", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        await expect(page.locator("#messageId100")).toBeVisible();
        await expect(page.locator("#messageId100").getByRole("button", { name: "Delete" })).toHaveCount(0);

        const mine = page.locator("#messageId101");
        await mine.hover();
        await mine.getByRole("button", { name: "Delete" }).click();
        expect(backend.deleted).toEqual([]);
        await mine.getByRole("button", { name: "Yes" }).click();

        await expect(page.locator("#messageId101")).toContainText("This message was deleted");
        expect(backend.deleted).toEqual([101]);
    });

    test("sends a multi-line message: Enter sends, Shift+Enter breaks the line", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");

        const input = page.getByLabel("Message");
        await input.fill("first line");
        await input.press("Shift+Enter");
        await input.pressSequentially("second line");
        await input.press("Enter");

        await expect.poll(() => backend.posted.messages.length).toBe(1);
        expect(backend.posted.messages[0].textContent.replace(/\r\n/g, "\n")).toBe("first line\nsecond line");
    });

    test("turns links into safe anchors", async ({ page }) => {
        const chat = annaChat();
        chat.messages.push(makeMessage(102, 10, 2, "docs: https://example.com/docs.", "2021-05-04T12:02:00"));
        await mockBackend(page, { chats: [chat] });
        await page.goto("/");

        const link = page.getByRole("link", { name: "https://example.com/docs" });
        await expect(link).toHaveAttribute("href", "https://example.com/docs");
        await expect(link).toHaveAttribute("rel", /noopener/);
    });

    test("refuses an attachment that is not an image", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");

        await page.locator("#message_img").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") });

        await expect(page.getByRole("alert")).toContainText("Only JPG, PNG and GIF");
        expect(backend.posted.messages).toHaveLength(0);
    });

    test("searches the chat and jumps to a message from the older history", async ({ page }) => {
        const chat = annaChat();
        chat.messages = Array.from({ length: 120 }, (_, i) =>
            makeMessage(i + 1, 10, i % 2 ? ME.id : 2, i === 4 ? "where is the needle?" : `filler ${i + 1}`, "2021-05-04T12:00:00"));
        chat.status = [{ id: { chatId: 10, userId: ME.id }, messageId: 120 }, { id: { chatId: 10, userId: 2 }, messageId: 120 }];
        await mockBackend(page, { chats: [chat] });
        await page.goto("/");
        await expect(page.locator("#messageId120")).toBeVisible();
        await expect(page.locator("#messageId5")).toHaveCount(0);

        await page.getByRole("button", { name: "Search in this chat" }).click();
        await page.getByRole("searchbox").fill("needle");
        await page.getByRole("button", { name: "Go to message" }).click();

        await expect(page.locator("#messageId5")).toBeInViewport();
        await expect(page.locator("#messageId5")).toContainText("needle");
        await expect(page.locator("#messageId5")).toHaveClass(/singleMessage--highlighted/);
    });

    test("tells when the search finds nothing", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");

        await page.getByRole("button", { name: "Search in this chat" }).click();
        await page.getByRole("searchbox").fill("zzz");

        await expect(page.getByText("No messages found")).toBeVisible();
    });

    test("reacts to a message, changes the reaction and takes it back", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        const theirs = page.locator("#messageId100");

        await theirs.hover();
        await theirs.getByRole("button", { name: "React", exact: true }).click();
        await theirs.getByRole("button", { name: "React Like" }).click();
        await expect(theirs.getByRole("button", { name: "Like 1" })).toHaveAttribute("aria-pressed", "true");

        await theirs.hover();
        await theirs.getByRole("button", { name: "React", exact: true }).click();
        await theirs.getByRole("button", { name: "React Love" }).click();
        await expect(theirs.getByRole("button", { name: "Love 1" })).toBeVisible();
        await expect(theirs.getByRole("button", { name: /Like/ })).toHaveCount(0);

        await theirs.getByRole("button", { name: "Love 1" }).click();
        await expect(theirs.getByRole("button", { name: /Love/ })).toHaveCount(0);
        expect(backend.reacted).toEqual([
            { id: 100, emoji: "👍" }, { id: 100, emoji: "❤️" }, { id: 100, emoji: null }
        ]);
    });

    test("other people's reactions are shown but cannot be clicked", async ({ page }) => {
        const chat = annaChat();
        chat.messages[1].reactions = [{ emoji: "😂", userIds: [2] }];
        const backend = await mockBackend(page, { chats: [chat] });
        await page.goto("/");

        const reaction = page.locator("#messageId101").getByRole("img", { name: "Haha 1" });
        await expect(reaction).toBeVisible();
        await reaction.click({ force: true });
        await page.waitForTimeout(200);
        expect(backend.reacted).toEqual([]);
        expect(await reaction.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(44, 49, 58)");
    });

    test("replies to a message and shows the quote on the answer", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        const theirs = page.locator("#messageId100");

        await theirs.hover();
        await theirs.getByRole("button", { name: "Reply" }).click();
        await expect(page.getByText(/Replying to/)).toContainText("Hi Jan, are we still on for today?");

        await page.getByLabel("Message").fill("Yes!");
        await page.keyboard.press("Enter");

        await expect.poll(() => backend.posted.messages.length).toBe(1);
        expect(backend.posted.messages[0]).toMatchObject({ textContent: "Yes!", replyToId: "100" });
        await expect(page.getByText(/Replying to/)).toHaveCount(0);
        const answer = page.locator(".singleMessage", { hasText: "Yes!" });
        await expect(answer.getByRole("button", { name: "Go to the original message" })).toContainText("Hi Jan, are we still on for today?");
    });

    test("cancels a reply with Escape", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        const theirs = page.locator("#messageId100");

        await theirs.hover();
        await theirs.getByRole("button", { name: "Reply" }).click();
        await page.getByLabel("Message").press("Escape");

        await expect(page.getByText(/Replying to/)).toHaveCount(0);
    });

    test("on a phone the chat list and the conversation take turns", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 780 });
        await mockBackend(page);
        await page.goto("/");

        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeVisible();
        await expect(page.locator("#messageId100")).toBeHidden();

        await page.getByRole("button", { name: /Anna Nowak/ }).click();
        await expect(page.locator("#messageId100")).toBeVisible();
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeHidden();
        await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible();
        expect((await page.getByRole("textbox", { name: "Message" }).boundingBox())!.height).toBeGreaterThan(30);

        await page.getByRole("button", { name: "Back to chats" }).click();
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeVisible();
        await expect(page.locator("#messageId100")).toBeHidden();
    });

    test("fits the screen without horizontal scrolling at phone, tablet and desktop widths", async ({ page }) => {
        await mockBackend(page);
        for (const width of [320, 390, 768, 1024, 1440]) {
            await page.setViewportSize({ width, height: 800 });
            await page.goto("/");
            await page.getByRole("button", { name: /Anna Nowak/ }).click();
            await expect(page.locator("#messageId101")).toBeVisible();
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
            expect(overflow, `at ${width}px`).toBeLessThanOrEqual(0);
        }
    });
});
