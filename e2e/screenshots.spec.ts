import { test } from "@playwright/test";
import type { Chat } from "../src/types";
import { ANNA, annaChat, makeMessage, ME, mockBackend, PIOTR, signInAs } from "./support/backend";

/* not a test: regenerates the pictures for the README (npm run screenshots) */
test.skip(!process.env.SCREENSHOTS, "only runs with SCREENSHOTS=1");
test.use({ viewport: { width: 1280, height: 760 } });

const OUT = "docs/screenshots";

const team = (): Chat => ({
    id: 30,
    users: [ ME, ANNA, PIOTR ],
    messages: [
        makeMessage(300, 30, ANNA.id, "Welcome to the team! 🎉", "2021-05-04T12:00:00"),
        makeMessage(301, 30, PIOTR.id, "Thanks, glad to be here", "2021-05-04T12:01:00"),
        makeMessage(302, 30, ME.id, "Standup at 10 tomorrow, ok?", "2021-05-04T12:02:00"),
        makeMessage(303, 30, ANNA.id, "Works for me", "2021-05-04T12:03:00"),
    ],
    status: [ ME, ANNA, PIOTR ].map(u => ({ id: { chatId: 30, userId: u.id }, messageId: 303 })),
    group: true,
    name: "Team",
    adminIds: [ ME.id ],
});

const conversation = (): Chat => {
    const chat = annaChat();
    chat.messages.push(
        makeMessage(102, 10, ANNA.id, "Great, I'll bring the slides", "2021-05-04T12:05:00"),
        makeMessage(103, 10, ME.id, "Perfect, thanks!", "2021-05-04T12:06:00"),
    );
    chat.messages[1].reactions = [ { emoji: "👍", userIds: [ 2 ] } ];
    chat.status = [
        { id: { chatId: 10, userId: ME.id }, messageId: 102 },
        { id: { chatId: 10, userId: ANNA.id }, messageId: 103 },
    ];
    return chat;
};

test.describe("screenshots", () => {
    test("login", async ({ page }) => {
        await mockBackend(page);
        await page.emulateMedia({ colorScheme: "dark" });
        await page.goto("/");
        await page.mouse.move(640, 740);
        await page.waitForTimeout(600); // let the transitions finish
        await page.screenshot({ path: `${OUT}/login.png` });
    });

    test("signed in", async ({ page }) => {
        await signInAs(page);
        await mockBackend(page, { chats: [ conversation(), team() ] });
        await page.emulateMedia({ colorScheme: "dark" });
        await page.goto("/");

        await page.getByRole("button", { name: /Anna Nowak/ }).click();
        await page.locator("#messageId103").waitFor();
        await page.mouse.move(640, 740);
        await page.waitForTimeout(600); // let the transitions finish
        await page.screenshot({ path: `${OUT}/conversation-dark.png` });

        await page.getByRole("button", { name: /Team/ }).click();
        await page.locator("#messageId303").waitFor();
        await page.mouse.move(640, 740);
        await page.waitForTimeout(600); // let the transitions finish
        await page.screenshot({ path: `${OUT}/group.png` });

        await page.getByRole("button", { name: "Settings" }).click();
        await page.getByRole("dialog", { name: "Settings" }).waitFor();
        await page.mouse.move(640, 740);
        await page.waitForTimeout(600); // let the transitions finish
        await page.screenshot({ path: `${OUT}/settings.png` });
        await page.getByRole("dialog", { name: "Settings" }).getByLabel("Light").check();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: /Anna Nowak/ }).click();
        await page.locator("#messageId103").waitFor();
        await page.mouse.move(640, 740);
        await page.waitForTimeout(600); // let the transitions finish
        await page.screenshot({ path: `${OUT}/conversation-light.png` });
    });
});
