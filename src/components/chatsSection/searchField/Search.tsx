import {useEffect, useRef, useState} from "react";
import type {ChangeEvent} from "react";
import type {User} from "../../../types";
import "./Search.scss";
import ChatAPI from "../../../store/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { useAppSelector } from "../../../store/hooks";
import {selectChats} from "../../../store/chats/chatsSlice";
import strings from "../../../strings";
import {activateOnKey} from "../../common/keyboard";
import {participatesInChat} from "../../../store/chats/chatUtils";

export const Search = ({ roundedCorner }: { roundedCorner: boolean }) => {
    const [ usersQueryResult, setUsersQueryResult ] = useState<User[]>([]);
    const chats = useAppSelector(selectChats);

    const controllerRef = useRef<AbortController | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => () => {
        clearTimeout(timerRef.current);
        controllerRef.current?.abort();
    }, []);

    const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value.trim();
        clearTimeout(timerRef.current);
        controllerRef.current?.abort();  // drop responses of outdated queries

        if (query === "") {
            setUsersQueryResult([]);
            return;
        }

        timerRef.current = setTimeout(() => {
            const controller = new AbortController();
            controllerRef.current = controller;
            ChatAPI.searchUsersByQuery(query, controller.signal)
                .then(users => {
                    setUsersQueryResult(users.filter(user => !chats.some(chat => participatesInChat(chat, user.id))))
                })
                .catch(err => {
                    if (!controller.signal.aborted) console.error("User search failed:", err);
                });
        }, 300);
    }

    const createNewChat = (recipientId: number) => {
        setUsersQueryResult([])
        ChatAPI.createChat(recipientId).catch(e => console.error("Failed to create chat:", e));
    }

    return (
        <div className="search" style={{borderBottomRightRadius: roundedCorner ? "20px" : 0}}>
            <FontAwesomeIcon icon={faSearch} size="5x" />
            <div className="search__container" >
                <label htmlFor="user-search">{strings.chats.search}</label>
                <input id="user-search" type="text" className="search__queryInput" autoComplete="off" onChange={handleInput}/>
                <div className="search__queryResult">
                    <ul>{
                        usersQueryResult.map(u => (
                            <li
                                key={u.username}
                                role="button"
                                tabIndex={0}
                                onClick={() => createNewChat(u.id)}
                                onKeyDown={activateOnKey(() => createNewChat(u.id))}
                            >
                                {`${u.name} ${u.surname}`}
                            </li>
                        ))
                    }</ul>
                </div>
            </div>
        </div>
    );
}
