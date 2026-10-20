/* everything the backend pushes over the websocket is { type, payload }; the room it was sent to says who it is for */
export interface ServerEvent<T = unknown> {
    type: string;
    payload: T;
}

/* /topic/messages/{chatId}: the payload is the whole message (with its reactions) */
export const MESSAGE_EVENTS = [ "message.created", "message.edited", "message.deleted", "message.reacted" ] as const;
/* /topic/status/{chatId}: what somebody has read */
export const STATUS_UPDATED = "status.updated";
/* /topic/typing/{chatId} */
export const TYPING = "typing";
/* /topic/presence/{userId}: online / last seen */
export const PRESENCE_CHANGED = "presence.changed";
/* /topic/new-chats/{userId}: a chat of mine was created or changed; the payload is the chat as I see it */
export const CHAT_CHANGED = "chat.changed";
/* /topic/removed-chats/{userId}: the payload is { chatId } */
export const CHAT_REMOVED = "chat.removed";

/*
 * The event of a message if it is one of the `accepted` types. An unknown type is skipped without a fuss (the
 * backend may know more types than this client), something that is not an envelope is logged.
 */
export const parseEvent = <T>(incoming: unknown, accepted: readonly string[]): ServerEvent<T> | null => {
    try {
        const event = incoming as Partial<ServerEvent<T>> | null;
        if (!event || typeof event !== "object" || typeof event.type !== "string" || event.payload === undefined) throw new Error("not an event");
        return accepted.includes(event.type) ? event as ServerEvent<T> : null;
    } catch (e) {
        console.error("Malformed websocket message:", e);
        return null;
    }
};
