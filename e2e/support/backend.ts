import type { Page, Route } from "@playwright/test";
import type { Chat, Message, User } from "../../src/types";

export const ME: User = { id: 1, username: "jan", name: "Jan", surname: "Kowalski" };
export const ANNA: User = { id: 2, username: "anna", name: "Anna", surname: "Nowak" };
export const PIOTR: User = { id: 3, username: "piotr", name: "Piotr", surname: "Zielinski" };

const base64Url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

/* the app only decodes the token, it never verifies the signature */
export const makeToken = (user: User = ME, expiresInSeconds = 3600) =>
    [
        base64Url({ alg: "none" }),
        base64Url({ ...user, exp: Math.floor(Date.now() / 1000) + expiresInSeconds }),
        "signature",
    ].join(".");

export const makeMessage = (id: number, chatId: number, userId: number, content: string, time: string): Message =>
    ({ id, chatId, userId, type: "TEXT", content, time });

export const annaChat = (): Chat => ({
    id: 10,
    users: [ME, ANNA],
    messages: [
        makeMessage(100, 10, ANNA.id, "Hi Jan, are we still on for today?", "2021-05-04T12:00:00"),
        makeMessage(101, 10, ME.id, "Yes, see you at five", "2021-05-04T12:01:00"),
    ],
    status: [
        { id: { chatId: 10, userId: ME.id }, messageId: 100 },
        { id: { chatId: 10, userId: ANNA.id }, messageId: 101 },
    ],
});

export interface Backend {
    chats: Chat[];
    users: User[];
    /* the people the signed-in user (ME) blocked */
    blocked: User[];
    /* JSON bodies of the account / group endpoints, as { "METHOD /path": [body, ...] } */
    bodies: Record<string, unknown[]>;
    /* every request the app made to a mocked endpoint, as "METHOD /path" */
    requests: string[];
    edited: { id: number; textContent: string }[];
    deleted: number[];
    reacted: { id: number; emoji: string | null }[];
    posted: { messages: Record<string, string>[]; statuses: unknown[]; chats: unknown[] };
}

export interface BackendOptions {
    chats?: Chat[];
    users?: User[];
    /* credentials accepted by POST /login */
    password?: string;
    loginStatus?: number;
    /* the first N message posts fail with a 500 */
    failMessagePosts?: number;
    presence?: { userId: number; online: boolean; lastSeen: string | null }[];
    blocked?: User[];
    /* the first N loads of the chat list / of a page of messages fail with a 500 */
    failChatLoads?: number;
    failHistoryLoads?: number;
    /* the avatar of ME: an uploaded one is served as a tiny PNG */
    avatarKey?: string;
}

/* 1x1 transparent PNG */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==", "base64");

const json = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });

/* replaces the Spring backend: REST endpoints are answered from memory, the websocket is refused */
export const mockBackend = async (page: Page, options: BackendOptions = {}): Promise<Backend> => {
    const backend: Backend = {
        chats: options.chats ?? [annaChat()],
        users: options.users ?? [ME, ANNA, PIOTR],
        blocked: options.blocked ?? [],
        bodies: {},
        requests: [],
        edited: [],
        deleted: [],
        reacted: [],
        posted: { messages: [], statuses: [], chats: [] },
    };
    const password = options.password ?? "secret";
    let failuresLeft = options.failMessagePosts ?? 0;
    let nextMessageId = 1000;
    let chatLoadFailures = options.failChatLoads ?? 0;
    let historyFailures = options.failHistoryLoads ?? 0;
    let nextChatId = 20;
    let nextUserId = 100;
    let currentPassword = password;
    let avatarKey = options.avatarKey ?? null;
    let signedInId = ME.id;  // whoever logged in last; a token injected by signInAs() is ME
    const me = () => ({ ...backend.users.find(u => u.id === signedInId)!, avatarKey });
    const record = (key: string, body: unknown) => (backend.bodies[key] ??= []).push(body);
    const chatOf = (id: number) => backend.chats.find(c => c.id === id);
    const withFlags = (chat: Chat): Chat => ({ adminIds: [], group: false, name: null, archived: false, muted: false, ...chat });

    await page.route("**/api/**", async route => {
        const request = route.request();
        const { pathname } = new URL(request.url());
        const path = pathname.replace(/^\/api/, "");
        const method = request.method();
        backend.requests.push(`${method} ${path}`);

        if (path.startsWith("/websocket")) return route.fulfill({ status: 404 });

        if (method === "POST" && path === "/login") {
            const { username, password: given } = request.postDataJSON();
            const user = backend.users.find(u => u.username === username);
            if (options.loginStatus && options.loginStatus !== 200) return route.fulfill({ status: options.loginStatus });
            if (!user || given !== currentPassword) return route.fulfill({ status: 403 });
            signedInId = user.id;
            return route.fulfill({ status: 200, headers: { authentication: makeToken(user) }, body: "" });
        }

        const history = path.match(/^\/chats\/chat\/(\d+)\/messages$/);
        if (method === "GET" && history && historyFailures > 0) {
            historyFailures--;
            return route.fulfill({ status: 500 });
        }
        if (method === "GET" && history) {
            const params = new URL(request.url()).searchParams;
            const before = Number(params.get("before") ?? Infinity);
            const query = params.get("query");
            if (query) {
                const matches = (backend.chats.find(c => c.id === Number(history[1]))?.messages ?? [])
                    .filter(m => m.id < before && !m.deleted && m.type === "TEXT" && m.content.toLowerCase().includes(query.toLowerCase()))
                    .reverse();
                return json(route, matches.slice(0, Number(params.get("size") ?? 50)));
            }
            const size = Number(params.get("size") ?? 50);
            const chat = backend.chats.find(c => c.id === Number(history[1]));
            const older = (chat?.messages ?? []).filter(m => m.id < before);
            return json(route, older.slice(-size));
        }

        const reaction = path.match(/^\/message\/(\d+)\/reaction$/);
        if (reaction && (method === "PUT" || method === "DELETE")) {
            const message = backend.chats.flatMap(c => c.messages).find(m => m.id === Number(reaction[1]));
            if (!message) return route.fulfill({ status: 404 });
            const others = (message.reactions ?? [])
                .map(r => ({ ...r, userIds: r.userIds.filter(u => u !== ME.id) }))
                .filter(r => r.userIds.length > 0);
            if (method === "PUT") {
                const { emoji } = request.postDataJSON() as { emoji: string };
                backend.reacted.push({ id: message.id, emoji });
                const same = others.find(r => r.emoji === emoji);
                if (same) same.userIds.push(ME.id);
                else others.push({ emoji, userIds: [ME.id] });
            } else backend.reacted.push({ id: message.id, emoji: null });
            message.reactions = others;
            return json(route, message);
        }

        const single = path.match(/^\/message\/(\d+)$/);
        if (single && (method === "PATCH" || method === "DELETE")) {
            const id = Number(single[1]);
            const message = backend.chats.flatMap(c => c.messages).find(m => m.id === id);
            if (!message) return route.fulfill({ status: 404 });
            if (method === "PATCH") {
                const { textContent } = request.postDataJSON() as { textContent: string };
                backend.edited.push({ id, textContent });
                Object.assign(message, { content: textContent, editedAt: "2021-05-04T12:10:00" });
            } else {
                backend.deleted.push(id);
                Object.assign(message, { content: "", deleted: true });
            }
            return json(route, message);
        }

        /* ---- accounts */
        if (method === "POST" && path === "/users") {
            const body = request.postDataJSON() as { username: string; name: string; surname: string; password: string };
            record("POST /users", body);
            if (backend.users.some(u => u.username.toLowerCase() === body.username.toLowerCase())) {
                return json(route, { status: 409, error: "Conflict", message: "This username is taken" }, 409);
            }
            const user: User = { id: nextUserId++, username: body.username, name: body.name, surname: body.surname };
            backend.users.push(user);
            currentPassword = body.password;
            return json(route, user, 201);
        }
        if (method === "GET" && path === "/users/me") return json(route, me());
        if (method === "PATCH" && path === "/users/me") {
            const body = request.postDataJSON() as { name: string; surname: string };
            record("PATCH /users/me", body);
            Object.assign(backend.users.find(u => u.id === signedInId)!, body);
            return json(route, me());
        }
        if (method === "PUT" && path === "/users/me/password") {
            const body = request.postDataJSON() as { currentPassword: string; newPassword: string };
            record("PUT /users/me/password", body);
            if (body.currentPassword !== currentPassword) {
                return json(route, { status: 403, error: "Forbidden", message: "The current password is wrong" }, 403);
            }
            currentPassword = body.newPassword;
            return route.fulfill({ status: 204 });
        }
        if (path === "/users/me/avatar" && (method === "PUT" || method === "DELETE")) {
            avatarKey = method === "PUT" ? "avatar_1_new.png" : null;
            record(`${method} /users/me/avatar`, null);
            return json(route, me());
        }
        const avatar = path.match(/^\/users\/(\d+)\/avatar$/);
        if (method === "GET" && avatar) {
            return avatarKey && Number(avatar[1]) === ME.id
                ? route.fulfill({ status: 200, contentType: "image/png", body: PNG })
                : route.fulfill({ status: 404 });
        }
        if (method === "GET" && path === "/users/blocked") return json(route, backend.blocked);
        const block = path.match(/^\/users\/(\d+)\/block$/);
        if (block && (method === "PUT" || method === "DELETE")) {
            const id = Number(block[1]);
            record(`${method} /users/{id}/block`, id);
            backend.blocked = backend.blocked.filter(u => u.id !== id);
            if (method === "PUT") backend.blocked.push(backend.users.find(u => u.id === id)!);
            return route.fulfill({ status: 204 });
        }

        /* ---- chats: settings, groups */
        const chatPath = path.match(/^\/chats\/chat\/(\d+)(\/.*)?$/);
        if (chatPath && !chatPath[2]?.startsWith("/messages")) {
            const chat = chatOf(Number(chatPath[1]));
            const rest = chatPath[2] ?? "";
            if (!chat) return route.fulfill({ status: 404 });
            if (method === "GET" && rest === "") return json(route, withFlags(chat));
            if (method === "PATCH" && rest === "/settings") {
                const body = request.postDataJSON() as { archived?: boolean; muted?: boolean };
                record("PATCH /chats/chat/{id}/settings", body);
                Object.assign(chat, body);
                return json(route, withFlags(chat));
            }
            if (method === "PATCH" && rest === "") {
                const { name } = request.postDataJSON() as { name: string };
                record("PATCH /chats/chat/{id}", name);
                chat.name = name;
                return json(route, withFlags(chat));
            }
            if (method === "POST" && rest === "/members") {
                const { userIds } = request.postDataJSON() as { userIds: number[] };
                record("POST /chats/chat/{id}/members", userIds);
                chat.users.push(...userIds.map(id => backend.users.find(u => u.id === id)!));
                return json(route, withFlags(chat));
            }
            const member = rest.match(/^\/members\/(\d+)$/);
            if (method === "DELETE" && member) {
                record("DELETE /chats/chat/{id}/members/{userId}", Number(member[1]));
                chat.users = chat.users.filter(u => u.id !== Number(member[1]));
                return route.fulfill({ status: 200 });
            }
            const admin = rest.match(/^\/admins\/(\d+)$/);
            if (admin && (method === "PUT" || method === "DELETE")) {
                const id = Number(admin[1]);
                record(`${method} /chats/chat/{id}/admins/{userId}`, id);
                const others = (chat.adminIds ?? []).filter(a => a !== id);
                chat.adminIds = method === "PUT" ? [ ...others, id ] : others;
                return json(route, withFlags(chat));
            }
        }

        if (method === "GET" && /^\/chats\/\d+$/.test(path) && chatLoadFailures > 0) {
            chatLoadFailures--;
            return route.fulfill({ status: 500 });
        }
        if (method === "GET" && path.startsWith("/chats/")) {
            const withMessages = new URL(request.url()).searchParams.get("includeMessages") !== "false";
            const chats = backend.chats.map(withFlags);
            return json(route, withMessages ? chats : chats.map(c => ({ ...c, messages: [] })));
        }

        if (method === "GET" && path.startsWith("/user/")) {
            const query = decodeURIComponent(path.slice("/user/".length)).toLowerCase();
            return json(route, backend.users.filter(u => u.id !== signedInId &&
                `${u.name} ${u.surname} ${u.username}`.toLowerCase().includes(query)));
        }

        if (method === "POST" && path === "/chats") {
            const { userIds, name } = request.postDataJSON() as { userIds: number[]; name?: string };
            backend.posted.chats.push(name ? { userIds, name } : { userIds });
            const group = !!name || userIds.length > 2;
            // like the server: a 1:1 chat of two people exists only once
            const existing = group ? undefined : backend.chats.find(c => !c.group && userIds.every(id => c.users.some(u => u.id === id)));
            if (existing) return json(route, withFlags(existing));
            const chat: Chat = {
                id: nextChatId++,
                users: userIds.map(id => backend.users.find(u => u.id === id)!),
                messages: [],
                status: userIds.map(userId => ({ id: { chatId: nextChatId - 1, userId }, messageId: null })),
                group,
                name: name ?? null,
                adminIds: group ? [ userIds[0] ] : [],
            };
            backend.chats.push(chat);
            return json(route, withFlags(chat));
        }

        if (method === "PUT" && path === "/status") {
            backend.posted.statuses.push(request.postDataJSON());
            return route.fulfill({ status: 200 });
        }

        if (method === "GET" && path === "/presence") return json(route, options.presence ?? []);

        if (method === "POST" && path === "/message") {
            /* multipart body: pull the plain text fields out of it */
            const body = request.postData() ?? "";
            const fields: Record<string, string> = {};
            for (const m of body.matchAll(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n--/g)) fields[m[1]] = m[2];
            backend.posted.messages.push(fields);
            if (failuresLeft > 0) {
                failuresLeft--;
                return route.fulfill({ status: 500 });
            }
            const created = makeMessage(nextMessageId++, Number(fields.chatId), ME.id, fields.textContent ?? "", "2021-05-04T12:05:00");
            if (fields.replyToId) created.replyToId = Number(fields.replyToId);
            return json(route, created);
        }

        return route.fulfill({ status: 404 });
    });

    return backend;
};

/* puts a valid session into localStorage before the app boots */
export const signInAs = async (page: Page, user: User = ME) => {
    const token = makeToken(user);
    await page.addInitScript(t => localStorage.setItem("token", t), token);
};
