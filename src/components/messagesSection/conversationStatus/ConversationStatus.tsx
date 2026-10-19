import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faCircleInfo, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { ChatAvatar } from "../../common/ChatAvatar";
import { selectAuthDetails } from "../../../store/auth/authSlice";
import { selectPresence, selectTyping, showChatList } from "../../../store/chats/chatsSlice";
import { chatTitle, getOthers, getRecipient, isGroup } from "../../../store/chats/chatUtils";
import { formatLastSeen } from "../../../lastSeen";
import strings from "../../../strings";
import type { Chat } from "../../../types";
import { ChatDetailsDialog } from "../../chatOptions/ChatDetailsDialog";
import "./ConversationStatus.scss";

/* who I'm talking to, whether they are online or writing right now */
export const ConversationStatus = ({ chat, onSearch }: { chat: Chat; onSearch?: () => void }) => {
    const dispatch = useAppDispatch();
    const authDetails = useAppSelector(selectAuthDetails);
    const presence = useAppSelector(selectPresence);
    const typing = useAppSelector(selectTyping);
    const [ detailsOpen, setDetailsOpen ] = useState(false);

    const myId = authDetails?.id;
    const group = isGroup(chat);
    const recipient = getRecipient(chat, myId);
    if (!recipient) return null;

    const state = presence[recipient.id];
    const writing = (typing[chat.id] ?? []).filter(id => id !== myId);
    let text = "";
    let online = false;
    if (group) {
        const names = getOthers(chat, myId).filter(u => writing.includes(u.id)).map(u => u.name);
        text = names.length > 0
            ? `${names.join(", ")} ${names.length > 1 ? strings.group.areTyping : strings.group.isTyping}`
            : `${chat.users.length} ${strings.group.memberCount}`;
    } else {
        online = !!state?.online;
        if (writing.includes(recipient.id)) text = strings.presence.typing;
        else if (state?.online) text = strings.presence.online;
        else if (state?.lastSeen) text = `${strings.presence.lastSeen} ${formatLastSeen(state.lastSeen)}`;
    }

    return (
        <div className="conversationStatus">
            <button type="button" className="conversationStatus__back" aria-label={strings.chats.back} onClick={() => dispatch(showChatList())}>
                <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <span className="conversationStatus__avatar"><ChatAvatar chat={chat} myId={myId} /></span>
            <div className="conversationStatus__text">
                <span className="conversationStatus__name">{chatTitle(chat, myId)}</span>
                <span
                    className={`conversationStatus__state${online ? " conversationStatus__state--online" : ""}`}
                    role="status"
                >
                    {text}
                </span>
            </div>
            {onSearch &&
                <button type="button" className="conversationStatus__search" aria-label={strings.search.open} onClick={onSearch}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>}
            <button type="button" className="conversationStatus__search" aria-label={strings.chatOptions.open} onClick={() => setDetailsOpen(true)}>
                <FontAwesomeIcon icon={faCircleInfo} />
            </button>
            {detailsOpen && <ChatDetailsDialog chatId={chat.id} onClose={() => setDetailsOpen(false)} />}
        </div>
    );
};
