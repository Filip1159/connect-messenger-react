import React, { useContext, useState } from "react";
import { ChatContext } from "../contexts/ChatContext";
import "../styles/NewMessageInput.scss";
import ChatAPI from "../helpers/ChatAPI";

const NewMessageInput = () => {
    const [ content, setContent ] = useState("");
    const { state: { chats, active } } = useContext(ChatContext);

    const handlePost = e => {
        e.preventDefault();
        if (content) { 
            ChatAPI.postMessage(chats[active].id, content);
            setContent("");
        }
    }

    return (
        <form className="newMessageInput" onSubmit={handlePost}>
            <input type="text" value={content} className="newMessageInput__input" onInput={e => setContent(e.target.value) }/>
            <input type="image" className="newMessageInput__btn" src="images/send.png" alt="Send"/>
        </form>
    );
}

export default NewMessageInput;