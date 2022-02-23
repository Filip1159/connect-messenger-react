import React, {forwardRef, useContext} from "react";
import MessageTimestamp from "../../helpers/MessageTimestamp";
import {createSingleMessageModifier} from "../../helpers/chatContextUtils";
import {AuthContext} from "../../contexts/AuthContext";
import {ChatContext} from "../../contexts/ChatContext";

const SingleMessage = forwardRef(( { index }, ref ) => {
    const { authDetails } = useContext(AuthContext);
    const { state: { chats, active } } = useContext(ChatContext);
    const chat = chats[active];
    const message = chat.messages[index];
    const timestamp = new MessageTimestamp(index, chat);
    const modifier = createSingleMessageModifier(index, chat, authDetails);

    return (
        <>
            {!timestamp.isPreviousLessThan5MinutesBeforeThis() &&
            <div className="messages__time">
                {timestamp.displayDayIfDifferent() + timestamp.currentToHourMinute()}
            </div>}
            <div ref={ref} id={`messageId${message.id}`} className={`messages__singleMessage${modifier}`}>
                {message.content}
                <div className="messages__singleMessage__tooltip">{timestamp.currentToPretty()}</div>
            </div>
        </>
    );
});

export default SingleMessage;