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
    /* every request the app made to a mocked endpoint, as "METHOD /path" */
    requests: string[];
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
}

const json = (route: Route, data: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });

/* replaces the Spring backend: REST endpoints are answered from memory, the websocket is refused */
export const mockBackend = async (page: Page, options: BackendOptions = {}): Promise<Backend> => {
    const backend: Backend = {
        chats: options.chats ?? [annaChat()],
        users: options.users ?? [ME, ANNA, PIOTR],
        requests: [],
        posted: { messages: [], statuses: [], chats: [] },
    };
    const password = options.password ?? "secret";
    let failuresLeft = options.failMessagePosts ?? 0;
    let nextMessageId = 1000;

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
            if (!user || given !== password) return route.fulfill({ status: 403 });
            return route.fulfill({ status: 200, headers: { authentication: makeToken(user) }, body: "" });
        }

        const history = path.match(/^\/chats\/chat\/(\d+)\/messages$/);
        if (method === "GET" && history) {
            const params = new URL(request.url()).searchParams;
            const before = Number(params.get("before") ?? Infinity);
            const size = Number(params.get("size") ?? 50);
            const chat = backend.chats.find(c => c.id === Number(history[1]));
            const older = (chat?.messages ?? []).filter(m => m.id < before);
            return json(route, older.slice(-size));
        }

        if (method === "GET" && path.startsWith("/chats/")) {
            const withMessages = new URL(request.url()).searchParams.get("includeMessages") !== "false";
            return json(route, withMessages ? backend.chats : backend.chats.map(c => ({ ...c, messages: [] })));
        }

        if (method === "GET" && path.startsWith("/user/")) {
            const query = decodeURIComponent(path.slice("/user/".length)).toLowerCase();
            return json(route, backend.users.filter(u =>
                `${u.name} ${u.surname} ${u.username}`.toLowerCase().includes(query)));
        }

        if (method === "POST" && path === "/chats") {
            const { userIds } = request.postDataJSON() as { userIds: number[] };
            backend.posted.chats.push({ userIds });
            const chat: Chat = {
                id: 20,
                users: userIds.map(id => backend.users.find(u => u.id === id)!),
                messages: [],
                status: userIds.map(userId => ({ id: { chatId: 20, userId }, messageId: null })),
            };
            return json(route, chat);
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
            for (const m of body.matchAll(/name="([^"]+)"\r\n\r\n([^\r]*)\r\n/g)) fields[m[1]] = m[2];
            backend.posted.messages.push(fields);
            if (failuresLeft > 0) {
                failuresLeft--;
                return route.fulfill({ status: 500 });
            }
            return json(route, makeMessage(nextMessageId++, Number(fields.chatId), ME.id, fields.textContent ?? "", "2021-05-04T12:05:00"));
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
