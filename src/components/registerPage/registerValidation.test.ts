import { describe, expect, it } from "vitest";
import { validateName, validatePassword, validateUsername } from "./registerValidation";

describe("registration rules (the same as on the backend)", () => {
    it("accepts usernames of 3-30 letters, digits, dots, dashes and underscores", () => {
        for (const ok of [ "abc", "ewa-nowak", "jan.k_1", "A".repeat(30) ]) expect(validateUsername(ok)).toBe(true);
        for (const bad of [ "ab", "has space", "zażółć", "a".repeat(31), "", "a@b" ]) expect(validateUsername(bad)).toBe(false);
    });

    it("ignores spaces around the username", () => {
        expect(validateUsername("  jan007 ")).toBe(true);
    });

    it("needs a password of 8-72 characters with a letter and a digit", () => {
        expect(validatePassword("secret123")).toBe(true);
        expect(validatePassword("hasło1234")).toBe(true);
        for (const bad of [ "short1", "onlyletters", "12345678", "", "x1".repeat(40) ]) expect(validatePassword(bad)).toBe(false);
    });

    it("needs a name of 1-50 characters", () => {
        expect(validateName("Jan")).toBe(true);
        expect(validateName("  ")).toBe(false);
        expect(validateName("x".repeat(51))).toBe(false);
    });
});
