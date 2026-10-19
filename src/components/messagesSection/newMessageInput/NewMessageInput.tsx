import { useLayoutEffect, useRef, useState } from "react";
import type { ClipboardEvent, DragEvent, FormEvent, KeyboardEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { sendMessage } from "../../../store/chats/outbox";
import { removeBlocked, selectActiveChat, selectBlocked, selectReplyTarget, setReplyTo } from "../../../store/chats/chatsSlice";
import { getRecipient, isGroup } from "../../../store/chats/chatUtils";
import "./NewMessageInput.scss";
import strings from "../../../strings";
import ChatAPI from "../../../store/ChatAPI";
import { selectAuthDetails } from "../../../store/auth/authSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFaceSmile } from "@fortawesome/free-solid-svg-icons";
import { EmojiPicker } from "../../common/EmojiPicker";

/* at most one typing notification per this many ms */
const TYPING_THROTTLE = 2500;
const MAX_TEXT_LENGTH = 1000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // the backend refuses bigger uploads
const IMAGE_TYPES = [ "image/jpeg", "image/png", "image/gif" ];
const MAX_INPUT_HEIGHT = 160;

/* returns the reason why the file can't be sent, or null */
const validateImage = (file: File): string | null => {
    if (!IMAGE_TYPES.includes(file.type)) return strings.messageInput.notAnImage;
    if (file.size > MAX_FILE_SIZE) return strings.messageInput.tooLarge;
    return null;
};

const NewMessageInput = () => {
    const dispatch = useAppDispatch();
    const lastTypingSent = useRef(0);
    const textarea = useRef<HTMLTextAreaElement>(null);
    const [ textContent, setTextContent ] = useState("");
    const [ attachment, setAttachment ] = useState<File | null>(null);
    const [ preview, setPreview ] = useState("");
    const [ error, setError ] = useState("");
    const [ emojiOpen, setEmojiOpen ] = useState(false);
    const [ dragging, setDragging ] = useState(false);

    const activeChat = useAppSelector(selectActiveChat);
    const replyTarget = useAppSelector(selectReplyTarget);
    const authDetails = useAppSelector(selectAuthDetails);
    const blocked = useAppSelector(selectBlocked);
    const replyAuthor = replyTarget && (replyTarget.userId === authDetails?.id
        ? strings.chats.you
        : activeChat?.users.find(u => u.id === replyTarget.userId)?.name ?? "");

    /* the field grows with its content, up to a limit */
    useLayoutEffect(() => {
        const el = textarea.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
    }, [ textContent ]);

    const attach = (file: File) => {
        const problem = validateImage(file);
        setError(problem ?? "");
        if (problem) return;
        setAttachment(file);
        const reader = new FileReader();
        reader.onload = () => { if (typeof reader.result === "string") setPreview(reader.result); };
        reader.readAsDataURL(file);
    };

    const removeAttachment = () => {
        setAttachment(null);
        setPreview("");
        setError("");
    };

    const post = () => {
        const text = textContent.trim() ? textContent : "";
        if (!activeChat || (!text && !attachment)) return;

        // the messages appear at once; a failure is shown on them, with a retry. The image goes first.
        const image = attachment;
        const chatId = activeChat.id;
        const replyToId = replyTarget?.id;
        if (image) {
            const sending = sendMessage(dispatch, chatId, "FILE", image, replyToId);
            if (text) void sending.then(() => sendMessage(dispatch, chatId, "TEXT", text));
        } else sendMessage(dispatch, chatId, "TEXT", text, replyToId);
        dispatch(setReplyTo(null));

        setTextContent("");
        removeAttachment();
        setEmojiOpen(false);
        lastTypingSent.current = 0;
    };

    const handlePost = (e: FormEvent) => {
        e.preventDefault();
        post();
    };

    /* Enter sends, Shift+Enter starts a new line */
    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            post();
        } else if (e.key === "Escape") {
            setEmojiOpen(false);
            if (replyTarget) dispatch(setReplyTo(null));
        }
    };

    const notifyTyping = (chatId: number) => {
        const now = Date.now();
        if (now - lastTypingSent.current < TYPING_THROTTLE) return;
        lastTypingSent.current = now;
        ChatAPI.sendTyping(chatId);
    };

    const insertEmoji = (emoji: string) => {
        const el = textarea.current;
        const start = el?.selectionStart ?? textContent.length;
        const end = el?.selectionEnd ?? textContent.length;
        const next = textContent.slice(0, start) + emoji + textContent.slice(end);
        if (next.length > MAX_TEXT_LENGTH) return;
        setTextContent(next);
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(start + emoji.length, start + emoji.length);
        });
    };

    const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const file = Array.from(e.clipboardData.files).find(f => f.type.startsWith("image/"));
        if (!file) return; // plain text is pasted as usual
        e.preventDefault();
        attach(file);
    };

    const handleDrop = (e: DragEvent<HTMLFormElement>) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) attach(file);
    };

    /* in a 1:1 chat with somebody I blocked there is nobody to write to */
    const blockedPerson = activeChat && !isGroup(activeChat)
        ? blocked.find(u => u.id === getRecipient(activeChat, authDetails?.id)?.id)
        : undefined;
    if (blockedPerson) {
        return (
            <div className="newMessageInput newMessageInput--blocked" role="status">
                <span>{strings.chatOptions.blockedInput}</span>
                <button type="button" onClick={() => {
                    ChatAPI.unblockUser(blockedPerson.id)
                        .then(() => dispatch(removeBlocked(blockedPerson.id)))
                        .catch(e => console.error("Failed to unblock:", e));
                }}>{strings.chatOptions.unblock}</button>
            </div>
        );
    }

    return (
        <form
            className={`newMessageInput${dragging ? " newMessageInput--dragging" : ""}`}
            onSubmit={handlePost}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={e => { if (e.currentTarget === e.target) setDragging(false); }}
            onDrop={handleDrop}
        >
            {replyTarget && (
                <div className="newMessageInput__reply">
                    <span className="newMessageInput__reply__text">
                        {strings.message.replyingTo} <strong>{replyAuthor}</strong>:{" "}
                        {replyTarget.type === "FILE" ? strings.chats.photo : replyTarget.content}
                    </span>
                    <button type="button" aria-label={strings.message.cancelReply} onClick={() => dispatch(setReplyTo(null))}>×</button>
                </div>
            )}
            {(attachment || error) && (
                <div className="newMessageInput__attachment">
                    {attachment && <>
                        <img src={preview || undefined} alt="" className="newMessageInput__attachment__img"/>
                        <span className="newMessageInput__attachment__name">{attachment.name}</span>
                        <button type="button" aria-label={strings.messageInput.removeAttachment} onClick={removeAttachment}>×</button>
                    </>}
                    {error && <span role="alert" className="newMessageInput__attachment__error">{error}</span>}
                </div>
            )}
            <div className="newMessageInput__row">
                <label htmlFor="message_img" className="newMessageInput__fileInputLabel">
                    <img src="/images/image_icon.png" alt={strings.messageInput.attachImage} className="newMessageInput__fileInputLabel__img"/>
                </label>
                <input id="message_img" name="message_img" type="file" className="newMessageInput__fileInput"
                       accept=".jpg, .jpeg, .png, .gif"
                       onChange={e => {
                           const file = e.target.files?.[0]
                           e.target.value = ""  // the same file can be chosen again
                           if (file) attach(file)  // no file: the dialog was cancelled
                       }}
                />
                <button type="button" className="newMessageInput__emojiBtn" aria-label={strings.messageInput.emoji}
                        aria-expanded={emojiOpen} onClick={() => setEmojiOpen(open => !open)}>
                    <FontAwesomeIcon icon={faFaceSmile} />
                </button>
                {emojiOpen && <EmojiPicker onPick={insertEmoji}/>}
                <textarea id="message-input" ref={textarea} rows={1} value={textContent} className="newMessageInput__input"
                          aria-label={strings.messageInput.messageText} maxLength={MAX_TEXT_LENGTH}
                          onKeyDown={handleKeyDown}
                          onPaste={handlePaste}
                          onChange={e => {
                              setTextContent(e.target.value)
                              if (activeChat && e.target.value) notifyTyping(activeChat.id)
                          }}/>
                <input type="image" className="newMessageInput__btn" src="/images/send.png" alt={strings.messageInput.send}/>
            </div>
        </form>
    );
}

export default NewMessageInput;
