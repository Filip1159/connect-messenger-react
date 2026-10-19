import { describe, expect, it } from "vitest";
import { getMyStatus, getRecipient, getRecipientStatus, participatesInChat } from "./chatUtils";
import { makeChat } from "../../test/fixtures";

describe("chatUtils", () => {
    const chat = makeChat(1, "2021-01-01T10:00:00");

    it("finds the recipient regardless of user order", () => {
        expect(getRecipient(chat, 1)!.id).toBe(2);
        expect(getRecipient(chat, 2)!.id).toBe(1);
    });

    it("finds own and recipient status", () => {
        expect(getMyStatus(chat, 2)!.id.userId).toBe(2);
        expect(getRecipientStatus(chat, 2)!.id.userId).toBe(1);
    });

    it("checks participation", () => {
        expect(participatesInChat(chat, 1)).toBe(true);
        expect(participatesInChat(chat, 3)).toBe(false);
    });
});
