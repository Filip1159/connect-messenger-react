import { jwtDecode } from "jwt-decode";
import type { AuthDetails } from "../types";

const TOKEN_KEY = "token";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/* the claims of a token that is well formed and not expired, else null */
export const decodeToken = (token: string): AuthDetails | null => {
    try {
        const details = jwtDecode<AuthDetails>(token);
        if (typeof details.exp !== "number" || Date.now() >= details.exp * 1000) return null;
        return details;
    } catch {
        return null;
    }
};
