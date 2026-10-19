import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { MessageType } from "../../../types";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { sendMessage } from "../../../store/chats/outbox";
import { selectActiveChat } from "../../../store/chats/chatsSlice";
import "./NewMessageInput.scss";
import strings from "../../../strings";
import ChatAPI from "../../../store/ChatAPI";

/* at most one typing notification per this many ms */
const TYPING_THROTTLE = 2500;

const NewMessageInput = () => {
    const dispatch = useAppDispatch();
    const lastTypingSent = useRef(0);
    const [ textContent, setTextContent ] = useState("");
    const [ fileContent, setFileContent ] = useState<File | null>(null)
    const [ type, setType ] = useState<MessageType | null>(null)
    const [ fileInputIcon, setFileInputIcon ] = useState("/images/image_icon.png")

    const activeChat = useAppSelector(selectActiveChat);

    const handlePost = (e: FormEvent) => {
        e.preventDefault();
        const content = type === 'TEXT' ? textContent : fileContent;
        if (!activeChat || !type || !content) return;

        // the message appears at once; a failure is shown on it, with a retry
        sendMessage(dispatch, activeChat.id, type, content);
        setTextContent("");
        setFileContent(null);
        setType(null);
        setFileInputIcon("/images/image_icon.png");
        lastTypingSent.current = 0;
    }

    const notifyTyping = (chatId: number) => {
        const now = Date.now();
        if (now - lastTypingSent.current < TYPING_THROTTLE) return;
        lastTypingSent.current = now;
        ChatAPI.sendTyping(chatId);
    }

    return (
        <form className="newMessageInput" onSubmit={handlePost}>
            <label htmlFor="message_img" className="newMessageInput__fileInputLabel">
                <img src={fileInputIcon} alt={strings.messageInput.attachImage} className="newMessageInput__fileInputLabel__img"/>
            </label>
            <input id="message_img" name="message_img" type="file" className="newMessageInput__fileInput"
                   accept=".jpg, .jpeg, .png, .gif"
                   onChange={e => {
                       const file = e.target.files?.[0]
                       if (!file) return  // file dialog was cancelled
                       setFileContent(file)
                       setTextContent('')
                       setType('FILE')
                       const r = new FileReader()
                       r.readAsDataURL(file)
                       r.onloadend = () => {
                           if (typeof r.result === "string") setFileInputIcon(r.result)
                       }
                   }}
            />
            <input type="text" value={textContent} className="newMessageInput__input" aria-label={strings.messageInput.messageText}
                   onChange={e => {
                       setTextContent(e.target.value)
                       if (activeChat && e.target.value) notifyTyping(activeChat.id)
                       setFileContent(null)
                       setType('TEXT')
                       setFileInputIcon("/images/image_icon.png")
                   }}/>
            <input type="image" className="newMessageInput__btn" src="/images/send.png" alt={strings.messageInput.send}/>
        </form>
    );
}

export default NewMessageInput;