import { describe, expect, it } from "vitest";
import { chatTitle, getMyStatus, getOthers, getRecipient, getRecipientStatus, isAdmin, isGroup, participatesInChat } from "./chatUtils";
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

    it("names a 1:1 chat after the other person", () => {
        expect(chatTitle(chat, 1)).toBe("Name2 Surname2");
        expect(chatTitle(chat, 2)).toBe("Name1 Surname1");
        expect(isGroup(chat)).toBe(false);
    });

    it("titles a group with its name, or lists the other members", () => {
        const group = { ...makeChat(2, null, { users: [ 1, 2, 3 ] }), group: true };
        expect(chatTitle({ ...group, name: "Team" }, 1)).toBe("Team");
        expect(chatTitle(group, 1)).toBe("Name2, Name3");
        expect(getOthers(group, 1).map(u => u.id)).toEqual([ 2, 3 ]);
    });

    it("knows the admins of a group", () => {
        const group = { ...makeChat(2, null, { users: [ 1, 2, 3 ] }), group: true, adminIds: [ 2 ] };
        expect(isAdmin(group, 2)).toBe(true);
        expect(isAdmin(group, 1)).toBe(false);
        expect(isAdmin(chat, 1)).toBe(false);
    });

    it("checks participation", () => {
        expect(participatesInChat(chat, 1)).toBe(true);
        expect(participatesInChat(chat, 3)).toBe(false);
    });
});
