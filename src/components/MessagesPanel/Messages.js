import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { ChatContext } from "../../contexts/ChatContext";
import "../../styles/MessagesPanel/Messages.scss";
import NewMessageInput from "./NewMessageInput";
import useLastMessage from "../../hooks/useLastMessage";
import SeenAvatarsPanel from "./SeenAvatarsPanel";
import fall from "../../helpers/FallingAvatar";
import ChatAPI from "../../helpers/ChatAPI";
import SingleMessage from "./SingleMessage";

const Messages = () => {
    const { state: { chats, active } }  = useContext(ChatContext);
    const { authDetails }               = useContext(AuthContext);
    const chat                          = chats[active];
    const { myLastMessage, recipientLastMessage, lastMessage } = useLastMessage(chat, authDetails);
    const [ bottom, setBottom ]         = useState(null);
    const contentDisplayRef             = useRef(null);
    const lastMessageRef                = useRef(null);
    const previousBottom                = useRef(null);
    // eslint-disable-next-line
    const [ dim, setDim ] = useState(0); /* it exists here only because of a need of re-rendering by change either props of state */

    useEffect(() => {
        previousBottom.current = bottom;
    }, [ bottom ]);

    /* callback ref */
    const setLastMessageRef = useCallback(node => {
        if (node) {
            lastMessageRef.current = node;
            if (previousBottom.current) {
                fall(setBottom, previousBottom.current, node.getBoundingClientRect().bottom);
            }
            else setBottom(node.getBoundingClientRect().bottom);
        }
    // eslint-disable-next-line
    }, []);

    /* updates bottom value when switching between chats */
    useEffect(() => {
        if (contentDisplayRef.current) {
            contentDisplayRef.current.scrollTop = contentDisplayRef.current.scrollHeight;
        }
        if (lastMessageRef.current) {
            setBottom(lastMessageRef.current.getBoundingClientRect().bottom);
        }
        // eslint-disable-next-line
    }, [ chat ]);

    useEffect(() => {
        if (myLastMessage && lastMessage && myLastMessage !== lastMessage) {
            ChatAPI.updateStatus(chat.id, lastMessage);
        }
        // eslint-disable-next-line
    }, [ myLastMessage, lastMessage ]);

    useEffect(() => {
        const handleResize = () => {
            setDim(window.innerHeight);
            if (lastMessageRef.current) {
                setBottom(lastMessageRef.current.getBoundingClientRect().bottom);
            }
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    })

    console.log(chats);
    if (chats.length === 0)
        return "Loading...";

    const renderedMessages = chat.messages.map((msg, i) => {
        const reference = recipientLastMessage === msg.id ? setLastMessageRef : null;
        return (
            <SingleMessage key={i} refToMessage={reference} index={i}/>
        );
    });

    const setBottomOnScroll = () => {
        if (lastMessageRef.current) {
            setBottom(lastMessageRef.current.getBoundingClientRect().bottom);
        }
    };

    return <div className="messages">
        <div ref={contentDisplayRef} className="messages__container" onScroll={setBottomOnScroll}>
            <div className="messages__container__displayContent">
                {renderedMessages}
            </div>
            <SeenAvatarsPanel bottom={window.innerHeight - bottom}/>
        </div>
        <NewMessageInput/>
    </div>
}

export default Messages;