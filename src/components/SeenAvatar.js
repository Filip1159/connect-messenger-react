import React, { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ConversationContext } from "../contexts/ConversationContext";
import "./SeenAvatar.css"

const SeenAvatar = ({ bottom, opacity }) => {
    const { state: { conversations, active } } = useContext(ConversationContext);
    const { authDetails: { userId } } = useContext(AuthContext);
    const username = conversations[active]?.users[conversations[active]?.users[0]?.userId !== userId ? 0 : 1].username;
    
    return (
        <img
            className="seenAvatar"
            src={`./images/avatars/${username}.png`}
            alt="seen avatar"
            style={{
                bottom: `${bottom}px`,
                opacity: Number.isNaN(opacity) ? 0 : opacity  /* go from top to bottom, from full color to full transparent */
            }}
        />
    )
}

export default SeenAvatar;