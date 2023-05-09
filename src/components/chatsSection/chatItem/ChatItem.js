import React, {useContext} from "react";
import {AuthContext} from "../../../store/auth/AuthContext";
import "./ChatItem.scss";

export const ChatItem = ({chat, modifier, onClick}) => {
    const {authDetails} = useContext(AuthContext);
    const lastMessage = chat.messages[chat?.messages.length - 1];
    const user = chat.users[chat.users[0].id !== authDetails.id ? 0 : 1];

    return (
        <div className={`chatItem${modifier}`} onClick={onClick}>
            <img src={`/images/avatars/${user.username}.png`} alt="User avatar" />
            <div className="chatItem__details">
                <span className="chatItem__details__nameSurname">
                    {user.name + " " + user.surname}
                </span>
                <span className="chatItem__details__lastMessage">{
                    lastMessage ?
                        (lastMessage.userId === user.id ? user.name : "Ty") + ": " +
                        lastMessage.content.substring(0, 35) +
                        (lastMessage.content.length > 35 ? "..." : "")
                        :
                        "Brak wiadomości"
                }</span>
            </div>
        </div>
    );
}
