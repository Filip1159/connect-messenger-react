import { useState, useEffect } from "react";

/* about hooks: even if they are re-rendered, their useState stays remembered */
const useChat = (chats, active) => {
    const [ chat, setChat ] = useState(chats[active]);

    useEffect(() => {
        if (chats && typeof active === "number" )
            setChat(chats[active]);
        // eslint-disable-next-line
    }, [ chats, active ]);

    return chat;
}

export default useChat;