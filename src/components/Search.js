import React, { useState } from "react";
import "../styles/Search.scss";
import ChatAPI from "../helpers/ChatAPI";

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
            <img src="./images/search.png" alt="Search" width={100} height={100} />
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