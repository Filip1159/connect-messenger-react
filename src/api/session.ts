import axios from "axios";
import type { AuthDetails } from "../types";
import { http, setSessionLostHandler } from "./http";
import { clearToken, decodeToken, getToken, setToken } from "./token";

export type SignInResult =
    | { success: true }
    | { success: false; reason: "INVALID_TOKEN" | "BAD_CREDENTIALS" | "UNAVAILABLE" };

let authDetails: AuthDetails | null = null;
const signOutListeners = new Set<() => void>();

/* returns a function removing the listener */
export const onSignOut = (listener: () => void) => {
    signOutListeners.add(listener);
    return () => signOutListeners.delete(listener);
};

export const signIn = async (username: string, password: string): Promise<SignInResult> => {
    try {
        const res = await http.post("/login", { username, password });
        const token: string | undefined = res.headers.authentication;
        const details = token ? decodeToken(token) : null;
        if (!token || !details) return { success: false, reason: "INVALID_TOKEN" };
        setToken(token);
        authDetails = details;
        return { success: true };
    } catch (e) {
        // a response below 500 means the server was reached and rejected the credentials
        const rejected = axios.isAxiosError(e) && !!e.response && e.response.status < 500;
        return { success: false, reason: rejected ? "BAD_CREDENTIALS" : "UNAVAILABLE" };
    }
};

export const signOut = () => {
    clearToken();
    authDetails = null;
    signOutListeners.forEach(listener => listener());
};

/* validates the stored token on every call, so an expired token is never treated as valid */
export const isSignedIn = (): boolean => {
    const token = getToken();
    const details = token ? decodeToken(token) : null;
    if (!details) {
        if (token || authDetails) signOut();
        return false;
    }
    authDetails = details;
    return true;
};

/* the id of the signed-in user, if any (no token check) */
export const currentUserId = (): number | undefined => authDetails?.id;

export const getAuthDetails = (): AuthDetails => {
    if (!isSignedIn()) throw new Error("User isn't signed in!");
    return authDetails as AuthDetails;
};

setSessionLostHandler(signOut);
