import { useState } from "react";
import type { User } from "../../../types";
import "./Search.scss";
import ChatAPI from "../../../store/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { useAppDispatch } from "../../../store/hooks";
import { setActive, upsertChat } from "../../../store/chats/chatsSlice";
import strings from "../../../strings";
import {activateOnKey} from "../../common/keyboard";
import Avatar from "../../common/Avatar";
import { useUserSearch } from "../../common/useUserSearch";
import { NewGroupDialog } from "../../newGroup/NewGroupDialog";

export const Search = () => {
    const dispatch = useAppDispatch();
    const [ text, setText ] = useState("");
    const [ groupOpen, setGroupOpen ] = useState(false);
    const { users, query, searching, failed } = useUserSearch(text);

    /* an existing chat with the person is opened instead of a second one */
    const openChat = (user: User) => {
        setText("");
        ChatAPI.createChat([ user.id ])
            .then(chat => {
                dispatch(upsertChat(chat));
                dispatch(setActive(chat.id));
            })
            .catch(e => console.error("Failed to create chat:", e));
    }

    return (
        <div className="search">
            <label htmlFor="user-search" className="srOnly">{strings.chats.search}</label>
            <div className="search__row">
                <div className="search__field">
                    <FontAwesomeIcon icon={faSearch} className="search__icon" />
                    <input id="user-search" type="text" className="search__queryInput" autoComplete="off"
                           placeholder={strings.chats.searchPlaceholder} value={text} onChange={e => setText(e.target.value)}/>
                </div>
                <button type="button" className="search__newGroup" aria-label={strings.group.newGroup}
                        title={strings.group.newGroup} onClick={() => setGroupOpen(true)}>
                    <FontAwesomeIcon icon={faUserGroup} />
                </button>
            </div>
            {query !== "" &&
                <div className="search__queryResult">
                    {query.length < 2 && <p role="status" className="search__state">{strings.states.typeMore}</p>}
                    {query.length >= 2 && searching && <p role="status" className="search__state">{strings.states.searching}</p>}
                    {failed && <p role="alert" className="search__state">{strings.search.failed}</p>}
                    {query.length >= 2 && !searching && !failed && users.length === 0 &&
                        <p role="status" className="search__state">{strings.states.noPeople}</p>}
                    <ul>{
                        users.map(u => (
                            <li
                                key={u.username}
                                role="button"
                                tabIndex={0}
                                onClick={() => openChat(u)}
                                onKeyDown={activateOnKey(() => openChat(u))}
                            >
                                <Avatar user={u} alt="" className="search__avatar"/>
                                {`${u.name} ${u.surname}`}
                            </li>
                        ))
                    }</ul>
                </div>}
            {groupOpen && <NewGroupDialog onClose={() => setGroupOpen(false)} />}
        </div>
    );
}
