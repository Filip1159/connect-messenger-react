import React, { useContext, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ChatContext } from "../contexts/ChatContext";
import DateFormatter from "../helpers/DateFormatter";
import "./NewMessageInput.css";

const NewMessageInput = () => {
    const [ content, setContent ] = useState("");
    const { authDetails } = useContext(AuthContext);
    const { state: { chats, active } } = useContext(ChatContext);

    const handlePost = async e => {
        e.preventDefault();
        const message = {
            chatId: chats[active].id,
            userId: authDetails.id,
            time: DateFormatter.nowToSql(),
            content
        };
        await fetch("http://localhost:8080/message", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("token")
            },
            body: JSON.stringify(message)
        });
        setContent("");
        const elem = document.querySelector(".messages__container__displayContent");
        elem.scrollTop = elem.scrollHeight;
    }

    return (
        <form className="newMessageInput" onSubmit={handlePost}>
            <input type="text" value={content} className="newMessageInput__input" onInput={e => setContent(e.target.value) }/>
            <input type="image" className="newMessageInput__btn" src="images/send.png" alt="Send"/>
        </form>
    );
}

export default NewMessageInput;