import { useEffect, useState } from "react";
import { useAppDispatch } from "../../../store/hooks";
import { discardMessage, getOutboxFile, retryMessage } from "../../../store/chats/outbox";
import strings from "../../../strings";
import type { OutboxItem } from "../../../types";
import "../message/Message.scss";
import "./PendingMessage.scss";

/* my message that is being sent, or couldn't be sent and can be retried */
export const PendingMessage = ({ item }: { item: OutboxItem }) => {
    const dispatch = useAppDispatch();
    const [ preview, setPreview ] = useState("");

    useEffect(() => {
        const file = item.type === "FILE" ? getOutboxFile(item.localId) : undefined;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { if (typeof reader.result === "string") setPreview(reader.result); };
        reader.readAsDataURL(file);
        return () => { reader.onload = null; };
    }, [ item.localId, item.type ]);

    const failed = item.status === "failed";
    return (
        <div
            className={`singleMessage singleMessage--myMsg pendingMessage${failed ? " pendingMessage--failed" : ""}${item.type === "FILE" ? " singleMessage--img" : ""}`}
            data-testid="pending-message"
        >
            {item.type === "FILE"
                ? <img src={preview || undefined} alt="" className="singleMessage__img" />
                : item.content}
            <div className="pendingMessage__state">
                {failed ? <>
                    <span role="alert">{strings.messageStatus.failed}</span>
                    <button type="button" onClick={() => retryMessage(dispatch, item)}>{strings.messageStatus.retry}</button>
                    <button type="button" onClick={() => discardMessage(dispatch, item.localId)}>{strings.messageStatus.discard}</button>
                </> : <span>{strings.messageStatus.sending}</span>}
            </div>
        </div>
    );
};
