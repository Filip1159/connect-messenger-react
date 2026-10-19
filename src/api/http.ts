import axios from "axios";
import { decodeToken, getToken, setToken } from "./token";

export const baseURL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080`;

/* what to do when the session is over (expired token, 401 from the backend); set by session.ts */
let onSessionLost: () => void = () => {};
export const setSessionLostHandler = (handler: () => void) => {
    onSessionLost = handler;
};

export class NotSignedInError extends Error {
    constructor() {
        super("User isn't signed in!");
    }
}

/* requests that are made without a session: signing in and registering */
const isPublic = (method: string | undefined, url: string | undefined) =>
    url === "/login" || (url === "/users" && method?.toLowerCase() === "post");

/* the REST API is versioned; the websocket (socket.ts) lives at the bare baseURL */
export const http = axios.create({ baseURL: `${baseURL}/api/v1` });

/* the stored token is the complete header value the backend issued ("Bearer <jwt>") */
http.interceptors.request.use(config => {
    if (isPublic(config.method, config.url)) return config;
    const token = getToken();
    // an expired or missing token is never sent: the session is over before the request is
    if (!token || !decodeToken(token)) {
        onSessionLost();
        throw new NotSignedInError();
    }
    config.headers.Authorization = token;
    return config;
});

/* sliding expiry: the backend sends a fresh token (in the `Authentication` header) once the current one is half used up.
   Only while still signed in - a response that arrives after signing out must not bring the session back. */
http.interceptors.response.use(response => {
    const renewed = response.headers?.authentication;
    if (typeof renewed === "string" && renewed.startsWith("Bearer ") && response.config.url !== "/login" && getToken()) {
        setToken(renewed);
    }
    return response;
}, error => {
    // the backend rejected our token (e.g. revoked) - drop the session
    if (error.response?.status === 401 && error.config?.url !== "/login") onSessionLost();
    return Promise.reject(error);
});
