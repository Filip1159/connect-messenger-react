import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import "../../styles/ChatsPanel/ChatItem.scss";
import {createChatItemModifier, formatMessageBrief, getLastMessage, getRecipient} from "../../helpers/chatContextUtils";
import {ChatContext} from "../../contexts/ChatContext";

const ChatItem = ({id, number}) => {
    const { authDetails } = useContext(AuthContext);
    const { state: { chats, active }, dispatch } = useContext(ChatContext);
    const lastMessage = getLastMessage(chats[number]);
    const recipient = getRecipient(chats[number], authDetails);
    const messageBrief = formatMessageBrief(lastMessage, recipient);
    const modifier = createChatItemModifier(number, active);

    const switchActiveChatNumber = () => dispatch({ type: "SET_ACTIVE", newActive: number });

    if (!recipient) return "Loading...";

    return (
        <div className={`chatItem${modifier}`} onClick={switchActiveChatNumber}>
            <img
                src={`/connect-messenger-react/images/avatars/${recipient.username}.png`}
                alt="User avatar"
            />
            <div className="chatItem__chatData">
                <span className="chatItem__chatData__nameSurname">
                    {`${recipient.name} ${recipient.surname}`}
                </span>
                <span className="chatItem__chatData__lastMessage">{messageBrief}</span>
            </div>
        </div>
    );
}

export default ChatItem;