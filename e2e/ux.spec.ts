import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { ANNA, annaChat, makeMessage, ME, mockBackend, PIOTR, signInAs } from "./support/backend";

const openSettings = async (page: Page) => {
    await page.getByRole("button", { name: "Settings" }).click();
    return page.getByRole("dialog", { name: "Settings" });
};

test.describe("settings: theme and language", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
    });

    test("switches between the dark and the light theme and remembers the choice", async ({ page }) => {
        await mockBackend(page);
        await page.emulateMedia({ colorScheme: "dark" });
        await page.goto("/");
        const background = () => page.evaluate(() => getComputedStyle(document.querySelector(".chatsSection")!).backgroundColor);
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
        const dark = await background();

        const dialog = await openSettings(page);
        await dialog.getByLabel("Light").check();
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
        expect(await background()).not.toBe(dark);

        await page.reload();
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
        expect(JSON.parse((await page.evaluate(() => localStorage.getItem("settings")))!).theme).toBe("light");
    });

    test("'same as the device' follows the device, also when it changes", async ({ page }) => {
        await mockBackend(page);
        await page.emulateMedia({ colorScheme: "light" });
        await page.goto("/");
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

        await page.emulateMedia({ colorScheme: "dark" });
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    });

    test("changes the language of the whole app at once, and keeps the dialog open", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        await expect(page.getByLabel("Find people")).toBeVisible();
        const dialog = await openSettings(page);

        await dialog.getByLabel("Language").selectOption("pl");

        await expect(page.getByRole("dialog", { name: "Ustawienia" })).toBeVisible();
        await expect(page.getByLabel("Szukaj osób")).toBeVisible();
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toContainText("Ty: Yes, see you at five");
        await expect(page.locator("html")).toHaveAttribute("lang", "pl");
        await expect(page.locator("#messageId100").locator("xpath=preceding-sibling::div[1]")).toContainText("Wtorek");

        await page.reload();
        await expect(page.getByLabel("Szukaj osób")).toBeVisible();
    });

    test("starts in Polish for a Polish browser", async ({ browser }) => {
        const context = await browser.newContext({ locale: "pl-PL" });
        const page = await context.newPage();
        await signInAs(page);
        await mockBackend(page);
        await page.goto("/");
        await expect(page.getByLabel("Szukaj osób")).toBeVisible();
        await context.close();
    });
});

test.describe("connection and offline", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
    });

    test("tells when the browser is offline and when it is back", async ({ page, context }) => {
        await mockBackend(page);
        await page.goto("/");
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeVisible();

        await context.setOffline(true);
        await expect(page.getByText("You're offline")).toBeVisible();
        await context.setOffline(false);
        await expect(page.getByText("You're offline")).toHaveCount(0);
    });

    test("says it is still connecting when the server doesn't answer the websocket", async ({ page }) => {
        await mockBackend(page);  // the websocket is refused
        await page.goto("/");
        await expect(page.getByText("Connecting...")).toBeVisible({ timeout: 8000 });
    });
});

test.describe("notifications", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
        // a Notification that records what it was asked to show
        await page.addInitScript(() => {
            const shown: { title: string; body: string }[] = [];
            (window as unknown as { shown: typeof shown }).shown = shown;
            class FakeNotification {
                static permission = "default";
                static requestPermission = async () => {
                    FakeNotification.permission = (window as unknown as { answer: string }).answer ?? "granted";
                    return FakeNotification.permission;
                };
                onclick: (() => void) | null = null;
                constructor(title: string, options: { body: string }) { shown.push({ title, body: options.body }); }
                close() {}
            }
            (window as unknown as { Notification: unknown }).Notification = FakeNotification;
        });
    });

    test("asks for permission when switched on, and says so when it is refused", async ({ page }) => {
        await mockBackend(page);
        await page.addInitScript(() => { (window as unknown as { answer: string }).answer = "denied"; });
        await page.goto("/");
        const dialog = await openSettings(page);

        await dialog.getByLabel("Desktop notifications").click();

        await expect(dialog.getByRole("alert")).toHaveText("Notifications are blocked in your browser settings.");
        await expect(dialog.getByLabel("Desktop notifications")).not.toBeChecked();
    });

    test("is switched on after the permission is granted", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        const dialog = await openSettings(page);

        await dialog.getByLabel("Desktop notifications").check();

        await expect(dialog.getByLabel("Desktop notifications")).toBeChecked();
        expect(JSON.parse((await page.evaluate(() => localStorage.getItem("settings")))!).notifications).toBe(true);
    });
});

test.describe("accessibility", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
    });

    test("the skip link moves the focus to the message input", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        await page.keyboard.press("Tab");
        const skip = page.getByRole("link", { name: "Skip to the message input" });
        await expect(skip).toBeFocused();
        await expect(skip).toBeInViewport();

        await page.keyboard.press("Enter");

        await expect(page.getByLabel("Message", { exact: true })).toBeFocused();
    });

    test("selecting a chat moves the focus into the conversation", async ({ page }) => {
        await mockBackend(page, { chats: [ annaChat(), { ...annaChat(), id: 11, users: [ ME, PIOTR ], messages: [] } ] });
        await page.goto("/");

        await page.getByRole("button", { name: /Piotr Zielinski/ }).click();

        await expect(page.locator("#conversation-title")).toBeFocused();
        await expect(page.locator("#conversation-title")).toHaveText("Piotr Zielinski");
    });

    test("the chat list works with the arrow keys, Home and End", async ({ page }) => {
        const chats = [ annaChat(), { ...annaChat(), id: 11, users: [ ME, PIOTR ] }, { ...annaChat(), id: 12, users: [ ME, { id: 4, username: "kasia", name: "Kasia", surname: "M" } ] } ];
        chats[1].messages = [ makeMessage(200, 11, ME.id, "x", "2021-05-03T10:00:00") ];
        chats[2].messages = [ makeMessage(201, 12, ME.id, "y", "2021-05-02T10:00:00") ];
        await mockBackend(page, { chats });
        await page.goto("/");
        const items = page.locator(".chatItem");
        await expect(items).toHaveCount(3);

        await items.nth(0).focus();
        await page.keyboard.press("ArrowDown");
        await expect(items.nth(1)).toBeFocused();
        await page.keyboard.press("End");
        await expect(items.nth(2)).toBeFocused();
        await page.keyboard.press("ArrowUp");
        await expect(items.nth(1)).toBeFocused();
        await page.keyboard.press("Home");
        await expect(items.nth(0)).toBeFocused();
        await page.keyboard.press("ArrowUp");
        await expect(items.nth(0)).toBeFocused();
    });

    test("messages have a labelled log region, and the page has landmarks for the lists", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        await expect(page.getByRole("log", { name: "Messages" })).toBeVisible();
        await expect(page.getByRole("group", { name: "Chats" })).toBeVisible();
    });

    test("the announcer is a polite live region, empty at first", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        const announcer = page.locator('[role="log"][aria-live="polite"]');
        await expect(announcer).toHaveCount(1);
        await expect(announcer).toHaveText("");
    });
});

test.describe("empty, loading and error states", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
    });

    test("explains an empty app and offers nothing to type into", async ({ page }) => {
        await mockBackend(page, { chats: [] });
        await page.goto("/");
        await expect(page.getByText("No chats yet. Find someone with the search above, or start a group.")).toBeVisible();
        await expect(page.getByText("Choose a chat, or find someone to talk to")).toBeVisible();
        await expect(page.getByLabel("Message", { exact: true })).toHaveCount(0);
    });

    test("says when the search finds nobody, and when the text is too short", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        await page.getByLabel("Find people").fill("a");
        await expect(page.getByText("Type at least 2 characters")).toBeVisible();
        await page.getByLabel("Find people").fill("zzzzz");
        await expect(page.getByText("Nobody found")).toBeVisible();
        await page.getByLabel("Find people").fill("piotr");
        await expect(page.getByRole("button", { name: "Piotr Zielinski" })).toBeVisible();
        await expect(page.getByText("Nobody found")).toHaveCount(0);
    });

    test("shows placeholders while the chats load", async ({ page }) => {
        await mockBackend(page);
        await page.route("**/api/chats/1?*", async route => {
            await new Promise(resolve => setTimeout(resolve, 800));
            await route.fallback();
        });
        await page.goto("/");
        await expect(page.locator(".chatsSection__skeleton").first()).toBeVisible();
        await expect(page.getByText("Loading chats...")).toBeAttached();
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeVisible();
        await expect(page.locator(".chatsSection__skeleton")).toHaveCount(0);
    });

    test("a failed load of the chat list can be retried", async ({ page }) => {
        const backend = await mockBackend(page, { failChatLoads: 1 });
        await page.goto("/");

        await expect(page.getByRole("alert")).toContainText("Could not load your chats");
        await page.getByRole("button", { name: "Try again" }).click();

        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeVisible();
        expect(backend.requests.filter(r => r.startsWith("GET /chats/1")).length).toBeGreaterThanOrEqual(2);
    });

    test("a chat whose messages could not be loaded offers a retry", async ({ page }) => {
        await mockBackend(page, { failHistoryLoads: 1 });
        await page.goto("/");

        await expect(page.getByRole("alert")).toContainText("Could not load the messages");
        await page.getByRole("button", { name: "Try again" }).click();

        await expect(page.getByText("Hi Jan, are we still on for today?")).toBeVisible();
        await expect(page.getByRole("alert")).toHaveCount(0);
    });
});

test.describe("responsive", () => {
    test("the settings dialog and the banner fit a phone", async ({ page }) => {
        await signInAs(page);
        await mockBackend(page);
        await page.setViewportSize({ width: 360, height: 640 });
        await page.goto("/");
        const dialog = await openSettings(page);
        const box = await dialog.boundingBox();
        expect(box!.width).toBeLessThanOrEqual(360);
        expect(box!.height).toBeLessThanOrEqual(640);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test("the light theme keeps the chat readable on a phone", async ({ page }) => {
        await signInAs(page);
        await mockBackend(page, { chats: [ { ...annaChat(), unreadCount: 2 }, { id: 12, users: [ ME, ANNA, PIOTR ], messages: [], status: [], group: true, name: "Team" } ] });
        await page.emulateMedia({ colorScheme: "light" });
        await page.setViewportSize({ width: 360, height: 640 });
        await page.goto("/");
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
});
