import React, {useCallback, useContext, useEffect, useRef, useState} from "react";
import {AuthContext} from "../../store/auth/AuthContext";
import {ChatContext} from "../../store/chats/ChatContext";
import DateFormatter from "../../DateFormatter";
import "./MessagesSection.scss";
import NewMessageInput from "./newMessageInput/NewMessageInput";
import useLastMessage from "./hooks/useLastMessage";
import useChat from "./hooks/useChat";
import SeenAvatarsPanel from "./seenAvatarPanel/SeenAvatarsPanel";
import fall from "./seenAvatarPanel/FallingAvatar";
import ChatAPI from "../../store/ChatAPI";
import { Message } from "./message/Message";

export const MessagesSection = () => {
    const {state: {chats, active}} = useContext(ChatContext);
    const {authDetails} = useContext(AuthContext);
    const chat = useChat(chats, active);
    const {myLastMessage, recipientLastMessage, lastMessage} = useLastMessage(chat, authDetails);
    const [bottom, setBottom] = useState(null);
    const contentDisplayerRef = useRef(null);
    const lastMessageRef = useRef(null);
    const prevoiusBottom = useRef(null);

    /* for keeping prevoius value inside ref */
    useEffect(() => {
        prevoiusBottom.current = bottom;
    }, [bottom]);

    /* callback ref */
    const setLastMessageRef = useCallback(node => {
        if (node) {
            lastMessageRef.current = node;
            if (prevoiusBottom.current) {
                fall(setBottom, prevoiusBottom.current, node.getBoundingClientRect().bottom);
            } else setBottom(node.getBoundingClientRect().bottom);
        }
        // eslint-disable-next-line
    }, []);

    /* updates bottom value when switching between chats */
    useEffect(() => {
        if (contentDisplayerRef.current) {
            contentDisplayerRef.current.scrollTop = contentDisplayerRef.current.scrollHeight;
        }
        if (lastMessageRef.current) {
            setBottom(lastMessageRef.current.getBoundingClientRect().bottom);
        }
        // eslint-disable-next-line
    }, [chat]);

    useEffect(() => {
        if (myLastMessage && lastMessage && myLastMessage !== lastMessage) { // there are some messages unseen: myLastMessage === lastMessageSeenByMe
            ChatAPI.updateStatus(chat.id, lastMessage);
        }
        else if (chat) {
            const myStatus = chat.status[chat.status[0].id.userId === authDetails.id ? 0 : 1];
            if (!myStatus.messageId && chat.messages.length > 0) {
                ChatAPI.updateStatus(chat.id, chat.messages[chat.messages.length - 1].id);
            }
        }
        // eslint-disable-next-line
    }, [myLastMessage, lastMessage]);

    const renderedMessages = chat?.messages.map((m, i) => {
        const activeMessages = chat.messages;
        const date = DateFormatter.sqlToDateObject(m.time);

        const len = activeMessages.length

        const previousDate = i === 0 ? new Date(1970) : DateFormatter.sqlToDateObject(activeMessages[i - 1].time)
        const isPreviousMessageAtLeast5MinutesAgo = date.getTime() - previousDate.getTime() >= 5*60*1000
        const isPreviousMessageAtLeastOneDayAgo = date.getTime() - previousDate.getTime() >= 24*60*60*1000

        const nextDate = i === len - 1 ? new Date(2038, 1, 19) : DateFormatter.sqlToDateObject(activeMessages[i + 1].time)
        const isNextMessageAtLeast5MinutesAfter = nextDate.getTime() - date.getTime() >= 5*60*1000

        const isTopSticky = len > 1 &&
            ((i === len - 1 && activeMessages[len - 2].userId === activeMessages[len - 1].userId && !isPreviousMessageAtLeast5MinutesAgo) ||
            (i !== 0 && i !== len - 1 && activeMessages[i - 1]?.userId === m.userId && !isPreviousMessageAtLeastOneDayAgo))

        const isBottomSticky = len > 1 &&
            ((i === 0 && activeMessages[1].userId === activeMessages[0].userId && !isNextMessageAtLeast5MinutesAfter) ||
            (i !== 0 && i !== len - 1 && activeMessages[i + 1]?.userId === m.userId && !isNextMessageAtLeast5MinutesAfter))

        const reference = recipientLastMessage === m.id ? setLastMessageRef : null;  // inserts lastMessageRef to last message displayed by second user

        return (
            <Message
                key={i}
                ref={reference}
                message={m}
                isMine={m.userId === authDetails.id}
                isTopSticky={isTopSticky}
                isBottomSticky={isBottomSticky}
                shouldDisplayDate={isPreviousMessageAtLeast5MinutesAgo}
                shouldDisplayDay={isPreviousMessageAtLeastOneDayAgo}
                date={date}
            />
        );
    });

    // eslint-disable-next-line
    const [dim, setDim] = useState(0); /* it exists here only because of a need of re-rendering by change either props of state */

    useEffect(() => {
        const handleResize = () => {
            setDim(window.innerHeight);
            if (lastMessageRef.current) {
                setBottom(lastMessageRef.current.getBoundingClientRect().bottom);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize)
        };
    })

    return (
        <div className="messages">
            {renderedMessages?.length !== 0 ?
                <div
                    ref={contentDisplayerRef}
                    className="messages__container"
                    onScroll={() => {
                        if (lastMessageRef.current) {
                            setBottom(lastMessageRef.current.getBoundingClientRect().bottom);
                        }
                    }}
                >
                    <div className="messages__container__displayContent">
                        {renderedMessages}
                    </div>
                    <SeenAvatarsPanel bottom={window.innerHeight - bottom}/>
                </div>
                :
                <span className="noMessages">Brak wiadomości</span>
            }
            <NewMessageInput/>
        </div>
    );
}
