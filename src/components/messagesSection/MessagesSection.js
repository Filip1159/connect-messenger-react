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

        let prevDate;
        if (i === 0) prevDate = new Date(1970);
        else {
            const prevM = activeMessages[i - 1];
            prevDate = DateFormatter.sqlToDateObject(prevM.time);
        }

        const len = activeMessages.length;
        let nextDate;
        if (i === len - 1) nextDate = new Date(2038, 1, 19);
        else {
            const nextM = activeMessages[i + 1];
            nextDate = DateFormatter.sqlToDateObject(nextM.time);
        }

        const df = new DateFormatter(prevDate, date, nextDate);

        let modifier = "";
        /* check who wrote this message */
        if (m.userId === authDetails.id) modifier += " singleMessage--myMsg";
        else modifier += " singleMessage--receivedMsg";

        if (len > 1) {
            if (i === 0) {
                if (activeMessages[1].userId === activeMessages[0].userId && df.is5MinDiffAfter()) // if 1st and 2nd messages have the same sender
                    modifier += " singleMessage--bottomSticky";
            } else if (i === len - 1) {
                if (activeMessages[len - 2].userId === activeMessages[len - 1].userId && df.is5MinDiffBefore())  // if two last messages have the same sender
                    modifier += " singleMessage--topSticky";
            } else { /* code below runs if i !== 0 and i !== length-1 */
                if (activeMessages[i - 1]?.userId === m.userId && df.is5MinDiffBefore()) modifier += " singleMessage--topSticky";
                if (activeMessages[i + 1]?.userId === m.userId && df.is5MinDiffAfter()) modifier += " singleMessage--bottomSticky";
            }
        }

        const reference = recipientLastMessage === m.id ? setLastMessageRef : null;  // inserts lastMessageRef to last message displayed by second user

        return (
            <Message key={i} ref={reference} message={m} modifier={modifier} dateFormatter={df}/>
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
