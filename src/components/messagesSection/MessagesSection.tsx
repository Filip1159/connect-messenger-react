import {useCallback, useEffect, useRef, useState} from "react";
import { useAppSelector } from "../../store/hooks";
import {selectAuthDetails} from "../../store/auth/authSlice";
import {selectActiveChat} from "../../store/chats/chatsSlice";
import DateFormatter from "../../DateFormatter";
import "./MessagesSection.scss";
import NewMessageInput from "./newMessageInput/NewMessageInput";
import useLastMessage from "./hooks/useLastMessage";
import usePageVisible from "./hooks/usePageVisible";
import SeenAvatarsPanel, { type Bounds } from "./seenAvatarPanel/SeenAvatarsPanel";
import fall from "./seenAvatarPanel/FallingAvatar";
import strings from "../../strings";
import ChatAPI from "../../store/ChatAPI";
import { Message } from "./message/Message";

export const MessagesSection = () => {
    const chat = useAppSelector(selectActiveChat);
    const authDetails = useAppSelector(selectAuthDetails);
    const {myLastMessage, recipientLastMessage, lastMessage} = useLastMessage(chat, authDetails);
    const pageVisible = usePageVisible();

    const [bottom, setBottom] = useState<number | null>(null);  // viewport position of the bottom of the last message seen by recipient
    const [bounds, setBounds] = useState<Bounds | null>(null);  // viewport position of the messages container
    const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

    const contentDisplayerRef = useRef<HTMLDivElement>(null);
    const lastMessageRef = useRef<HTMLDivElement | null>(null);
    const previousBottom = useRef<number | null>(null);
    const cancelFall = useRef<(() => void) | null>(null);
    const sentStatusKey = useRef<string | null>(null);

    const chatId = chat?.id;
    const messageCount = chat?.messages.length ?? 0;

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

    const scrollToBottom = () => {
        if (contentDisplayerRef.current) {
            contentDisplayerRef.current.scrollTop = contentDisplayerRef.current.scrollHeight;
        }
    };

    /* switching between chats */
    useEffect(() => {
        stopFalling();
        scrollToBottom();
        measure();
    }, [chatId, measure]);

    /* new message */
    useEffect(() => {
        scrollToBottom();
        measure();
    }, [messageCount, measure]);

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

        ChatAPI.updateStatus(chatId, lastMessage).catch(e => {
            if (sentStatusKey.current === key) sentStatusKey.current = null;  // allow a retry
            console.error("Failed to update status:", e);
        });
    }, [chatId, myLastMessage, lastMessage, pageVisible]);

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

        const reference = recipientLastMessage === m.id ? setLastMessageRef : null;  // inserts lastMessageRef to last message displayed by second user

        return (
            <Message key={m.id} ref={reference} message={m} modifier={modifier} dateFormatter={df}/>
        );
    });

    return (
        <div className="messages">
            {messageCount > 0 ?
                <div
                    ref={contentDisplayerRef}
                    className="messages__container"
                    onScroll={measure}
                >
                    <div className="messages__container__displayContent">
                        {renderedMessages}
                    </div>
                    <SeenAvatarsPanel bottom={bottom} bounds={bounds} viewportHeight={viewportHeight}/>
                </div>
                :
                <span className="noMessages">{strings.chats.noMessages}</span>
            }
            <NewMessageInput/>
        </div>
    );
}
