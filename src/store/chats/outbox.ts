import type { AppDispatch } from "../index";
import type { MessageType, OutboxItem } from "../../types";
import ChatAPI from "../ChatAPI";
import { addMessage, outboxAdd, outboxRemove, outboxStatus } from "./chatsSlice";

/* files can't live in the (serializable) store */
const files = new Map<string, File>();
let counter = 0;

export const getOutboxFile = (localId: string): File | undefined => files.get(localId);

const send = (dispatch: AppDispatch, item: OutboxItem): Promise<void> => {
    const content = item.type === "FILE" ? files.get(item.localId) : item.content;
    if (!content) {
        dispatch(outboxRemove(item.localId));
        return Promise.resolve();
    }
    return ChatAPI.postMessage(item.chatId, item.type, content, item.replyToId)
        .then(res => {
            files.delete(item.localId);
            dispatch(outboxRemove(item.localId));
            dispatch(addMessage(res.data)); // the websocket usually delivers it too, duplicates are ignored
        })
        .catch(e => {
            console.error("Failed to send message:", e);
            dispatch(outboxStatus({ localId: item.localId, status: "failed" }));
        });
};

/* shows the message at once and sends it in the background */
export const sendMessage = (dispatch: AppDispatch, chatId: number, type: MessageType, content: string | File, replyToId?: number) => {
    const item: OutboxItem = {
        localId: `local-${Date.now()}-${counter++}`,
        chatId,
        type,
        content: typeof content === "string" ? content : content.name,
        status: "sending",
        replyToId
    };
    if (typeof content !== "string") files.set(item.localId, content);
    dispatch(outboxAdd(item));
    return send(dispatch, item);
};

export const retryMessage = (dispatch: AppDispatch, item: OutboxItem) => {
    dispatch(outboxStatus({ localId: item.localId, status: "sending" }));
    return send(dispatch, item);
};

export const discardMessage = (dispatch: AppDispatch, localId: string) => {
    files.delete(localId);
    dispatch(outboxRemove(localId));
};
