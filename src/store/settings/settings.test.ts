import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import reducer, { initialSettingsState, loadSettings, saveSettings, setLanguage, setNotifications, setSound, setTheme } from "./settingsSlice";
import { applyTheme, resolveTheme } from "./theme";

describe("settings", () => {
    beforeEach(() => localStorage.clear());

    it("starts with the defaults, in the language of the browser", () => {
        expect(loadSettings()).toEqual({ theme: "system", locale: "en", notifications: false, sound: true });
        const language = vi.spyOn(navigator, "language", "get").mockReturnValue("pl");
        expect(loadSettings().locale).toBe("pl");
        language.mockRestore();
    });

    it("keeps what was saved", () => {
        const chosen = { theme: "dark" as const, locale: "pl" as const, notifications: true, sound: false };
        saveSettings(chosen);
        expect(loadSettings()).toEqual(chosen);
    });

    it("ignores damaged or unknown stored values", () => {
        localStorage.setItem("settings", JSON.stringify({ theme: "purple", locale: "xx", notifications: "yes", sound: 0 }));
        expect(loadSettings()).toEqual({ theme: "system", locale: "en", notifications: false, sound: true });
        localStorage.setItem("settings", "{not json");
        expect(loadSettings().theme).toBe("system");
    });

    it("changes one choice at a time", () => {
        let state = reducer(initialSettingsState, setTheme("light"));
        state = reducer(state, setLanguage("pl"));
        state = reducer(state, setNotifications(true));
        state = reducer(state, setSound(false));
        expect(state).toEqual({ theme: "light", locale: "pl", notifications: true, sound: false });
    });
});

describe("theme", () => {
    afterEach(() => document.documentElement.removeAttribute("data-theme"));

    it("follows the device only for 'system'", () => {
        expect(resolveTheme("system", true)).toBe("dark");
        expect(resolveTheme("system", false)).toBe("light");
        expect(resolveTheme("light", true)).toBe("light");
        expect(resolveTheme("dark", false)).toBe("dark");
    });

    it("is set on the page", () => {
        applyTheme("light");
        expect(document.documentElement.dataset.theme).toBe("light");
        applyTheme("dark");
        expect(document.documentElement.dataset.theme).toBe("dark");
    });
});
