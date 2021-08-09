import React, { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import "../styles/ChatItem.scss";

const ChatItem = ({chat, modifier, onClick }) => {
    const { authDetails } = useContext(AuthContext);
    const lastMessage = chat.messages[chat?.messages.length - 1];
    const user = chat.users[chat.users[0].id !== authDetails.id ? 0 : 1];

    return (
        <div className={`chatItem${modifier}`} onClick={onClick}>
            <img
                src={`./images/avatars/${user.username}.png`}
                alt="User avatar"
            />
            <div style={{display: "flex", flexDirection: "column"}}>
                <span className="chatItem__nameSurname">
                    {user.name + " " + user.surname}
                </span>
                <span className="chatItem__lastMessage">{
                       (lastMessage.userId === user.id ? user.name : "Ty") + ": " +
                        lastMessage.content.substring(0, 35) +
                       (lastMessage.content.length > 35 ? "..." : "")
                }</span>
            </div>
        </div>
    );
}

export default ChatItem;