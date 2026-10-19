import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosRequestConfig } from "axios";
import { http, NotSignedInError, setSessionLostHandler } from "./http";

const base64 = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, "");
const tokenExpiring = (inSeconds: number) =>
    `${base64({ alg: "none" })}.${base64({ id: 1, exp: Math.floor(Date.now() / 1000) + inSeconds })}.x`;

const sent: AxiosRequestConfig[] = [];
let status = 200;
const lost = vi.fn();

describe("http", () => {
    beforeEach(() => {
        localStorage.clear();
        sent.length = 0;
        status = 200;
        lost.mockClear();
        setSessionLostHandler(lost);
        // no network: the "server" answers with the chosen status
        http.defaults.adapter = async config => {
            sent.push(config);
            const response = { data: {}, status, statusText: "", headers: {}, config };
            if (status >= 400) throw Object.assign(new Error("failed"), { isAxiosError: true, response, config });
            return response;
        };
    });

    it("sends the raw token (no Bearer scheme)", async () => {
        const token = tokenExpiring(60);
        localStorage.setItem("token", token);
        await http.get("/chats/1");
        expect(sent[0].headers!.Authorization).toBe(token);
    });

    it("doesn't send anything without a session, and ends it", async () => {
        await expect(http.get("/chats/1")).rejects.toBeInstanceOf(NotSignedInError);
        expect(sent).toHaveLength(0);
        expect(lost).toHaveBeenCalledTimes(1);
    });

    it("doesn't send an expired token", async () => {
        localStorage.setItem("token", tokenExpiring(-10));
        await expect(http.get("/chats/1")).rejects.toBeInstanceOf(NotSignedInError);
        expect(sent).toHaveLength(0);
        expect(lost).toHaveBeenCalled();
    });

    it("lets signing in and registering through without a session", async () => {
        await http.post("/login", {});
        await http.post("/users", {});
        expect(sent).toHaveLength(2);
        expect(lost).not.toHaveBeenCalled();
        await expect(http.get("/users/me")).rejects.toBeInstanceOf(NotSignedInError);
    });

    it("ends the session when the backend answers 401, except for a bad login", async () => {
        localStorage.setItem("token", tokenExpiring(60));
        status = 401;
        await expect(http.get("/chats/1")).rejects.toBeDefined();
        expect(lost).toHaveBeenCalledTimes(1);
        await expect(http.post("/login", {})).rejects.toBeDefined();
        expect(lost).toHaveBeenCalledTimes(1);
    });

    it("keeps the session on other errors", async () => {
        localStorage.setItem("token", tokenExpiring(60));
        status = 500;
        await expect(http.get("/chats/1")).rejects.toBeDefined();
        expect(lost).not.toHaveBeenCalled();
    });
});
