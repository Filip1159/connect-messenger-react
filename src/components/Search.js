import React, { useState } from "react";
import "./Search.css";
import api from "../helpers/axios";

const Search = ({ roundedCorner }) => {
    const [ usersQueryResult, setUsersQueryResult ] = useState([]);

    const searchUsersByQuery = async e => {
        const query = e.target.innerText;
        if (query !== "") {
            const res = await api.get(`/user/${query}`, {
                headers: {
                    Authorization: localStorage.getItem("token")
                }
            });
            const data = await res.json();
            setUsersQueryResult(data);
        } else setUsersQueryResult([]);
    }

    return (
        <div className="search" style={{borderBottomRightRadius: roundedCorner ? "20px" : 0}}>
            <img src="./images/search.png" alt="Search" width={100} height={100} />
            <div className="search__container" >
                Szukaj:
                <span className="search__queryInput" contentEditable={true} onInput={searchUsersByQuery}/>
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