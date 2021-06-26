import React, { useContext } from "react";
import { ConversationContext } from "../contexts/ConversationContext";
import "./Messages.css";
import NewMessageInput from "./NewMessageInput";

const Messages = () => {
    const { state: { conversations, active } } = useContext(ConversationContext);

    return ( 
        <div className="messages">
            <div className="messages__container">{
                conversations[active]?.messages?.map(m =>
                    <div className={`messages__singleMessage ${m.userId === 1 ? "my" : "received"}Msg`} key={m.messageId}>
                        {m.content}
                    </div>
                )    
            }</div>
            <NewMessageInput />
        </div>
    );
}

export default Messages;