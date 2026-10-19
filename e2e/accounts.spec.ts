import { expect, test } from "@playwright/test";
import { ANNA, ME, mockBackend, signInAs } from "./support/backend";

test.describe("registration", () => {
    test("creates an account, signs in and shows the chat view", async ({ page }) => {
        const backend = await mockBackend(page, { chats: [] });
        await page.goto("/login");

        await page.getByRole("link", { name: /Create an account/ }).click();
        await expect(page).toHaveURL(/\/register$/);
        await page.getByLabel("username:").fill("kasia.m");
        await page.getByLabel("first name:").fill("Kasia");
        await page.getByLabel("last name:").fill("Malinowska");
        await page.getByLabel("password:", { exact: true }).fill("secret123");
        await page.getByLabel("repeat the password:").fill("secret123");
        await page.getByRole("button", { name: "sign up" }).click();

        await expect(page).toHaveURL("/");
        expect(backend.bodies["POST /users"]).toEqual([
            { username: "kasia.m", name: "Kasia", surname: "Malinowska", password: "secret123" }
        ]);
        await expect(page.getByLabel("Find people")).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem("token"))).toBeTruthy();
    });

    test("explains what is wrong before sending anything", async ({ page }) => {
        const backend = await mockBackend(page, { chats: [] });
        await page.goto("/register");

        await page.getByLabel("username:").fill("a b");
        await page.getByLabel("password:", { exact: true }).fill("short");
        await page.getByLabel("repeat the password:").fill("different");
        await page.getByRole("button", { name: "sign up" }).click();

        await expect(page.getByText("3-30 characters: letters, digits, dot, dash or underscore")).toBeVisible();
        await expect(page.getByText("8-72 characters, with a letter and a digit")).toBeVisible();
        await expect(page.getByText("The passwords don't match")).toBeVisible();
        await expect(page.getByLabel("username:")).toHaveAttribute("aria-invalid", "true");
        expect(backend.bodies["POST /users"]).toBeUndefined();
    });

    test("says when the username is taken", async ({ page }) => {
        await mockBackend(page, { chats: [] });
        await page.goto("/register");

        await page.getByLabel("username:").fill("ANNA");
        await page.getByLabel("first name:").fill("Anna");
        await page.getByLabel("last name:").fill("Nowak");
        await page.getByLabel("password:", { exact: true }).fill("secret123");
        await page.getByLabel("repeat the password:").fill("secret123");
        await page.getByRole("button", { name: "sign up" }).click();

        await expect(page.getByRole("alert")).toHaveText("This username is taken");
        await expect(page).toHaveURL(/\/register$/);
    });

    test("signed-in users are sent to the chats", async ({ page }) => {
        await signInAs(page);
        await mockBackend(page);
        await page.goto("/register");
        await expect(page).toHaveURL("/");
    });
});

test.describe("profile", () => {
    test.beforeEach(async ({ page }) => {
        await signInAs(page);
    });

    test("changes the name, which shows in the header at once", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        await expect(page.locator(".header__profileName")).toHaveText("Jan");

        await page.getByRole("button", { name: "My profile" }).click();
        const dialog = page.getByRole("dialog", { name: "My profile" });
        await dialog.getByLabel("First name").fill("Janusz");
        await dialog.getByLabel("Last name").fill("Nowak");
        await dialog.getByRole("button", { name: "Save", exact: true }).click();

        await expect(dialog.getByRole("status")).toHaveText("Saved");
        expect(backend.bodies["PATCH /users/me"]).toEqual([{ name: "Janusz", surname: "Nowak" }]);
        await expect(page.locator(".header__profileName")).toHaveText("Janusz");
        await expect(page.locator(".userDetailsSection__nameSurname")).toHaveText("Janusz Nowak");
    });

    test("uploads a photo, which replaces the default avatar, and removes it again", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: "My profile" }).click();
        const dialog = page.getByRole("dialog", { name: "My profile" });

        await dialog.getByLabel("Change photo", { exact: true }).setInputFiles({
            name: "me.png", mimeType: "image/png", buffer: Buffer.from("png")
        });

        await expect(page.locator(".header__avatar")).toHaveAttribute("src", /^blob:/);
        expect(backend.bodies["PUT /users/me/avatar"]).toHaveLength(1);

        await dialog.getByRole("button", { name: "Remove photo" }).click();
        await expect(page.locator(".header__avatar")).not.toHaveAttribute("src", /^blob:/);
        expect(backend.bodies["DELETE /users/me/avatar"]).toHaveLength(1);
    });

    test("refuses a photo that is too large or not an image before uploading", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: "My profile" }).click();
        const dialog = page.getByRole("dialog", { name: "My profile" });
        const input = dialog.getByLabel("Change photo", { exact: true });

        await input.setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
        await expect(dialog.getByRole("alert")).toHaveText("The photo is too large (2 MB at most)");
        await input.setInputFiles({ name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") });
        await expect(dialog.getByRole("alert")).toHaveText("Only JPG, PNG and GIF images can be sent");
        expect(backend.bodies["PUT /users/me/avatar"]).toBeUndefined();
    });

    test("changes the password only with the right current one", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: "My profile" }).click();
        const dialog = page.getByRole("dialog", { name: "My profile" });

        await dialog.getByLabel("Current password").fill("wrong");
        await dialog.getByLabel("New password", { exact: true }).fill("better123");
        await dialog.getByLabel("Repeat the new password").fill("better123");
        await dialog.getByRole("button", { name: "Change password" }).click();
        await expect(dialog.getByRole("alert")).toHaveText("The current password is wrong");

        await dialog.getByLabel("Current password").fill("secret");
        await dialog.getByRole("button", { name: "Change password" }).click();
        await expect(dialog.getByRole("status").filter({ hasText: "Password changed" })).toBeVisible();
        expect(backend.bodies["PUT /users/me/password"]).toEqual([
            { currentPassword: "wrong", newPassword: "better123" },
            { currentPassword: "secret", newPassword: "better123" }
        ]);
        await expect(dialog.getByLabel("Current password")).toHaveValue("");
    });

    test("won't send a weak or mismatching new password", async ({ page }) => {
        const backend = await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: "My profile" }).click();
        const dialog = page.getByRole("dialog", { name: "My profile" });

        await dialog.getByLabel("Current password").fill("secret");
        await dialog.getByLabel("New password", { exact: true }).fill("weak");
        await expect(dialog.getByText("8-72 characters, with a letter and a digit")).toBeVisible();
        await expect(dialog.getByRole("button", { name: "Change password" })).toBeDisabled();
        await dialog.getByLabel("New password", { exact: true }).fill("better123");
        await dialog.getByLabel("Repeat the new password").fill("better124");
        await expect(dialog.getByText("The passwords don't match")).toBeVisible();
        expect(backend.bodies["PUT /users/me/password"]).toBeUndefined();
    });

    test("lists the blocked people and unblocks them", async ({ page }) => {
        const backend = await mockBackend(page, { blocked: [ ANNA ] });
        await page.goto("/");
        await page.getByRole("button", { name: "My profile" }).click();
        const dialog = page.getByRole("dialog", { name: "My profile" });

        await expect(dialog.getByText("Anna Nowak")).toBeVisible();
        await dialog.getByRole("button", { name: "Unblock Anna Nowak" }).click();

        await expect(dialog.getByText("You haven't blocked anyone")).toBeVisible();
        expect(backend.bodies["DELETE /users/{id}/block"]).toEqual([ ANNA.id ]);
    });

    test("the dialog closes with Escape and gives the focus back", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        const opener = page.getByRole("button", { name: "My profile" });
        await opener.click();
        await expect(page.getByRole("dialog")).toBeVisible();

        await page.keyboard.press("Escape");

        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(opener).toBeFocused();
    });

    test("keeps the focus inside the dialog", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        await page.getByRole("button", { name: "My profile" }).click();
        const dialog = page.getByRole("dialog");

        for (let i = 0; i < 25; i++) {
            await page.keyboard.press("Tab");
            expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
        }
    });

    test("uses the signed-in user's own data", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        await expect(page.locator(".userDetailsSection__nameSurname")).toHaveText(`${ME.name} ${ME.surname}`);
    });
});
