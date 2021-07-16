import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ChatContext } from "../contexts/ChatContext";
import DateFormatter from "../helpers/DateFormatter";
import "./Messages.css";
import NewMessageInput from "./NewMessageInput";
import SeenAvatarsPanel from "./SeenAvatarsPanel";

const Messages = () => {
    const { state: { chats, active } } = useContext(ChatContext);
    const { authDetails } = useContext(AuthContext);
    const lastDisplayedMessage = chats[active]?.status[chats[active]?.status[0]?.id?.userId !== authDetails.id ? 0 : 1]?.messageId;
    const [ bottom, setBottom ] = useState(0);
    
    useEffect(() => {
        const elem = document.querySelector(".messages__container__displayContent");
        elem.scrollTop = elem.scrollHeight;
        setBottom(document.querySelector(".lastMessage")?.getBoundingClientRect().bottom);
    }, [active]);

    useEffect(() => {
        const updateStatus = async () => {
            console.log("Use Effect called");
            const newStatus = {
                id: {
                    chatId: chats[active].id,
                    userId: authDetails.id
                },
                messageId: chats[active].messages[chats[active].messages.length - 1].id,
                time: DateFormatter.nowToSql()
            };
            console.log("Sending update status request: ", newStatus);
            fetch("http://localhost:8080/status", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: localStorage.getItem("token")
                },
                body: JSON.stringify(newStatus)
            });
        };
        if (chats[active]?.status[chats[active]?.status[0]?.id?.userId === authDetails?.id ? 0 : 1]?.messageId
            !==
            chats[active]?.messages[chats[active]?.messages?.length - 1].id)  // there are some messages unseen
            updateStatus();
    }, [active, chats]);

    return ( 
        <div className="messages">
            <div className="messages__container">
                <div
                    className="messages__container__displayContent"
                    onScroll={e => setBottom(document.querySelector(".lastMessage")?.getBoundingClientRect().bottom)}
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

                        if (lastDisplayedMessage === m.id) extraClasses += " lastMessage";

                        return (
                            <React.Fragment key={i}>
                                {!df.is5MinDiffBefore() &&
                                <div className="messages__time">
                                    {df.displayDayIfDifferent() + df.currentToHourMinute()}
                                </div>}
                                <div className={`messages__singleMessage${extraClasses}`}>
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