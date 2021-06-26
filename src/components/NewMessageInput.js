import React, { useContext, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ConversationContext } from "../contexts/ConversationContext";
import "./NewMessageInput.css";

const NewMessageInput = () => {
    const [ content, setContent ] = useState("");
    const { authDetails } = useContext(AuthContext);
    const { state: { conversations, active }, dispatch } = useContext(ConversationContext);

    const handlePost = async () => {
        document.querySelector(".newMessageInput__input").innerText = "";
        setContent("");
        const message = {
            conversationId: conversations[active].conversationId,
            userId: authDetails.userId,
            content,
            wasRead: false
        };
        const res = await fetch("http://localhost:8080/message", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: localStorage.getItem("token")
            },
            body: JSON.stringify(message)
        });
        const newMessage = await res.json();
        dispatch({ type: "ADD_MESSAGE", newMessage });
    }

    return (
        <div className="newMessageInput">
            <input type="text" className="newMessageInput__input" onInput={e => {
                setContent(e.target.innerText);
                if (e.target.innerText.endsWith("\n")) handlePost();
            }} />
            <img className="newMessageInput__btn" src="images/send.png" alt="Send" onClick={handlePost}/>
        </div>
    );
}

export default NewMessageInput;