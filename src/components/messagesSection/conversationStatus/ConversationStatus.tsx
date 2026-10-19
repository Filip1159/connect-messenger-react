import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import Avatar from "../../common/Avatar";
import { selectAuthDetails } from "../../../store/auth/authSlice";
import { selectPresence, selectTyping, showChatList } from "../../../store/chats/chatsSlice";
import { getRecipient } from "../../../store/chats/chatUtils";
import { formatLastSeen } from "../../../lastSeen";
import strings from "../../../strings";
import type { Chat } from "../../../types";
import "./ConversationStatus.scss";

/* who I'm talking to, whether they are online or writing right now */
export const ConversationStatus = ({ chat, onSearch }: { chat: Chat; onSearch?: () => void }) => {
    const dispatch = useAppDispatch();
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
            <button type="button" className="conversationStatus__back" aria-label={strings.chats.back} onClick={() => dispatch(showChatList())}>
                <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <Avatar username={recipient.username} alt="" className="conversationStatus__avatar" />
            <div className="conversationStatus__text">
                <span className="conversationStatus__name">{recipient.name + " " + recipient.surname}</span>
                <span
                    className={`conversationStatus__state${state?.online ? " conversationStatus__state--online" : ""}`}
                    role="status"
                >
                    {text}
                </span>
            </div>
            {onSearch &&
                <button type="button" className="conversationStatus__search" aria-label={strings.search.open} onClick={onSearch}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>}
        </div>
    );
};
