import React, { useContext } from "react";
import { AuthContext } from "../../../store/auth/AuthContext";
import { ChatContext } from "../../../store/chats/ChatContext";
import "./SeenAvatar.scss";

const SeenAvatar = ({ bottom, opacity }) => {
    const { state: { chats, active } } = useContext(ChatContext);
    const { authDetails: { id } } = useContext(AuthContext);
    const username = chats[active]?.users[chats[active]?.users[0]?.id !== id ? 0 : 1].username;
    
    return (
        <img
            className="seenAvatar"
            src={`/images/avatars/${username}.png`}
            alt="seen avatar"
            style={{
                bottom: `${bottom}px`,
                opacity: Number.isNaN(opacity) ? 0 : opacity  /* go from top to bottom, from full color to full transparent */
            }}
        />
    )
}

export default SeenAvatar;