import React, {useContext} from "react";
import {ChatContext} from "../../contexts/ChatContext";
import "../../styles/ChatsPanel/ChatsPanelFilling.scss";

const ChatsPanelFilling = () => {
    const { state: { chats, active } } = useContext(ChatContext);
    const shouldHaveRoundedCorner = active === chats.length - 1;
    const optionalModifier = shouldHaveRoundedCorner ? " chatsPanel__filling--roundedCorner" : "";

    return <div className={`chatsPanel__filling${optionalModifier}`}/>
}

export default ChatsPanelFilling;