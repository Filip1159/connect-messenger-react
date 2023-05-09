import React, {useContext, useState} from "react";
import "./Search.scss";
import ChatAPI from "../../../store/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import {ChatContext} from "../../../store/chats/ChatContext";

export const Search = ({ roundedCorner }) => {
    const [ usersQueryResult, setUsersQueryResult ] = useState([]);
    const {state: {chats}} = useContext(ChatContext);

    const participatesInChat = (chat, userId) =>
        chat.status[0].id.userId === userId || chat.status[1].id.userId === userId

    const handleInput = async e => {
        const query = e.target.value;
        console.log(chats)
        if (query !== "") {
            ChatAPI.searchUsersByQuery(query).then(users => {
                setUsersQueryResult(users.filter(user => !chats.some(chat => participatesInChat(chat, user.id))))
            });
        } else setUsersQueryResult([]);
    }

    const createNewChat = async recipientId => {
        setUsersQueryResult([])
        ChatAPI.createChat(recipientId)
    }

    return (
        <div className="search" style={{borderBottomRightRadius: roundedCorner ? "20px" : 0}}>
            <FontAwesomeIcon icon={faSearch} size="5x" />
            <div className="search__container" >
                Szukaj:
                <input type="text" className="search__queryInput" onInput={handleInput}/>
                <div className="search__queryResult">
                    <ul>{
                        usersQueryResult.map(u => (
                            <li key={u.username} onClick={() => createNewChat(u.id)}>
                                {`${u.name} ${u.surname}`}
                            </li>
                        ))
                    }</ul>
                </div>
            </div>
        </div>
    );
}
