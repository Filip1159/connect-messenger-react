import React, { useContext, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ConversationContext } from "../contexts/ConversationContext";
import DateFormatter from "../helpers/DateFormatter";
import "./NewMessageInput.css";

const NewMessageInput = () => {
    const [ content, setContent ] = useState("");
    const { authDetails } = useContext(AuthContext);
    const { state: { conversations, active } } = useContext(ConversationContext);

    const handlePost = async () => {
        const message = {
            conversationId: conversations[active].conversationId,
            userId: authDetails.userId,
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
        document.querySelector(".newMessageInput__input").value = "";
        const elem = document.querySelector(".messages__container__displayContent");
        elem.scrollTop = elem.scrollHeight;
    }

    return (
        <div className="newMessageInput">
            <input type="text" className="newMessageInput__input" onInput={e => {
                setContent(e.target.value);
                if (e.target.value.endsWith("\n")) handlePost();  // not working
            }} />
            <img className="newMessageInput__btn" src="images/send.png" alt="Send" onClick={handlePost}/>
        </div>
    );
}

export default NewMessageInput;