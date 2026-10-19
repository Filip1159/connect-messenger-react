import { useAppSelector } from "../../../store/hooks";
import { selectAuthDetails } from "../../../store/auth/authSlice";
import { selectPresence } from "../../../store/chats/chatsSlice";
import { chatTitle, getLastMessage, getRecipient, isGroup } from "../../../store/chats/chatUtils";
import strings from "../../../strings";
import { activateOnKey } from "../../common/keyboard";
import { ChatAvatar } from "../../common/ChatAvatar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBellSlash } from "@fortawesome/free-solid-svg-icons";
import type { Chat, Message } from "../../../types";
import "./ChatItem.scss";

const PREVIEW_LENGTH = 35;

const preview = (message: Message): string => {
    if (message.deleted) return strings.chats.deleted;
    if (message.type === "FILE") return strings.chats.photo;
    return message.content.substring(0, PREVIEW_LENGTH) + (message.content.length > PREVIEW_LENGTH ? "..." : "");
};

interface ChatItemProps {
    chat: Chat;
    modifier: string;
    onClick: () => void;
}

export const ChatItem = ({chat, modifier, onClick}: ChatItemProps) => {
    const authDetails = useAppSelector(selectAuthDetails);
    const presence = useAppSelector(selectPresence);
    const lastMessage = getLastMessage(chat);
    const group = isGroup(chat);
    const user = getRecipient(chat, authDetails?.id);
    if (!user) return null;
    const unread = chat.unreadCount ?? 0;
    const online = !group && presence[user.id]?.online;
    const title = chatTitle(chat, authDetails?.id);

    /* who wrote the last message: "Ty", or the first name of the author */
    const author = lastMessage && (lastMessage.userId === authDetails?.id
        ? strings.chats.you
        : chat.users.find(u => u.id === lastMessage.userId)?.name ?? user.name);

    return (
        <div
            className={`chatItem${modifier}${unread > 0 ? " chatItem--unread" : ""}${chat.muted ? " chatItem--muted" : ""}`}
            role="button"
            tabIndex={0}
            aria-current={modifier.includes("--active")}
            onClick={onClick}
            onKeyDown={activateOnKey(onClick)}
        >
            <div className="chatItem__avatar">
                <ChatAvatar chat={chat} myId={authDetails?.id} />
                {online && <span className="chatItem__presence" role="img" aria-label={strings.presence.online}/>}
            </div>
            <div className="chatItem__details">
                <span className="chatItem__details__nameSurname">
                    <span className="chatItem__details__name">{title}</span>
                    {chat.muted &&
                        <span className="chatItem__mutedIcon" role="img" aria-label={strings.chatOptions.muted} title={strings.chatOptions.muted}>
                            <FontAwesomeIcon icon={faBellSlash} />
                        </span>}
                    {unread > 0 &&
                        <span className="chatItem__badge" role="status" aria-label={`${unread} ${strings.presence.unread}`}>
                            {unread > 99 ? "99+" : unread}
                        </span>}
                </span>
                <span className="chatItem__details__lastMessage">{
                    lastMessage ?
                        author + ": " + preview(lastMessage)
                        :
                        strings.chats.noMessages
                }</span>
            </div>
        </div>
    );
}
