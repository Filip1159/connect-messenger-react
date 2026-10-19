import { useState } from "react";
import type { KeyboardEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxArchive, faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectActiveId, selectChats, setActive } from "../../store/chats/chatsSlice";
import { focusConversation, reloadChats, selectChatsStatus } from "../../store/ui/uiSlice";
import { Search } from "./searchField/Search";
import { ChatItem } from "./chatItem/ChatItem";
import strings from "../../strings";
import type { Chat } from "../../types";
import "./ChatsSection.scss";

export const ChatsSection = () => {
    const chats = useAppSelector(selectChats);
    const activeId = useAppSelector(selectActiveId);
    const dispatch = useAppDispatch();
    const status = useAppSelector(selectChatsStatus);
    const [ archiveOpen, setArchiveOpen ] = useState(false);

    /* arrow keys, Home and End move between the chats (and the archive toggle) */
    const moveFocus = (e: KeyboardEvent<HTMLDivElement>) => {
        const keys = [ "ArrowDown", "ArrowUp", "Home", "End" ];
        if (!keys.includes(e.key)) return;
        const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(".chatItem, .chatsSection__archive"));
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (index === -1) return;
        e.preventDefault();
        const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : index + (e.key === "ArrowDown" ? 1 : -1);
        items[Math.max(0, Math.min(items.length - 1, next))].focus();
    };

    const archived = chats.filter(c => c.archived);
    const unreadArchived = archived.reduce((sum, c) => sum + (c.muted ? 0 : (c.unreadCount ?? 0)), 0);
    // the open archived chat stays visible
    const showArchived = archiveOpen || archived.some(c => c.id === activeId);

    const item = (c: Chat) => (
        <ChatItem
            chat={c}
            modifier={c.id === activeId ? " chatItem--active" : ""}
            onClick={() => { dispatch(setActive(c.id)); dispatch(focusConversation()); }}
            key={c.id}
        />
    );

    return (
        <div className="chatsSection">
            <Search />
            <div className="chatsSection__list" role="group" aria-label={strings.a11y.chats} aria-busy={status === "loading"} onKeyDown={moveFocus}>
                {status === "loading" && chats.length === 0 &&
                    <div role="status" className="chatsSection__skeletons">
                        <span className="srOnly">{strings.states.loadingChats}</span>
                        {[ 0, 1, 2, 3, 4 ].map(i => (
                            <div key={i} className="chatsSection__skeleton" aria-hidden="true">
                                <span className="chatsSection__skeletonAvatar"/>
                                <span className="chatsSection__skeletonLines"><span/><span/></span>
                            </div>
                        ))}
                    </div>}
                {status === "failed" &&
                    <div role="alert" className="chatsSection__state">
                        <p>{strings.states.chatsFailed}</p>
                        <button type="button" onClick={() => dispatch(reloadChats())}>{strings.states.retry}</button>
                    </div>}
                {status === "ready" && chats.length === 0 &&
                    <p className="chatsSection__state">{strings.states.noChats}</p>}
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
