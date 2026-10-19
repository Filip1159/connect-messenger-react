import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGroup } from "@fortawesome/free-solid-svg-icons";
import type { Chat } from "../../types";
import { getOthers, getRecipient, isGroup } from "../../store/chats/chatUtils";
import Avatar from "./Avatar";
import "./ChatAvatar.scss";

/* the picture of a chat: the other person, or the first two members of a group side by side */
export const ChatAvatar = ({ chat, myId, className = "" }: { chat: Chat; myId: number | undefined; className?: string }) => {
    if (!isGroup(chat)) {
        const other = getRecipient(chat, myId);
        return other ? <Avatar user={other} alt="" className={className} /> : null;
    }
    const members = getOthers(chat, myId).slice(0, 2);
    return (
        <span className={`chatAvatar ${className}`} aria-hidden="true">
            {members.length === 0
                ? <FontAwesomeIcon icon={faUserGroup} />
                : members.map(u => <Avatar key={u.id} user={u} alt="" className="chatAvatar__member" />)}
        </span>
    );
};
