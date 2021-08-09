import React from "react";
import "../styles/Header.scss";
import { useHistory } from "react-router-dom";
import ChatAPI from "../helpers/ChatAPI";

const Header = () => {
    const history = useHistory();
    return (
        <header className="header">
            <span className="header__title">SpringChat</span>
            <img src="./images/logout.png" alt="Logout" className="header__logoutBtn" onClick={() => {
                ChatAPI.signOut();
                history.replace("/login");
            }}/>
        </header>
    );
}

export default Header;