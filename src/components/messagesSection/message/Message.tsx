import React, { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Message as MessageModel } from "../../../types";
import type DateFormatter from "../../../DateFormatter";
import * as messagesApi from "../../../api/rest/messages";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { addMessage, selectActiveChat, setReplyTo } from "../../../store/chats/chatsSlice";
import { selectAuthDetails } from "../../../store/auth/authSlice";
import { REACTIONS, ReactionIcon, reactionLabel } from "../../../reactions";
import strings from "../../../strings";
import { Linkified } from "../../common/Linkified";
import { Lightbox } from "../../common/Lightbox";
import "./Message.scss"

interface MessageProps {
    message: MessageModel;
    modifier: string;
    dateFormatter: DateFormatter;
    /* my own messages can be edited and deleted */
    mine?: boolean;
    /* briefly marks the message the reader jumped to (search) */
    highlighted?: boolean;
    /* in a group: who wrote this message (shown above the first of a series) */
    author?: string;
    /* shows another message of the chat (the one this message replies to) */
    onJump?: (messageId: number) => void;
}

/* the picture of a FILE message: placeholder while loading, an error state, click for the full size */
const MessageImage = ({ fileName }: { fileName: string }) => {
    const [ imageData, setImageData ] = useState("");
    const [ failed, setFailed ] = useState(false);
    const [ open, setOpen ] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        let objectUrl: string | null = null;
        messagesApi.loadFile(fileName, controller.signal)
            .then(blob => {
                objectUrl = URL.createObjectURL(blob);
                setImageData(objectUrl);
            })
            .catch(e => {
                if (controller.signal.aborted) return;
                console.error("Failed to load image:", e);
                setFailed(true);
            });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [ fileName ]);

    if (failed) return <div className="singleMessage__imgState" role="alert">{strings.image.failed}</div>;
    if (!imageData) return <div className="singleMessage__imgState" role="status">{strings.image.loading}</div>;
    return (
        <>
            <button type="button" className="singleMessage__imgButton" aria-label={strings.image.open} onClick={() => setOpen(true)}>
                <img src={imageData} alt="" className="singleMessage__img" />
            </button>
            {open && <Lightbox src={imageData} onClose={() => setOpen(false)} />}
        </>
    );
};

/* what the replied message says, in a few words */
const quoteText = (m: MessageModel): string => {
    if (m.deleted) return strings.message.deleted;
    if (m.type === "FILE") return strings.chats.photo;
    return m.content.length > 80 ? `${m.content.substring(0, 80)}...` : m.content;
};

/* the message this one answers; it is fetched when it is older than the loaded history */
const ReplyQuote = ({ replyToId, onJump }: { replyToId: number; onJump?: (id: number) => void }) => {
    const chat = useAppSelector(selectActiveChat);
    const authDetails = useAppSelector(selectAuthDetails);
    const loaded = chat?.messages.find(m => m.id === replyToId);
    const [ fetched, setFetched ] = useState<MessageModel | null>(null);
    const [ missing, setMissing ] = useState(false);

    useEffect(() => {
        if (loaded) return;
        const controller = new AbortController();
        messagesApi.loadMessage(replyToId, controller.signal)
            .then(setFetched)
            .catch(() => { if (!controller.signal.aborted) setMissing(true); });
        return () => controller.abort();
    }, [ loaded, replyToId ]);

    const original = loaded ?? fetched;
    const author = original && (original.userId === authDetails?.id
        ? strings.chats.you
        : chat?.users.find(u => u.id === original.userId)?.name ?? "");
    return (
        <button type="button" className="singleMessage__quote" aria-label={strings.message.goToOriginal} onClick={() => onJump?.(replyToId)}>
            {original
                ? <><strong>{author}</strong> {quoteText(original)}</>
                : <em>{missing ? strings.message.originalUnavailable : strings.image.loading}</em>}
        </button>
    );
};

/* the reactions on the bottom edge of a message: informative only, except my own, which a click takes back */
const ReactionChips = ({ message }: { message: MessageModel }) => {
    const dispatch = useAppDispatch();
    const myId = useAppSelector(selectAuthDetails)?.id;
    const [ busy, setBusy ] = useState(false);
    if (!message.reactions?.length) return null;

    const takeBack = () => {
        setBusy(true);
        messagesApi.removeReaction(message.id)
            .then(updated => dispatch(addMessage(updated)))
            .catch(e => console.error("Failed to remove the reaction:", e))
            .finally(() => setBusy(false));
    };

    return (
        <div className="singleMessage__reactions">
            {message.reactions.map(({ emoji, userIds }) => {
                const content = <><ReactionIcon emoji={emoji} /><span>{userIds.length}</span></>;
                const label = `${reactionLabel(emoji)} ${userIds.length}`;
                return userIds.includes(myId ?? -1)
                    ? <button key={emoji} type="button" disabled={busy} aria-pressed="true" aria-label={label}
                              className="singleMessage__reaction singleMessage__reaction--mine" onClick={takeBack}>{content}</button>
                    : <span key={emoji} role="img" aria-label={label} className="singleMessage__reaction">{content}</span>;
            })}
        </div>
    );
};

/* reply and react: available on every message */
const ReactAndReply = ({ message }: { message: MessageModel }) => {
    const dispatch = useAppDispatch();
    const [ picking, setPicking ] = useState(false);

    const react = (emoji: string) => {
        setPicking(false);
        messagesApi.react(message.id, emoji)
            .then(updated => dispatch(addMessage(updated)))
            .catch(e => console.error("Failed to react:", e));
    };

    return (
        <>
            {picking
                ? REACTIONS.map(({ emoji, label }) => (
                    <button key={emoji} type="button" aria-label={`${strings.message.react} ${label}`} onClick={() => react(emoji)}>
                        <ReactionIcon emoji={emoji} />
                    </button>))
                : <button type="button" onClick={() => setPicking(true)}>{strings.message.react}</button>}
            <button type="button" onClick={() => dispatch(setReplyTo(message.id))}>{strings.message.reply}</button>
        </>
    );
};

/* my text message: shows the actions, turns into an editor on "Edit" */
const useOwnMessageActions = (message: MessageModel) => {
    const dispatch = useAppDispatch();
    const [ editing, setEditing ] = useState(false);
    const [ draft, setDraft ] = useState(message.content);
    const [ confirmingDelete, setConfirmingDelete ] = useState(false);
    const [ busy, setBusy ] = useState(false);
    const [ error, setError ] = useState("");

    const run = (request: Promise<MessageModel>, failure: string, onDone: () => void) => {
        setBusy(true);
        setError("");
        request
            .then(updated => {
                dispatch(addMessage(updated));
                onDone();
            })
            .catch(e => {
                console.error(failure, e);
                setError(failure);
            })
            .finally(() => setBusy(false));
    };

    const startEdit = () => {
        setDraft(message.content);
        setError("");
        setEditing(true);
    };
    const cancelEdit = () => {
        setEditing(false);
        setError("");
    };
    const saveEdit = () => {
        const text = draft.trim() === "" ? "" : draft;
        if (!text || busy) return;
        if (text === message.content) return cancelEdit();
        run(messagesApi.editMessage(message.id, text), strings.message.editFailed, () => setEditing(false));
    };
    const remove = () => run(messagesApi.deleteMessage(message.id), strings.message.deleteFailed, () => setConfirmingDelete(false));

    const onEditorKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Escape") cancelEdit();
        else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            saveEdit();
        }
    };

    return {
        editing, draft, setDraft, confirmingDelete, setConfirmingDelete, busy, error,
        startEdit, cancelEdit, saveEdit, remove, onEditorKey
    };
};

export const Message = React.forwardRef<HTMLDivElement, MessageProps>(function Message({message, modifier, dateFormatter, mine = false, highlighted = false, author, onJump}, ref) {
    const actions = useOwnMessageActions(message);
    const deleted = message.deleted === true;
    const classes = `singleMessage${modifier}${highlighted ? " singleMessage--highlighted" : ""}${message.reactions?.length ? " singleMessage--reacted" : ""}`;

    const toolbar = (editable: boolean) => (
        <div className="singleMessage__actions" role="group" aria-label={strings.message.actions}>
            <ReactAndReply message={message} />
            {mine && editable && <button type="button" onClick={actions.startEdit}>{strings.message.edit}</button>}
            {mine && <DeleteButtons actions={actions} />}
        </div>
    );
    const quote = message.replyToId != null && <ReplyQuote replyToId={message.replyToId} onJump={onJump} />;

    let body;
    if (deleted) {
        body = <div ref={ref} id={`messageId${message.id}`} className={`${classes} singleMessage--deleted`}>{strings.message.deleted}</div>;
    } else if (message.type === "FILE") {
        body = (
            <div ref={ref} id={`messageId${message.id}`} className={`${classes} singleMessage--img`}>
                {quote}
                <MessageImage fileName={message.content} />
                <ReactionChips message={message} />
                {toolbar(false)}
            </div>
        );
    } else if (actions.editing) {
        body = (
            <div ref={ref} id={`messageId${message.id}`} className={`${classes} singleMessage--editing`}>
                <textarea
                    className="singleMessage__editor"
                    aria-label={strings.message.edit}
                    value={actions.draft}
                    maxLength={1000}
                    autoFocus
                    rows={Math.min(8, actions.draft.split("\n").length)}
                    onChange={e => actions.setDraft(e.target.value)}
                    onKeyDown={actions.onEditorKey}
                />
                <div className="singleMessage__editButtons">
                    <button type="button" disabled={actions.busy || !actions.draft.trim()} onClick={actions.saveEdit}>{strings.message.save}</button>
                    <button type="button" onClick={actions.cancelEdit}>{strings.message.cancel}</button>
                </div>
                {actions.error && <div role="alert" className="singleMessage__error">{actions.error}</div>}
            </div>
        );
    } else {
        body = (
            <div ref={ref} id={`messageId${message.id}`} className={classes} tabIndex={0}>
                {quote}
                <Linkified text={message.content} />
                {message.editedAt && <span className="singleMessage__edited"> ({strings.message.edited})</span>}
                <ReactionChips message={message} />
                <div className="singleMessage__tooltip">{dateFormatter.currentToPretty()}</div>
                {toolbar(true)}
            </div>
        );
    }

    return (
        <>
            {!dateFormatter.is5MinDiffBefore() &&
                <div className="singleMessage__time">
                    {dateFormatter.displayDayIfDifferent() + dateFormatter.currentToHourMinute()}
                </div>}
            {author && <div className="singleMessage__author">{author}</div>}
            {body}
        </>
    );
});

type Actions = ReturnType<typeof useOwnMessageActions>;

/* "Delete", then a confirmation */
const DeleteButtons = ({ actions }: { actions: Actions }) => actions.confirmingDelete ? (
    <>
        <span>{strings.message.deleteConfirm}</span>
        <button type="button" disabled={actions.busy} onClick={actions.remove}>{strings.message.yes}</button>
        <button type="button" onClick={() => actions.setConfirmingDelete(false)}>{strings.message.no}</button>
        {actions.error && <span role="alert">{actions.error}</span>}
    </>
) : (
    <button type="button" onClick={() => actions.setConfirmingDelete(true)}>{strings.message.delete}</button>
);
