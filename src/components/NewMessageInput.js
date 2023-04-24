import React, { useContext, useState } from "react";
import { ChatContext } from "../contexts/ChatContext";
import "../styles/NewMessageInput.scss";
import ChatAPI from "../helpers/ChatAPI";

const NewMessageInput = () => {
    const [ textContent, setTextContent ] = useState("");
    const [ fileContent, setFileContent ] = useState()
    const [ type, setType ] = useState('')
    const [ fileInputIcon, setFileInputIcon ] = useState("/images/image_icon.png")

    const { state: { chats, active } } = useContext(ChatContext);

    const handlePost = e => {
        e.preventDefault();
        if ((type === 'TEXT' && textContent) || (type === 'FILE' && fileContent)) {
            ChatAPI.postMessage(chats[active].id, type, type === 'TEXT' ? textContent : fileContent);
            setTextContent("");
            setFileContent(null)
            setFileInputIcon("/images/image_icon.png")
        }
    }

    return (
        <form className="newMessageInput" onSubmit={handlePost}>
            <label htmlFor="message_img" className="newMessageInput__fileInputLabel">
                <img src={fileInputIcon} alt="Send" className="newMessageInput__fileInputLabel__img"/>
            </label>
            <input id="message_img" name="message_img" type="file" className="newMessageInput__fileInput"
                   accept=".jpg, .jpeg, .png, .gif"
                   onChange={e => {
                       setFileContent(e.target.files[0])
                       setTextContent('')
                       setType('FILE')
                       console.log(e.target.files[[0]])
                       const r = new FileReader()
                       r.readAsDataURL(e.target.files[0])
                       r.onloadend = ev => setFileInputIcon(ev.target.result)
                   }}
            />
            <input type="text" value={textContent} className="newMessageInput__input"
                   onInput={e => {
                       setTextContent(e.target.value)
                       setFileContent(null)
                       setType('TEXT')
                       setFileInputIcon("/images/image_icon.png")
                   }}/>
            <input type="image" className="newMessageInput__btn" src="/images/send.png" alt="Send"/>
        </form>
    );
}

export default NewMessageInput;