import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxArchive, faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectActiveId, selectChats, setActive } from "../../store/chats/chatsSlice";
import { Search } from "./searchField/Search";
import { ChatItem } from "./chatItem/ChatItem";
import strings from "../../strings";
import type { Chat } from "../../types";
import "./ChatsSection.scss";

export const ChatsSection = () => {
    const chats = useAppSelector(selectChats);
    const activeId = useAppSelector(selectActiveId);
    const dispatch = useAppDispatch();
    const [ archiveOpen, setArchiveOpen ] = useState(false);

    const archived = chats.filter(c => c.archived);
    const unreadArchived = archived.reduce((sum, c) => sum + (c.muted ? 0 : (c.unreadCount ?? 0)), 0);
    // the open archived chat stays visible
    const showArchived = archiveOpen || archived.some(c => c.id === activeId);

    const item = (c: Chat) => (
        <ChatItem
            chat={c}
            modifier={c.id === activeId ? " chatItem--active" : ""}
            onClick={() => dispatch(setActive(c.id))}
            key={c.id}
        />
    );

    return (
        <div className="chatsSection">
            <Search />
            <div className="chatsSection__list">
                {chats.filter(c => !c.archived).map(item)}
                {archived.length > 0 &&
                    <>
                        <button type="button" className="chatsSection__archive" aria-expanded={showArchived}
                                onClick={() => setArchiveOpen(open => !open)}>
                            <FontAwesomeIcon icon={showArchived ? faChevronDown : faChevronRight} />
                            <FontAwesomeIcon icon={faBoxArchive} />
                            <span className="chatsSection__archive__label">{strings.chatOptions.archived} ({archived.length})</span>
                            {unreadArchived > 0 && !showArchived &&
                                <span className="chatItem__badge" role="status" aria-label={`${unreadArchived} ${strings.presence.unread}`}>
                                    {unreadArchived > 99 ? "99+" : unreadArchived}
                                </span>}
                        </button>
                        {showArchived && archived.map(item)}
                    </>}
            </div>
        </div>
    );
}
