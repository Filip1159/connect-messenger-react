import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/* the colours of both themes are CSS variables in base.scss; the pairs people read must be readable (WCAG AA) */
const css = readFileSync("src/styles/base.scss", "utf8");

const block = (selector: string): Record<string, string> => {
    const body = css.slice(css.indexOf(selector)).match(/\{([^}]*)\}/)![1];
    return Object.fromEntries([ ...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g) ].map(m => [ m[1], m[2] ]));
};

const channel = (hex: string, from: number) => {
    const c = parseInt(hex.slice(from, from + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string) => 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
export const contrast = (a: string, b: string) => {
    const [ hi, lo ] = [ luminance(a), luminance(b) ].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

/* the colours that are the same in both themes */
const BUBBLE_TEXT = "#1b1b1b";
const BUBBLE_COLORS = { yellow: "#E7EB59", orange: "#FAB131" };
const ON_ORANGE_BADGE = { text: "#FFFFFF", background: "#C2410C" };

const themes = { dark: block(":root {"), light: block(':root[data-theme="light"]') };

describe.each(Object.entries(themes))("%s theme", (_, t) => {
    it("defines every colour", () => {
        for (const name of [ "background", "surface", "surface-raised", "border", "text", "muted", "danger", "accent-text", "focus" ]) {
            expect(t[name], name).toMatch(/^#[0-9a-f]{6}$/i);
        }
    });

    it("keeps the text readable on every surface (4.5:1)", () => {
        for (const surface of [ "background", "surface", "surface-raised" ]) {
            for (const text of [ "text", "muted", "danger", "accent-text" ]) {
                expect(contrast(t[text], t[surface]), `${text} on ${surface}`).toBeGreaterThanOrEqual(4.5);
            }
        }
    });

    it("keeps focus rings and borders of fields visible (3:1)", () => {
        for (const surface of [ "background", "surface", "surface-raised" ]) {
            expect(contrast(t.focus, t[surface]), `focus on ${surface}`).toBeGreaterThanOrEqual(3);
        }
    });
});

describe("colours that don't change with the theme", () => {
    it("keeps the text of the message bubbles readable", () => {
        for (const [ name, color ] of Object.entries(BUBBLE_COLORS)) {
            expect(contrast(BUBBLE_TEXT, color), name).toBeGreaterThanOrEqual(4.5);
        }
    });

    it("keeps the unread badge readable", () => {
        expect(contrast(ON_ORANGE_BADGE.text, ON_ORANGE_BADGE.background)).toBeGreaterThanOrEqual(4.5);
    });

    it("keeps the black text on the yellow header and buttons readable", () => {
        expect(contrast("#000000", "#E7EB59")).toBeGreaterThanOrEqual(4.5);
    });
});
