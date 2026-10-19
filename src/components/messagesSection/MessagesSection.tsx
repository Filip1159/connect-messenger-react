import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import { useStore } from "react-redux";
import type { RootState } from "../../store";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {selectAuthDetails} from "../../store/auth/authSlice";
import {markRead, prependMessages, selectActiveChat, selectOutbox} from "../../store/chats/chatsSlice";
import DateFormatter from "../../DateFormatter";
import "./MessagesSection.scss";
import NewMessageInput from "./newMessageInput/NewMessageInput";
import useLastMessage from "./hooks/useLastMessage";
import usePageVisible from "./hooks/usePageVisible";
import SeenAvatarsPanel, { type Bounds } from "./seenAvatarPanel/SeenAvatarsPanel";
import fall from "./seenAvatarPanel/FallingAvatar";
import strings from "../../strings";
import ChatAPI, { PAGE_SIZE } from "../../store/ChatAPI";
import { Message } from "./message/Message";
import { ConversationStatus } from "./conversationStatus/ConversationStatus";
import { PendingMessage } from "./pendingMessage/PendingMessage";
import { MessageSearch } from "./messageSearch/MessageSearch";
import { isGroup } from "../../store/chats/chatUtils";
import { selectChatsStatus, selectFocusRequest } from "../../store/ui/uiSlice";

/* how many pages of history are loaded at most to reach a message found by the search */
const MAX_JUMP_PAGES = 40;
const HIGHLIGHT_MS = 2500;

/* closer than this to the bottom (px) counts as reading the newest messages */
const BOTTOM_TOLERANCE = 40;

export const MessagesSection = () => {
    const dispatch = useAppDispatch();
    const store = useStore<RootState>();
    const chat = useAppSelector(selectActiveChat);
    const authDetails = useAppSelector(selectAuthDetails);
    const outbox = useAppSelector(selectOutbox);
    const {myLastMessage, recipientLastMessage: otherLastMessage, lastMessage} = useLastMessage(chat, authDetails);
    const group = isGroup(chat);
    const recipientLastMessage = group ? null : otherLastMessage;  // the "seen" avatar is for 1:1 chats
    const pageVisible = usePageVisible();
    const chatsStatus = useAppSelector(selectChatsStatus);
    const focusRequest = useAppSelector(selectFocusRequest);

    const [bottom, setBottom] = useState<number | null>(null);  // viewport position of the bottom of the last message seen by recipient
    const [bounds, setBounds] = useState<Bounds | null>(null);  // viewport position of the messages container
    const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
    const [newBelow, setNewBelow] = useState(false);  // messages arrived while the reader was scrolled up
    const [searchChatId, setSearchChatId] = useState<number | null>(null);  // the chat whose search panel is open
    const [highlightId, setHighlightId] = useState<number | null>(null);  // message the reader jumped to
    const [jumpFailed, setJumpFailed] = useState(false);
    const [olderState, setOlderState] = useState<{ chatId: number; state: "loading" | "failed" } | null>(null);

    const contentDisplayerRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<HTMLDivElement | null>(null);
    const previousBottom = useRef<number | null>(null);
    const cancelFall = useRef<(() => void) | null>(null);
    const sentStatusKey = useRef<string | null>(null);
    const loadingOlder = useRef(false);
    const atBottom = useRef(true);
    const keepScroll = useRef<{ chatId: number; height: number; top: number } | null>(null);

    const chatId = chat?.id;
    const messageCount = chat?.messages.length ?? 0;
    const firstId = chat?.messages[0]?.id;
    const lastId = chat?.messages[messageCount - 1]?.id;
    const hasMore = chat?.hasMore ?? false;
    const lastIsMine = chat?.messages[messageCount - 1]?.userId === authDetails?.id;
    const pending = outbox.filter(i => i.chatId === chatId);

    /* for keeping previous value inside ref */
    useEffect(() => {
        previousBottom.current = bottom;
    }, [bottom]);

    useEffect(() => () => cancelFall.current?.(), []);

    const stopFalling = () => {
        cancelFall.current?.();
        cancelFall.current = null;
    };

    /* reads positions from the DOM; the avatar position is left alone while it is animated */
    const measure = useCallback(() => {
        if (contentDisplayerRef.current) {
            const { top, bottom } = contentDisplayerRef.current.getBoundingClientRect();
            setBounds({ top, bottom });
        }
        if (cancelFall.current) return;
        setBottom(lastMessageRef.current ? lastMessageRef.current.getBoundingClientRect().bottom : null);
    }, []);

    /* callback ref, attached to the last message seen by the recipient */
    const setLastMessageRef = useCallback((node: HTMLDivElement | null) => {
        lastMessageRef.current = node;
        if (!node) return;

        const target = node.getBoundingClientRect().bottom;
        stopFalling();
        if (previousBottom.current !== null) {
            cancelFall.current = fall(setBottom, previousBottom.current, target, () => { cancelFall.current = null; });
        } else setBottom(target);
    }, []);

    const scrollToBottom = useCallback(() => {
        if (contentDisplayerRef.current) {
            contentDisplayerRef.current.scrollTop = contentDisplayerRef.current.scrollHeight;
        }
        atBottom.current = true;
        setNewBelow(false);
    }, []);

    const flagNewBelow = useCallback(() => setNewBelow(true), []);

    /* shows a message found by the search: older pages are loaded until it is there */
    const jumpTo = async (messageId: number) => {
        if (chatId === undefined) return;
        setJumpFailed(false);
        const known = () => store.getState().chats.chats.find(c => c.id === chatId);
        for (let page = 0; page < MAX_JUMP_PAGES; page++) {
            const current = known();
            if (!current || current.messages.some(m => m.id === messageId)) break;
            if (current.hasMore === false) break;
            try {
                const messages = await ChatAPI.loadMessages(chatId, current.messages[0]?.id);
                dispatch(prependMessages({ chatId, messages, hasMore: messages.length >= PAGE_SIZE }));
            } catch (e) {
                console.error("Failed to load older messages:", e);
                break;
            }
        }
        if (!known()?.messages.some(m => m.id === messageId)) return setJumpFailed(true);
        atBottom.current = false;
        keepScroll.current = null;
        requestAnimationFrame(() => {
            document.getElementById(`messageId${messageId}`)?.scrollIntoView({ block: "center" });
            setHighlightId(messageId);
            setTimeout(() => setHighlightId(current => current === messageId ? null : current), HIGHLIGHT_MS);
        });
    };

    /* loads the page of messages older than the oldest one displayed */
    const loadOlder = useCallback(() => {
        if (chatId === undefined || firstId === undefined || !hasMore || loadingOlder.current) return;
        loadingOlder.current = true;
        setOlderState({ chatId, state: "loading" });
        ChatAPI.loadMessages(chatId, firstId)
            .then(messages => {
                const el = contentDisplayerRef.current;
                if (el && messages.length > 0) keepScroll.current = { chatId, height: el.scrollHeight, top: el.scrollTop };
                dispatch(prependMessages({ chatId, messages, hasMore: messages.length >= PAGE_SIZE }));
                setOlderState(null);
            })
            .catch(e => {
                console.error("Failed to load older messages:", e);
                setOlderState({ chatId, state: "failed" });
            })
            .finally(() => { loadingOlder.current = false; });
    }, [chatId, firstId, hasMore, dispatch]);

    /* the newest messages of a chat that failed to load at the start */
    const retryLatest = () => {
        if (chatId === undefined) return;
        setOlderState(null);
        ChatAPI.loadMessages(chatId)
            .then(messages => dispatch(prependMessages({ chatId, messages, hasMore: messages.length >= PAGE_SIZE })))
            .catch(e => {
                console.error("Failed to load messages:", e);
                setOlderState({ chatId, state: "failed" });
            });
    };

    /* the person chose a chat from the list: the focus follows into the conversation */
    useEffect(() => {
        if (focusRequest > 0) document.getElementById("conversation-title")?.focus();
    }, [ focusRequest ]);

    /* keeps the reader at the same message after older ones were put above it */
    useLayoutEffect(() => {
        const keep = keepScroll.current;
        const el = contentDisplayerRef.current;
        if (!keep || !el || keep.chatId !== chatId) return;
        keepScroll.current = null;
        el.scrollTop = el.scrollHeight - keep.height + keep.top;
        measure();
    }, [firstId, chatId, measure]);

    const handleScroll = () => {
        const el = contentDisplayerRef.current;
        if (el) {
            atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_TOLERANCE;
            if (atBottom.current) setNewBelow(false);
        }
        measure();
        if ((contentDisplayerRef.current?.scrollTop ?? Infinity) < 80) loadOlder();
    };

    /* switching between chats */
    useEffect(() => {
        stopFalling();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resets the "new messages" hint of the previous chat
        scrollToBottom();
        measure();
    }, [chatId, measure, scrollToBottom]);

    /* new message: follow it only when the reader is at the bottom or wrote it; older messages added at the top must not move the view */
    useEffect(() => {
        if (atBottom.current || lastIsMine) scrollToBottom();
        else flagNewBelow();
        measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastId, measure, scrollToBottom, flagNewBelow]);

    /* my own messages that are still being sent */
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- follows my own message that is being sent
        if (pending.length > 0) scrollToBottom();
    }, [pending.length, scrollToBottom]);

    useEffect(() => {
        const handleResize = () => {
            setViewportHeight(window.innerHeight);
            measure();
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [measure]);

    /* tells the backend that I've seen the newest message (once per message, only when the page is visible) */
    useEffect(() => {
        if (chatId === undefined || !lastMessage || !pageVisible || myLastMessage === lastMessage) return;

        const key = `${chatId}:${lastMessage}`;
        if (sentStatusKey.current === key) return;
        sentStatusKey.current = key;

        ChatAPI.updateStatus(chatId, lastMessage).then(() => dispatch(markRead(chatId))).catch(e => {
            if (sentStatusKey.current === key) sentStatusKey.current = null;  // allow a retry
            console.error("Failed to update status:", e);
        });
    }, [chatId, myLastMessage, lastMessage, pageVisible, dispatch]);

    const renderedMessages = chat?.messages.map((m, i) => {
        const activeMessages = chat.messages;
        const len = activeMessages.length;

        const date = DateFormatter.sqlToDateObject(m.time);
        const prevDate = i === 0 ? null : DateFormatter.sqlToDateObject(activeMessages[i - 1].time);
        const nextDate = i === len - 1 ? null : DateFormatter.sqlToDateObject(activeMessages[i + 1].time);

        const df = new DateFormatter(prevDate, date, nextDate);

        /* check who wrote this message */
        let modifier = m.userId === authDetails?.id ? " singleMessage--myMsg" : " singleMessage--receivedMsg";

        /* messages of the same sender, sent less than 5 minutes apart, stick together */
        if (i > 0 && activeMessages[i - 1].userId === m.userId && df.is5MinDiffBefore()) modifier += " singleMessage--topSticky";
        if (i < len - 1 && activeMessages[i + 1].userId === m.userId && df.is5MinDiffAfter()) modifier += " singleMessage--bottomSticky";

        const startsSeries = !modifier.includes("topSticky");
        const author = group && m.userId !== authDetails?.id && startsSeries
            ? chat.users.find(u => u.id === m.userId)?.name ?? strings.group.formerMember
            : undefined;

        const reference = recipientLastMessage === m.id ? setLastMessageRef : null;  // inserts lastMessageRef to last message displayed by second user

        return (
            <Message key={m.id} ref={reference} message={m} modifier={modifier} dateFormatter={df}
                     mine={m.userId === authDetails?.id} author={author} highlighted={m.id === highlightId} onJump={jumpTo}/>
        );
    });

    return (
        <div className="messages">
            {chat && <ConversationStatus chat={chat} onSearch={() => setSearchChatId(chat.id)}/>}
            {chat && searchChatId === chat.id &&
                <MessageSearch key={chat.id} chatId={chat.id} onJump={jumpTo} onClose={() => setSearchChatId(null)}/>}
            {jumpFailed && <div role="alert" className="messages__notice">{strings.search.notFound}</div>}
            {(chat?.messagesFailed || (olderState?.chatId === chatId && olderState?.state === "failed")) &&
                <div role="alert" className="messages__notice">
                    {strings.states.historyFailed}{" "}
                    <button type="button" onClick={chat?.messagesFailed || messageCount === 0 ? retryLatest : loadOlder}>{strings.states.retry}</button>
                </div>}
            {olderState?.chatId === chatId && olderState?.state === "loading" &&
                <div role="status" className="messages__notice">{strings.states.loadingOlder}</div>}
            {messageCount > 0 || pending.length > 0 ?
                <div
                    ref={contentDisplayerRef}
                    className="messages__container"
                    role="log"
                    aria-live="off"
                    aria-label={strings.a11y.messages}
                    onScroll={handleScroll}
                >
                    <div className="messages__container__displayContent">
                        {renderedMessages}
                        {pending.map(item => <PendingMessage key={item.localId} item={item}/>)}
                    </div>
                    <SeenAvatarsPanel bottom={bottom} bounds={bounds} viewportHeight={viewportHeight}/>
                </div>
                :
                <span className="noMessages">{chat ? strings.chats.noMessages : chatsStatus === "ready" ? strings.states.pickChat : ""}</span>
            }
            {newBelow &&
                <button type="button" className="messages__newBelow" onClick={scrollToBottom}>
                    {strings.messageStatus.newMessages}
                </button>}
            {chat && <NewMessageInput/>}
        </div>
    );
}
