import axios from "axios";

/* the message the backend sent with an error response, else the fallback */
export const errorMessage = (error: unknown, fallback: string): string => {
    if (axios.isAxiosError(error)) {
        const message: unknown = error.response?.data?.message;
        if (typeof message === "string" && message.trim() !== "" && (error.response?.status ?? 500) < 500) return message;
    }
    return fallback;
};
