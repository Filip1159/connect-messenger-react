import { expect, test } from "@playwright/test";
import { makeToken, mockBackend, signInAs } from "./support/backend";

test.describe("login", () => {
    test("redirects anonymous visitors to the login page", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/");
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByLabel("your username:")).toBeVisible();
    });

    test("signs in with valid credentials and shows the chats", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/login");
        await page.getByLabel("your username:").fill("jan");
        await page.getByLabel("password:").fill("secret");
        await page.getByRole("button", { name: "sign in" }).click();

        await expect(page).toHaveURL("/");
        await expect(page.getByText("Anna Nowak").first()).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem("token"))).toBeTruthy();
    });

    test("shows an error for bad credentials", async ({ page }) => {
        await mockBackend(page);
        await page.goto("/login");
        await page.getByLabel("your username:").fill("jan");
        await page.getByLabel("password:").fill("wrong");
        await page.getByRole("button", { name: "sign in" }).click();

        await expect(page.getByRole("alert")).toHaveText("Bad credentials! Try again");
        await expect(page).toHaveURL(/\/login$/);
    });

    test("distinguishes an unavailable server from bad credentials", async ({ page }) => {
        await mockBackend(page, { loginStatus: 500 });
        await page.goto("/login");
        await page.getByLabel("your username:").fill("jan");
        await page.getByLabel("password:").fill("secret");
        await page.getByRole("button", { name: "sign in" }).click();

        await expect(page.getByRole("alert")).toHaveText("Could not sign in. Try again later");
    });

    test("an already signed in user skips the login page", async ({ page }) => {
        await mockBackend(page);
        await signInAs(page);
        await page.goto("/login");
        await expect(page).toHaveURL("/");
    });

    test("an expired token is discarded", async ({ page }) => {
        await mockBackend(page);
        const expired = makeToken(undefined, -60);
        await page.addInitScript(t => localStorage.setItem("token", t), expired);
        await page.goto("/");
        await expect(page).toHaveURL(/\/login$/);
        expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
    });

    test("signing out returns to the login page and drops the token", async ({ page }) => {
        await mockBackend(page);
        await signInAs(page);
        await page.goto("/");
        await expect(page.getByText("Anna Nowak").first()).toBeVisible();

        await page.getByRole("button", { name: "Sign out" }).click();

        await expect(page).toHaveURL(/\/login$/);
        expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
    });

    test("a 401 from the backend signs the user out", async ({ page }) => {
        await mockBackend(page);
        await signInAs(page);
        await page.route(/\/api\/v1\/chats(\?|$)/, route => route.fulfill({ status: 401 }));
        await page.goto("/");
        await expect(page).toHaveURL(/\/login$/);
    });
});
