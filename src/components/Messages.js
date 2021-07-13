import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ConversationContext } from "../contexts/ConversationContext";
import DateFormatter from "../helpers/DateFormatter";
import "./Messages.css";
import NewMessageInput from "./NewMessageInput";
import SeenAvatarsPanel from "./SeenAvatarsPanel";

const Messages = () => {
    const { state: { conversations, active } } = useContext(ConversationContext);
    const { authDetails } = useContext(AuthContext);
    const lastDisplayedMessage = conversations[active]?.seenMapList[0]?.messageId;
    const [bottom, setBottom] = useState(0);
    
    useEffect(() => {
        const elem = document.querySelector(".messages__container__displayContent");
        elem.scrollTop = elem.scrollHeight;
        setBottom(document.getElementById("lastMessage")?.getBoundingClientRect().bottom);
    }, [active]);

    return ( 
        <div className="messages">
            <div className="messages__container">
                <div
                    className="messages__container__displayContent"
                    onScroll={e => setBottom(document.getElementById("lastMessage").getBoundingClientRect().bottom)}
                >{
                    conversations[active]?.messages?.map((m, i) => {
                        const date = DateFormatter.sqlToDateObject(m.time);

                        let prevDate;
                        if (i === 0) prevDate = new Date(1970);
                        else {
                            const prevM = conversations[active].messages[i-1];
                            prevDate = DateFormatter.sqlToDateObject(prevM.time);
                        }

                        const len = conversations[active].messages.length;
                        let nextDate;
                        if (i === len - 1) nextDate = new Date(2038, 1, 19);
                        else {
                            const nextM = conversations[active].messages[i+1];
                            nextDate = DateFormatter.sqlToDateObject(nextM.time);
                        }

                        const smallTimeDifferenceBefore = (date.getTime() - prevDate.getTime()) < 5*60*1000;
                        const smallTimeDifferenceAfter = (nextDate.getTime() - date.getTime()) < 5*60*1000;

                        let className = "messages__singleMessage";
                        /* check who wrote this message */
                        if (m.userId === authDetails.userId) className += " myMsg";
                        else className += " receivedMsg";
                        if (i === 0) {
                            if (conversations[active].messages[1].userId === conversations[active].messages[0].userId && smallTimeDifferenceAfter) { // if 1st and 2nd messages have the same sender
                                className += " bottomSticky";
                            }   
                        } else if (i === len - 1) {
                            if (conversations[active].messages[len-2].userId === conversations[active].messages[len-1].userId && smallTimeDifferenceBefore) {  // if two last messages have the same sender
                                className += " topSticky";
                            }
                        } else {
                            /* code below runs if i !== 0 and i !== length-1 */
                            const previousSenderId = conversations[active].messages[i-1]?.userId;
                            const nextSenderId = conversations[active].messages[i+1]?.userId;

                            if (previousSenderId === m.userId && smallTimeDifferenceBefore) className += " topSticky";
                            if (nextSenderId === m.userId && smallTimeDifferenceAfter) className += " bottomSticky";
                        }

                        const days = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

                        return (
                            <React.Fragment key={i}>
                                {!smallTimeDifferenceBefore &&
                                <div className="messages__time">
                                    {`${(date.getTime() - prevDate.getTime() > 24*60*60*1000 ? `${days[date.getDay()]}, ` : "")}${DateFormatter.dateObjectToHourMinute(date)}`}
                                </div>}
                                <div className={className} id={lastDisplayedMessage === m.messageId ? "lastMessage" : ""}>
                                    {m.content}
                                    <div className="messages__singleMessage__tooltip">
                                        {DateFormatter.dateObjectToPretty(date)}
                                    </div>
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