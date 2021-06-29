import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ConversationContext } from "../contexts/ConversationContext";
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
                        const year = m.time.substring(0, 4);
                        const month = m.time.substring(5, 7);
                        const day = m.time.substring(8, 10);
                        const hour = m.time.substring(11, 13);
                        const minute = m.time.substring(14, 16);
                        const date = new Date(year, month, day, hour, minute);

                        let prevDate;
                        if (i === 0) prevDate = new Date(1970);
                        else {
                            const prevM = conversations[active].messages[i-1];
                            const prevYear = prevM.time.substring(0, 4);
                            const prevMonth = prevM.time.substring(5, 7);
                            const prevDay = prevM.time.substring(8, 10);
                            const prevHour = prevM.time.substring(11, 13);
                            const prevMinute = prevM.time.substring(14, 16);
                            prevDate = new Date(prevYear, prevMonth, prevDay, prevHour, prevMinute);
                        }

                        const len = conversations[active].messages.length;
                        let nextDate;
                        if (i === len - 1) nextDate = new Date(2038, 1, 19);
                        else {
                            const nextM = conversations[active].messages[i+1];
                            const nextYear = nextM.time.substring(0, 4);
                            const nextMonth = nextM.time.substring(5, 7);
                            const nextDay = nextM.time.substring(8, 10);
                            const nextHour = nextM.time.substring(11, 13);
                            const nextMinute = nextM.time.substring(14, 16);
                            nextDate = new Date(nextYear, nextMonth, nextDay, nextHour, nextMinute);
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

                        const days = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];

                        return (
                            <>
                                {!smallTimeDifferenceBefore &&
                                <div key={date.getTime()} className="messages__time">
                                    {`${(date.getTime() - prevDate.getTime() > 24*60*60*1000 && `${days[date.getDay()]},`)} ${hour}:${minute}`}
                                </div>}
                                <div key={m.messageId} className={className} id={lastDisplayedMessage === m.messageId ? "lastMessage" : ""}>
                                    {m.content}
                                </div>
                            </>
                        )
                    })
                }</div>
                <SeenAvatarsPanel bottom={window.innerHeight-bottom}/>
            </div>
            <NewMessageInput />
        </div>
    );
}

export default Messages;