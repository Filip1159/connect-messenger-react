import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ChatContext } from "../contexts/ChatContext";
import DateFormatter from "../helpers/DateFormatter";
import "../styles/Messages.scss";
import NewMessageInput from "./NewMessageInput";
import useLastMessage from "../hooks/useLastMessage";
import api from "../helpers/axios";
import useChat from "../hooks/useChat";
import SeenAvatarsPanel from "./SeenAvatarsPanel";
import fall from "../helpers/FallingAvatar";

const Messages = () => {
    const { state: { chats, active } }  = useContext(ChatContext);
    const { authDetails }               = useContext(AuthContext);
    const chat                          = useChat(chats, active);
    const { myLastMessage, recipientLastMessage, lastMessage } = useLastMessage(chat, authDetails);
    const [ bottom, setBottom ]         = useState(null);
    const contentDisplayerRef           = useRef(null);
    const lastMessageRef                = useRef(null);
    const prevoiusBottom                = useRef(null);
    const prevChat                      = useRef(null);

    useEffect(() => {
        prevChat.current = chat;
    }, [ chat ]);

    useEffect(() => {
        prevoiusBottom.current = bottom;
    }, [ bottom ]);

    /* callback ref */
    const setLastMessageRef = useCallback(node => {
        console.log("node = ");
        console.log(node);
        if (node) {
            lastMessageRef.current = node;
            console.log("previousBottom = ");
            console.log(prevoiusBottom.current);
            if (prevoiusBottom.current) {
                console.log("avatar falls from " + prevoiusBottom.current + " to " + node.getBoundingClientRect().bottom);
                fall(setBottom, prevoiusBottom.current, node.getBoundingClientRect().bottom);
            }
            else setBottom(node.getBoundingClientRect().bottom);
        }
    // eslint-disable-next-line
    }, []);

    /* updates bottom value when switching between chats */
    useEffect(() => {
        console.log("useEffect with setBottom");
        if (contentDisplayerRef.current) {
            console.log("useEffect of seenAvatar launched");
            contentDisplayerRef.current.scrollTop = contentDisplayerRef.current.scrollHeight;
        }
        if (lastMessageRef.current) {
            setBottom(lastMessageRef.current.getBoundingClientRect().bottom);
        }
        // eslint-disable-next-line
    }, [ chat ]);

    /* puts new status to api, when I read unseen message */
    /* performs request through axios,
     * api sends status update through websocket,
     * chatReducer performs context update
     * useEffect is launched once again, but then specific messages (their IDs) are equal and nothing happens
     * */
    useEffect(() => {
        console.log("useEffect from Messages.js called");
        const updateStatus = async () => {
            const newStatus = {
                id: { chatId: chats[active].id, userId: authDetails.id },
                messageId: lastMessage,
                time: DateFormatter.nowToSql()
            };
            console.log("newStatus = ");
            console.log(newStatus);
            await api.put("/status", newStatus, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: localStorage.getItem("token")
                }
            });
        };
        console.log("myLastMessage = " + myLastMessage + ", lastMessage = " + lastMessage);
        if (myLastMessage && lastMessage && myLastMessage !== lastMessage) { // there are some messages unseen: myLastMessage === lastMessageSeenByMe
            console.log("Indexes differ, updating status");
            updateStatus();
        }
        // eslint-disable-next-line
    }, [ myLastMessage, lastMessage ]);

    return (
        <div className="messages">
            <div className="messages__container">
                <div
                    ref={contentDisplayerRef}
                    className="messages__container__displayContent"
                    onScroll={() => {
                        if (lastMessageRef.current) {
                            setBottom(lastMessageRef.current.getBoundingClientRect().bottom);
                        }
                    }}
                >{
                    chats[active]?.messages?.map((m, i) => {
                        const activeMessages = chats[active].messages;
                        const date = DateFormatter.sqlToDateObject(m.time);

                        let prevDate;
                        if (i === 0) prevDate = new Date(1970);
                        else {
                            const prevM = activeMessages[i-1];
                            prevDate = DateFormatter.sqlToDateObject(prevM.time);
                        }

                        const len = activeMessages.length;
                        let nextDate;
                        if (i === len - 1) nextDate = new Date(2038, 1, 19);
                        else {
                            const nextM = activeMessages[i+1];
                            nextDate = DateFormatter.sqlToDateObject(nextM.time);
                        }

                        const df = new DateFormatter(prevDate, date, nextDate);

                        let extraClasses = "";
                        /* check who wrote this message */
                        if (m.userId === authDetails.id) extraClasses += " myMsg";
                        else extraClasses += " receivedMsg";
                        if (i === 0) {
                            if (activeMessages[1].userId === activeMessages[0].userId && df.is5MinDiffAfter()) // if 1st and 2nd messages have the same sender
                                extraClasses += " bottomSticky";
                        } else if (i === len - 1) {
                            if (activeMessages[len-2].userId === activeMessages[len-1].userId && df.is5MinDiffBefore())  // if two last messages have the same sender
                                extraClasses += " topSticky";
                        } else { /* code below runs if i !== 0 and i !== length-1 */
                            if (activeMessages[i-1]?.userId === m.userId && df.is5MinDiffBefore()) extraClasses += " topSticky";
                            if (activeMessages[i+1]?.userId === m.userId && df.is5MinDiffAfter()) extraClasses += " bottomSticky";
                        }

                        const reference = recipientLastMessage === m.id ? setLastMessageRef : null;  // inserts lastMessageRef to last message displayed by second user

                        return (
                            <React.Fragment key={i}>
                                {!df.is5MinDiffBefore() &&
                                <div className="messages__time">
                                    {df.displayDayIfDifferent() + df.currentToHourMinute()}
                                </div>}
                                <div ref={reference} id={`messageId${m.id}`} className={`messages__singleMessage${extraClasses}`}>
                                    {m.content}
                                    <div className="messages__singleMessage__tooltip">{df.currentToPretty()}</div>
                                </div>
                            </React.Fragment>
                        )
                    })
                }</div>
                <SeenAvatarsPanel bottom={window.innerHeight-bottom} />
            </div>
            <NewMessageInput />
        </div>
    );
}

export default Messages;