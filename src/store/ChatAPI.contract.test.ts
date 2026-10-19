import { beforeEach, describe, expect, it, vi } from "vitest";

/* every REST call of the app: which method, URL, query and body it sends (the contract with the backend) */
const http = vi.hoisted(() => {
    const respond = vi.fn(async () => ({ data: "result", headers: {} }));
    return {
        get: vi.fn(respond), post: vi.fn(respond), put: vi.fn(respond), patch: vi.fn(respond), delete: vi.fn(respond),
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } }
    };
});
vi.mock("axios", () => ({ default: { create: () => http, isAxiosError: () => false } }));

import ChatAPI from "./ChatAPI";

const base64 = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "");
const token = `${base64({ alg: "none" })}.${base64({ id: 7, username: "u", name: "N", surname: "S", exp: Math.floor(Date.now() / 1000) + 3600 })}.x`;

const lastCall = (method: "get" | "post" | "put" | "patch" | "delete") => http[method].mock.calls.at(-1) as unknown as unknown[];
const formEntries = (data: unknown) => Object.fromEntries((data as FormData).entries());

describe("REST contract", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem("token", token);
    });

    it("reads chats and their messages", async () => {
        await ChatAPI.loadAllChats();
        expect(lastCall("get")).toEqual([ "/chats/7", { params: { includeMessages: false } } ]);
        await ChatAPI.loadChat(3);
        expect(lastCall("get")).toEqual([ "/chats/chat/3" ]);
        await ChatAPI.loadMessages(3, 90);
        expect(lastCall("get")).toEqual([ "/chats/chat/3/messages", { params: { before: 90, size: 50 }, signal: undefined } ]);
        await ChatAPI.loadMessagesAfter(3, 10);
        expect(lastCall("get")).toEqual([ "/chats/chat/3/messages", { params: { after: 10, size: 50 }, signal: undefined } ]);
        await ChatAPI.searchMessages(3, "hi", 40);
        expect(lastCall("get")).toEqual([ "/chats/chat/3/messages", { params: { query: "hi", before: 40, size: 50 }, signal: undefined } ]);
        await ChatAPI.loadPresence();
        expect(lastCall("get")).toEqual([ "/presence" ]);
    });

    it("sends messages, statuses, reactions, edits and deletes", async () => {
        await ChatAPI.postMessage(3, "TEXT", "hello", 5);
        const [ url, body ] = lastCall("post");
        expect(url).toBe("/message");
        expect(formEntries(body)).toEqual({ chatId: "3", type: "TEXT", replyToId: "5", textContent: "hello" });
        await ChatAPI.postMessage(3, "FILE", new File([ "x" ], "a.png"));
        expect(Object.keys(formEntries(lastCall("post")[1]))).toEqual([ "chatId", "type", "fileContent" ]);

        await ChatAPI.updateStatus(3, 12);
        expect(lastCall("put")).toEqual([ "/status", { id: { chatId: 3 }, messageId: 12 } ]);
        await ChatAPI.loadMessage(9);
        expect(lastCall("get")).toEqual([ "/message/9", { signal: undefined } ]);
        await ChatAPI.react(9, "👍");
        expect(lastCall("put")).toEqual([ "/message/9/reaction", { emoji: "👍" } ]);
        await ChatAPI.removeReaction(9);
        expect(lastCall("delete")).toEqual([ "/message/9/reaction" ]);
        await ChatAPI.editMessage(9, "new");
        expect(lastCall("patch")).toEqual([ "/message/9", { textContent: "new" } ]);
        await ChatAPI.deleteMessage(9);
        expect(lastCall("delete")).toEqual([ "/message/9" ]);
        await ChatAPI.loadFile("a b.png");
        expect(lastCall("get")).toEqual([ "/message/file/a%20b.png/raw", { responseType: "blob", signal: undefined } ]);
    });

    it("creates chats and groups and manages them", async () => {
        await ChatAPI.createChat([ 2 ]);
        expect(lastCall("post")).toEqual([ "/chats", { userIds: [ 7, 2 ] } ]);
        await ChatAPI.createChat([ 2, 3 ], "Team");
        expect(lastCall("post")).toEqual([ "/chats", { userIds: [ 7, 2, 3 ], name: "Team" } ]);
        await ChatAPI.updateChatSettings(3, { muted: true });
        expect(lastCall("patch")).toEqual([ "/chats/chat/3/settings", { muted: true } ]);
        await ChatAPI.renameChat(3, "New");
        expect(lastCall("patch")).toEqual([ "/chats/chat/3", { name: "New" } ]);
        await ChatAPI.addMembers(3, [ 4, 5 ]);
        expect(lastCall("post")).toEqual([ "/chats/chat/3/members", { userIds: [ 4, 5 ] } ]);
        await ChatAPI.removeMember(3, 4);
        expect(lastCall("delete")).toEqual([ "/chats/chat/3/members/4" ]);
        await ChatAPI.setAdmin(3, 4, true);
        expect(lastCall("put")).toEqual([ "/chats/chat/3/admins/4" ]);
        await ChatAPI.setAdmin(3, 4, false);
        expect(lastCall("delete")).toEqual([ "/chats/chat/3/admins/4" ]);
    });

    it("handles accounts, profile, avatars and blocking", async () => {
        await ChatAPI.searchUsersByQuery("a b");
        expect(lastCall("get")).toEqual([ "/user/a%20b", { signal: undefined } ]);
        await ChatAPI.register({ username: "u", name: "N", surname: "S", password: "p" });
        expect(lastCall("post")).toEqual([ "/users", { username: "u", name: "N", surname: "S", password: "p" } ]);
        await ChatAPI.loadProfile();
        expect(lastCall("get")).toEqual([ "/users/me" ]);
        await ChatAPI.updateProfile("A", "B");
        expect(lastCall("patch")).toEqual([ "/users/me", { name: "A", surname: "B" } ]);
        await ChatAPI.changePassword("old", "new");
        expect(lastCall("put")).toEqual([ "/users/me/password", { currentPassword: "old", newPassword: "new" } ]);
        await ChatAPI.uploadAvatar(new File([ "x" ], "me.png"));
        expect(lastCall("put")[0]).toBe("/users/me/avatar");
        expect(Object.keys(formEntries(lastCall("put")[1]))).toEqual([ "file" ]);
        await ChatAPI.removeAvatar();
        expect(lastCall("delete")).toEqual([ "/users/me/avatar" ]);
        await ChatAPI.loadAvatar(4);
        expect(lastCall("get")).toEqual([ "/users/4/avatar", { responseType: "blob", signal: undefined } ]);
        await ChatAPI.loadBlocked();
        expect(lastCall("get")).toEqual([ "/users/blocked" ]);
        await ChatAPI.blockUser(4);
        expect(lastCall("put")).toEqual([ "/users/4/block" ]);
        await ChatAPI.unblockUser(4);
        expect(lastCall("delete")).toEqual([ "/users/4/block" ]);
    });

    it("signs in with the credentials and keeps the token", async () => {
        http.post.mockResolvedValueOnce({ data: "", headers: { authentication: token } });
        localStorage.clear();
        expect(await ChatAPI.signIn("u", "p")).toEqual({ success: true });
        expect(lastCall("post")).toEqual([ "/login", { username: "u", password: "p" } ]);
        expect(localStorage.getItem("token")).toBe(token);
        expect(ChatAPI.getAuthDetails()).toMatchObject({ id: 7, username: "u" });
    });

    it("refuses to call the backend when nobody is signed in", async () => {
        localStorage.clear();
        await expect(ChatAPI.loadProfile()).rejects.toThrow("signed in");
        expect(http.get).not.toHaveBeenCalled();
    });
});
