import { describe, expect, it } from "vitest";
import { splitLinks } from "./linkify";

describe("splitLinks", () => {
    it("returns plain text as one part", () => {
        expect(splitLinks("no links here")).toEqual([ { text: "no links here" } ]);
        expect(splitLinks("")).toEqual([]);
    });

    it("finds http and https links between text", () => {
        expect(splitLinks("see https://example.com/a?b=1 and http://x.pl ok")).toEqual([
            { text: "see " },
            { text: "https://example.com/a?b=1", href: "https://example.com/a?b=1" },
            { text: " and " },
            { text: "http://x.pl", href: "http://x.pl" },
            { text: " ok" }
        ]);
    });

    it("leaves sentence punctuation out of the link", () => {
        expect(splitLinks("Open (https://example.com/x).")).toEqual([
            { text: "Open (" },
            { text: "https://example.com/x", href: "https://example.com/x" },
            { text: ")." }
        ]);
    });

    it("never links other schemes", () => {
        expect(splitLinks("javascript:alert(1) data:text/html,<b>x</b>").every(p => !p.href)).toBe(true);
    });

    it("keeps newlines in the text parts", () => {
        expect(splitLinks("a\nhttps://e.com\nb")).toEqual([
            { text: "a\n" },
            { text: "https://e.com", href: "https://e.com" },
            { text: "\nb" }
        ]);
    });
});
