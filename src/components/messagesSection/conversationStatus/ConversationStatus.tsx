import { useAppSelector } from "../../../store/hooks";
import { selectAuthDetails } from "../../../store/auth/authSlice";
import { selectPresence, selectTyping } from "../../../store/chats/chatsSlice";
import { getRecipient } from "../../../store/chats/chatUtils";
import { formatLastSeen } from "../../../lastSeen";
import strings from "../../../strings";
import type { Chat } from "../../../types";
import "./ConversationStatus.scss";

/* who I'm talking to, whether they are online or writing right now */
export const ConversationStatus = ({ chat }: { chat: Chat }) => {
    const authDetails = useAppSelector(selectAuthDetails);
    const presence = useAppSelector(selectPresence);
    const typing = useAppSelector(selectTyping);

    const recipient = getRecipient(chat, authDetails?.id);
    if (!recipient) return null;

    const state = presence[recipient.id];
    const isTyping = typing[chat.id]?.includes(recipient.id);
    let text = "";
    if (isTyping) text = strings.presence.typing;
    else if (state?.online) text = strings.presence.online;
    else if (state?.lastSeen) text = `${strings.presence.lastSeen} ${formatLastSeen(state.lastSeen)}`;

    return (
        <div className="conversationStatus">
            <span className="conversationStatus__name">{recipient.name + " " + recipient.surname}</span>
            <span
                className={`conversationStatus__state${state?.online ? " conversationStatus__state--online" : ""}`}
                role="status"
            >
                {text}
            </span>
        </div>
    );
};
