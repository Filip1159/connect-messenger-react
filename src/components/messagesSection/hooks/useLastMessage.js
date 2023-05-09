import {useState, useEffect} from "react";

/* returns information about messages (their IDs), that were displayed most recent by chat participants */
const useLastMessage = (chat, authDetails) => {
    const [myLastMessage, setMyLastMessage] = useState(null);
    const [recipientLastMessage, setRecipientLastMessage] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);

    useEffect(() => {
        if (chat && authDetails) {
            let userIndex = chat.status[0].id.userId === authDetails.id ? 0 : 1;
            let recipientIndex = chat.status[0].id.userId !== authDetails.id ? 0 : 1;

            if (typeof userIndex === "number" && typeof recipientIndex === "number") {
                setMyLastMessage(chat?.status[userIndex].messageId);
                setRecipientLastMessage(chat?.status[recipientIndex].messageId);
                setLastMessage(chat?.messages[chat?.messages.length - 1]?.id);
            }
        }
    }, [chat, authDetails]);

    return {myLastMessage, recipientLastMessage, lastMessage}
}

export default useLastMessage