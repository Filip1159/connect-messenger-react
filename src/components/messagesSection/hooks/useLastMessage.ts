import { useMemo } from "react";
import type { AuthDetails, Chat } from "../../../types";
import { getLastMessage, getMyStatus, getRecipientStatus } from "../../../store/chats/chatUtils";

/* returns information about messages (their IDs), that were displayed most recent by chat participants */
interface LastMessages {
    myLastMessage: number | null;
    recipientLastMessage: number | null;
    lastMessage: number | null;
}

const useLastMessage = (chat: Chat | null, authDetails: AuthDetails | null): LastMessages => useMemo(() => {
    if (!chat || !authDetails) {
        return { myLastMessage: null, recipientLastMessage: null, lastMessage: null };
    }
    return {
        myLastMessage: getMyStatus(chat, authDetails.id)?.messageId ?? null,
        recipientLastMessage: getRecipientStatus(chat, authDetails.id)?.messageId ?? null,
        lastMessage: getLastMessage(chat)?.id ?? null
    };
}, [chat, authDetails]);

export default useLastMessage;
