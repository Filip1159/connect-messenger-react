import React, { useState } from "react";
import "../styles/Search.scss";
import ChatAPI from "../helpers/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

const Search = ({ roundedCorner }) => {
    const [ usersQueryResult, setUsersQueryResult ] = useState([]);

    const handleInput = async e => {
        const query = e.target.value;
        if (query !== "") {
            ChatAPI.searchUsersByQuery(query).then(results => {
                setUsersQueryResult(results);
            });
        } else setUsersQueryResult([]);
    }

    return (
        <div className="search" style={{borderBottomRightRadius: roundedCorner ? "20px" : 0}}>
            <FontAwesomeIcon icon={faSearch} size="5x" />
            <div className="search__container" >
                Szukaj:
                <input type="text" className="search__queryInput" onInput={handleInput}/>
                <div className="search__queryResult">
                    <ul>{
                        usersQueryResult.map(u => <li key={u.username}>{`${u.name} ${u.surname}`}</li>)
                    }</ul>
                </div>
            </div>
        </div>
    );
}

export default Search;