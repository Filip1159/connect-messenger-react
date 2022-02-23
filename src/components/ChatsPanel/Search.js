import React, {useContext, useState} from "react";
import "../../styles/ChatsPanel/Search.scss";
import ChatAPI from "../../helpers/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import {ChatContext} from "../../contexts/ChatContext";

const Search = () => {
    const { state: { chats, active } } = useContext(ChatContext);
    const [ usersQueryResult, setUsersQueryResult ] = useState([]);

    const shouldHaveRoundedCorner = active === 0 && chats.length > 0;
    const optionalModifier = shouldHaveRoundedCorner ? " search--roundedCorner" : "";

    const searchForUsers = async e => {
        const query = e.target.value;
        if (query !== "") {
            const results = await ChatAPI.searchUsersByQuery(query)
            setUsersQueryResult(results);
        } else setUsersQueryResult([]);
    }

    const renderedQueryResults = usersQueryResult.map(u => <li key={u.username}>{`${u.name} ${u.surname}`}</li>);

    return (
        <div className={`search${optionalModifier}`}>
            <FontAwesomeIcon icon={faSearch} size="5x" />
            <div className="search__container" >
                Search:
                <input type="text" className="search__queryInput" onInput={searchForUsers}/>
                <div className="search__queryResult">
                    <ul>{renderedQueryResults}</ul>
                </div>
            </div>
        </div>
    );
}

export default Search;