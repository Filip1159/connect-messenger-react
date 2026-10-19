import { useAppSelector } from "../../../store/hooks";
import { selectAuthDetails } from "../../../store/auth/authSlice";
import { selectActiveChat } from "../../../store/chats/chatsSlice";
import { getRecipient } from "../../../store/chats/chatUtils";
import strings from "../../../strings";
import Avatar from "../../common/Avatar";
import "./SeenAvatar.scss";

interface SeenAvatarProps {
    bottom: number;
    opacity: number;
}

const SeenAvatar = ({ bottom, opacity }: SeenAvatarProps) => {
    const activeChat = useAppSelector(selectActiveChat);
    const authDetails = useAppSelector(selectAuthDetails);
    const recipient = getRecipient(activeChat, authDetails?.id);
    if (!recipient) return null;

    return (
        <Avatar
            user={recipient}
            className="seenAvatar"
            alt={strings.avatar.seen}
            style={{
                bottom: `${bottom}px`,
                opacity: Number.isNaN(opacity) ? 0 : opacity  /* go from top to bottom, from full color to full transparent */
            }}
        />
    )
}

export default SeenAvatar;
