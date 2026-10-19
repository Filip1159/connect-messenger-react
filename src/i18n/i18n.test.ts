import { afterEach, describe, expect, it, vi } from "vitest";
import strings, { detectLocale, getLocale, setLocale } from "./index";
import en from "./en";
import pl from "./pl";

/* every key of a dictionary, as "section.key" */
const keys = (dict: object, prefix = ""): string[] =>
    Object.entries(dict).flatMap(([ key, value ]) =>
        typeof value === "object" ? keys(value, `${prefix}${key}.`) : [ `${prefix}${key}` ]);

describe("i18n", () => {
    afterEach(() => setLocale("en"));

    it("has every text in every language", () => {
        expect(keys(pl).sort()).toEqual(keys(en).sort());
    });

    it("has no empty texts", () => {
        for (const dict of [ en, pl ]) {
            for (const key of keys(dict)) {
                const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], dict);
                expect(value, key).not.toBe("");
            }
        }
    });

    it("reads the texts of the current language when they are used", () => {
        expect(strings.chats.you).toBe("You");
        setLocale("pl");
        expect(strings.chats.you).toBe("Ty");
        expect(getLocale()).toBe("pl");
        expect(document.documentElement.lang).toBe("pl");
    });

    it("picks Polish for a Polish browser and English otherwise", () => {
        const language = vi.spyOn(navigator, "language", "get");
        language.mockReturnValue("pl-PL");
        expect(detectLocale()).toBe("pl");
        language.mockReturnValue("de-DE");
        expect(detectLocale()).toBe("en");
        language.mockRestore();
    });
});
