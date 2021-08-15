import React from "react";
import "../styles/Header.scss";
import { useHistory } from "react-router-dom";
import ChatAPI from "../helpers/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPowerOff } from '@fortawesome/free-solid-svg-icons'

const Header = () => {
    const history = useHistory();
    return (
        <header className="header">
            <span className="header__title">
                <span aria-hidden="true" style={{fontWeight: "800"}}>&gt;&gt;&gt; </span>
                CONNECT
            </span>
            <FontAwesomeIcon icon={faPowerOff} size="3x" onClick={() => {
                ChatAPI.signOut();
                history.replace("/login");
            }}/>
        </header>
    );
}

export default Header;