import { describe, expect, it } from "vitest";
import { formatterFor } from "./formatterFor";
import type { Message } from "../../types";

const msg = (id: number, time: string): Message => ({ id, chatId: 1, userId: 1, type: "TEXT", content: "x", time } as Message);

describe("formatterFor", () => {
    it("returns the same formatter while the times around the message are unchanged", () => {
        const first = [ msg(9001, "2024-01-01T10:00:00"), msg(9002, "2024-01-01T10:01:00") ];
        const again = first.map(m => ({ ...m }));
        expect(formatterFor(again, 1)).toBe(formatterFor(first, 1));
    });

    it("builds a new one when a neighbour appears, since the grouping may change", () => {
        const before = [ msg(9011, "2024-01-01T10:00:00") ];
        const after = [ ...before, msg(9012, "2024-01-01T10:02:00") ];
        const old = formatterFor(before, 0);
        const next = formatterFor(after, 0);
        expect(next).not.toBe(old);
        expect(next.is5MinDiffAfter()).toBe(true);
        expect(old.is5MinDiffAfter()).toBe(false);
    });
});
