import React, { useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { ChatContext } from "../../contexts/ChatContext";
import "../../styles/MessagesPanel/SeenAvatar.scss";
import {getRecipient} from "../../helpers/chatContextUtils";

export const AVATAR_HEIGHT = 20;

const SeenAvatar = ({ bottom, opacity }) => {
    const { state: { chats, active } } = useContext(ChatContext);
    const { authDetails } = useContext(AuthContext);

    if (chats.length === 0) return "...";

    const recipientUsername = getRecipient(chats[active], authDetails).username;
    
    return (
        <img
            className="seenAvatar"
            src={`/connect-messenger-react/images/avatars/${recipientUsername}.png`}
            alt="seen avatar"
            style={{
                top: `${bottom - AVATAR_HEIGHT}px`,
                opacity: Number.isNaN(opacity) ? 0 : opacity
            }}
        />
    )
}

export default SeenAvatar;