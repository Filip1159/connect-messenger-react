import React, { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ConversationContext } from "../contexts/ConversationContext";

const ReadAvatar = () => {
    const { state: { conversations, active } } = useContext(ConversationContext);
    const { authDetails: { userId } } = useContext(AuthContext);
    const username = conversations[active].users[conversations[active].users[0].userId !== userId ? 0 : 1].username;

    return (
        <img src={`./images/avatars/${username}.png`} alt="read avatar"/>
    )
}

export default ReadAvatar;