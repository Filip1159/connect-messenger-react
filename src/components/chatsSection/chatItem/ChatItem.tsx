import { useAppSelector } from "../../../store/hooks";
import { selectAuthDetails } from "../../../store/auth/authSlice";
import { selectPresence } from "../../../store/chats/chatsSlice";
import {getLastMessage, getRecipient} from "../../../store/chats/chatUtils";
import strings from "../../../strings";
import { activateOnKey } from "../../common/keyboard";
import Avatar from "../../common/Avatar";
import type { Chat, Message } from "../../../types";
import "./ChatItem.scss";

const PREVIEW_LENGTH = 35;

const preview = (message: Message): string => {
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
    const user = getRecipient(chat, authDetails?.id);
    if (!user) return null;
    const unread = chat.unreadCount ?? 0;
    const online = presence[user.id]?.online;

    return (
        <div
            className={`chatItem${modifier}${unread > 0 ? " chatItem--unread" : ""}`}
            role="button"
            tabIndex={0}
            aria-current={modifier.includes("--active")}
            onClick={onClick}
            onKeyDown={activateOnKey(onClick)}
        >
            <Avatar username={user.username} />
            <div className="chatItem__details">
                <span className="chatItem__details__nameSurname">
                    {online && <span className="chatItem__presence" role="img" aria-label={strings.presence.online}/>}
                    {user.name + " " + user.surname}
                    {unread > 0 &&
                        <span className="chatItem__badge" role="status" aria-label={`${unread} ${strings.presence.unread}`}>
                            {unread > 99 ? "99+" : unread}
                        </span>}
                </span>
                <span className="chatItem__details__lastMessage">{
                    lastMessage ?
                        (lastMessage.userId === user.id ? user.name : strings.chats.you) + ": " + preview(lastMessage)
                        :
                        strings.chats.noMessages
                }</span>
            </div>
        </div>
    );
}
