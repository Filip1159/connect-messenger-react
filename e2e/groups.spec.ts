import { expect, test } from "@playwright/test";
import type { Chat } from "../src/types";
import { ANNA, annaChat, makeMessage, ME, mockBackend, PIOTR, signInAs } from "./support/backend";

/* a group of three in which ME is the admin */
const teamChat = (adminIds = [ ME.id ]): Chat => ({
    id: 30,
    users: [ ME, ANNA, PIOTR ],
    messages: [
        makeMessage(300, 30, ANNA.id, "Welcome to the team", "2021-05-04T12:00:00"),
        makeMessage(301, 30, PIOTR.id, "Thanks!", "2021-05-04T12:01:00"),
        makeMessage(302, 30, PIOTR.id, "Glad to be here", "2021-05-04T12:01:30"),
        makeMessage(303, 30, ME.id, "Let's start", "2021-05-04T12:02:00"),
    ],
    status: [ ME, ANNA, PIOTR ].map(u => ({ id: { chatId: 30, userId: u.id }, messageId: 303 })),
    group: true,
    name: "Team",
    adminIds,
});

const openDetails = async (page: import("@playwright/test").Page) => {
    await page.getByRole("button", { name: "Chat options" }).click();
    return page.getByRole("dialog", { name: "Chat details" });
};

test.describe("group chats", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
    });

    test("creates a group of chosen people with a name", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");

        await page.getByRole("button", { name: "New group" }).click();
        const dialog = page.getByRole("dialog", { name: "New group" });
        await expect(dialog.getByRole("button", { name: "Create group" })).toBeDisabled();
        await dialog.getByLabel("Group name", { exact: true }).fill("Weekend");
        await dialog.getByLabel("Search people").fill("anna");
        await dialog.getByRole("button", { name: /Anna Nowak/ }).click();
        await dialog.getByLabel("Search people").fill("piotr");
        await dialog.getByRole("button", { name: /Piotr Zielinski/ }).click();
        await expect(dialog.getByRole("list", { name: "Selected" })).toContainText("Anna Nowak");
        await expect(dialog.getByRole("list", { name: "Selected" })).toContainText("Piotr Zielinski");
        await dialog.getByRole("button", { name: "Create group" }).click();

        await expect(dialog).toHaveCount(0);
        expect(backend.posted.chats).toEqual([ { userIds: [ ME.id, ANNA.id, PIOTR.id ], name: "Weekend" } ]);
        await expect(page.locator(".conversationStatus__name")).toHaveText("Weekend");
        await expect(page.locator(".conversationStatus__state")).toHaveText("3 members");
        await expect(page.getByRole("button", { name: /Weekend/ })).toHaveAttribute("aria-current", "true");
    });

    test("a group of two people needs a name, three don't", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: "New group" }).click();
        const dialog = page.getByRole("dialog", { name: "New group" });

        await dialog.getByLabel("Search people").fill("anna");
        await dialog.getByRole("button", { name: /Anna Nowak/ }).click();
        await expect(dialog.getByRole("button", { name: "Create group" })).toBeDisabled();
        await dialog.getByLabel("Group name", { exact: true }).fill("Duo");
        await expect(dialog.getByRole("button", { name: "Create group" })).toBeEnabled();
        await dialog.getByLabel("Group name", { exact: true }).fill("");
        await dialog.getByLabel("Search people").fill("piotr");
        await dialog.getByRole("button", { name: /Piotr Zielinski/ }).click();
        await expect(dialog.getByRole("button", { name: "Create group" })).toBeEnabled();
    });

    test("shows a group like a chat: title, members, who wrote what", async ({ page }) => {
        await mockBackend(page, { chats: [ annaChat(), teamChat() ] });
        await page.goto("/");

        const item = page.getByRole("button", { name: /Team/ });
        await expect(item).toContainText("You: Let's start");
        await item.click();

        await expect(page.locator(".conversationStatus__name")).toHaveText("Team");
        await expect(page.locator(".conversationStatus__state")).toHaveText("3 members");
        // the name of the author stands above the first message of a series, not above every one
        await expect(page.locator(".singleMessage__author")).toHaveText([ "Anna", "Piotr" ]);
        // no "seen" avatar in a group
        await expect(page.locator(".seenAvatar")).toHaveCount(0);
    });

    test("an admin renames the group, makes an admin and removes a member", async ({ page }) => {
        const backend = await mockBackend(page, { chats: [ annaChat(), teamChat() ] });
        await page.goto("/");
        await page.getByRole("button", { name: /Team/ }).click();
        const dialog = await openDetails(page);

        await dialog.getByRole("textbox", { name: "Group name" }).fill("Crew");
        await dialog.getByRole("button", { name: "Rename" }).click();
        await expect(page.locator(".conversationStatus__name")).toHaveText("Crew");
        expect(backend.bodies["PATCH /chats/chat/{id}"]).toEqual([ "Crew" ]);

        await dialog.getByRole("button", { name: "Make admin: Anna Nowak" }).click();
        await expect(dialog.getByRole("button", { name: "Remove admin: Anna Nowak" })).toBeVisible();
        expect(backend.bodies["PUT /chats/chat/{id}/admins/{userId}"]).toEqual([ ANNA.id ]);

        await dialog.getByRole("button", { name: "Remove from the group: Piotr Zielinski" }).click();
        await expect(dialog.locator(".chatDetails__member").filter({ hasText: "Piotr Zielinski" })).toHaveCount(0);
        await expect(page.locator(".conversationStatus__state")).toHaveText("2 members");
        expect(backend.bodies["DELETE /chats/chat/{id}/members/{userId}"]).toEqual([ PIOTR.id ]);
    });

    test("an admin adds people to the group", async ({ page }) => {
        const backend = await mockBackend(page, {
            chats: [ annaChat(), { ...teamChat(), users: [ ME, ANNA ] } ]
        });
        await page.goto("/");
        await page.getByRole("button", { name: /Team/ }).click();
        const dialog = await openDetails(page);

        await dialog.getByLabel("Search people").fill("an");
        await expect(dialog.getByText("No people found")).toBeVisible();  // Anna is already a member
        await dialog.getByLabel("Search people").fill("piotr");
        await dialog.getByRole("button", { name: /Piotr Zielinski/ }).click();
        await dialog.getByRole("button", { name: /^Add \(1\)/ }).click();

        await expect(dialog.locator(".chatDetails__member").filter({ hasText: "Piotr Zielinski" })).toBeVisible();
        expect(backend.bodies["POST /chats/chat/{id}/members"]).toEqual([ [ PIOTR.id ] ]);
        await expect(page.locator(".conversationStatus__state")).toHaveText("3 members");
    });

    test("a member who is not an admin can only leave", async ({ page }) => {
        const backend = await mockBackend(page, { chats: [ annaChat(), teamChat([ ANNA.id ]) ] });
        await page.goto("/");
        await page.getByRole("button", { name: /Team/ }).click();
        const dialog = await openDetails(page);

        await expect(dialog.getByRole("textbox", { name: "Group name" })).toHaveCount(0);
        await expect(dialog.getByRole("button", { name: /^Make admin/ })).toHaveCount(0);
        await expect(dialog.getByRole("button", { name: /^Remove from the group/ })).toHaveCount(0);
        await expect(dialog.getByText("Add people")).toHaveCount(0);
        await expect(dialog.locator(".chatDetails__member").filter({ hasText: "Anna Nowak" })).toContainText("admin");

        await dialog.getByRole("button", { name: "Leave the group" }).click();
        await expect(dialog.getByText("Leave this group?")).toBeVisible();
        expect(backend.bodies["DELETE /chats/chat/{id}/members/{userId}"]).toBeUndefined();
        await dialog.getByRole("button", { name: "Yes" }).click();

        await expect(page.getByRole("dialog")).toHaveCount(0);
        expect(backend.bodies["DELETE /chats/chat/{id}/members/{userId}"]).toEqual([ ME.id ]);
        await expect(page.getByRole("button", { name: /Team/ })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toHaveAttribute("aria-current", "true");
    });
});

test.describe("chat options", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
    });

    test("archives a chat into the archive section and brings it back", async ({ page }) => {
        const backend = await mockBackend(page, { chats: [ annaChat(), teamChat() ] });
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        let dialog = await openDetails(page);
        await dialog.getByRole("button", { name: "Archive" }).click();
        await expect(dialog.getByRole("button", { name: "Unarchive" })).toHaveAttribute("aria-pressed", "true");
        expect(backend.bodies["PATCH /chats/chat/{id}/settings"]).toEqual([ { archived: true } ]);
        await page.keyboard.press("Escape");

        // the open chat stays on the screen, the list moved it into the archive
        const archive = page.getByRole("button", { name: /Archived \(1\)/ });
        await expect(archive).toHaveAttribute("aria-expanded", "true");
        await page.getByRole("button", { name: /Team/ }).click();
        await expect(archive).toHaveAttribute("aria-expanded", "false");
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toHaveCount(0);

        await archive.click();
        await page.getByRole("button", { name: /Anna Nowak/ }).click();
        dialog = await openDetails(page);
        await dialog.getByRole("button", { name: "Unarchive" }).click();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("button", { name: /Archived/ })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /Anna Nowak/ })).toBeVisible();
    });

    test("muting marks the chat and keeps it out of the unread count in the tab title", async ({ page }) => {
        const chat = teamChat();
        chat.unreadCount = 4;
        const backend = await mockBackend(page, { chats: [ annaChat(), chat ] });
        await page.goto("/");
        await expect(page).toHaveTitle("(4) CONNECT");

        await page.getByRole("button", { name: /Team/ }).click();
        const dialog = await openDetails(page);
        await dialog.getByRole("button", { name: "Mute" }).click();

        await expect(dialog.getByRole("button", { name: "Unmute" })).toHaveAttribute("aria-pressed", "true");
        expect(backend.bodies["PATCH /chats/chat/{id}/settings"]).toEqual([ { muted: true } ]);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("button", { name: /Team/ }).getByRole("img", { name: "Muted" })).toBeVisible();
    });

    test("blocks the other person: the input is replaced by a notice, and can be unblocked from it", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();

        const dialog = await openDetails(page);
        await dialog.getByRole("button", { name: "Block Anna Nowak" }).click();
        await expect(dialog.getByText(/Block this person\?/)).toBeVisible();
        expect(backend.bodies["PUT /users/{id}/block"]).toBeUndefined();
        await dialog.getByRole("button", { name: "Block", exact: true }).click();
        await expect(dialog.getByText("You blocked this person.")).toBeVisible();
        expect(backend.bodies["PUT /users/{id}/block"]).toEqual([ ANNA.id ]);
        await page.keyboard.press("Escape");

        await expect(page.getByLabel("Message", { exact: true })).toHaveCount(0);
        await expect(page.getByText("You blocked this person, so you can't write to them.")).toBeVisible();
        await page.locator(".newMessageInput--blocked").getByRole("button", { name: "Unblock" }).click();

        await expect(page.getByLabel("Message", { exact: true })).toBeVisible();
        expect(backend.bodies["DELETE /users/{id}/block"]).toEqual([ ANNA.id ]);
    });

    test("groups are not blocked as a whole", async ({ page }) => {
        await mockBackend(page, { chats: [ teamChat() ] });
        await page.goto("/");
        const dialog = await openDetails(page);
        await expect(dialog.getByRole("button", { name: /^Block/ })).toHaveCount(0);
    });

    test("the group dialogs are usable on a phone", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 700 });
        await mockBackend(page, { chats: [ teamChat() ] });
        await page.goto("/");
        await page.getByRole("button", { name: /Team/ }).click();
        const dialog = await openDetails(page);

        const box = await dialog.boundingBox();
        expect(box!.width).toBeLessThanOrEqual(375);
        expect(box!.height).toBeLessThanOrEqual(700);
        await expect(dialog.getByRole("button", { name: "Leave the group" })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
});
