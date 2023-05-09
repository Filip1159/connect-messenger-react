import React, { useContext } from "react";
import "./Header.scss";
import { useNavigate } from "react-router-dom";
import ChatAPI from "../../store/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPowerOff } from '@fortawesome/free-solid-svg-icons'
import { AuthContext } from "../../store/auth/AuthContext";
import { ChatContext } from "../../store/chats/ChatContext";

const Header = () => {
    const navigate = useNavigate();
    const { authDetails, dispatch } = useContext(AuthContext);
    const { dispatch: dispatch_chats } = useContext(ChatContext);

    return (
        <header className="header">
            <span className="header__title">
                <span aria-hidden="true" style={{fontWeight: "800"}}>&gt;&gt;&gt; </span>
                CONNECT
            </span>
            {authDetails &&
                <FontAwesomeIcon icon={faPowerOff} size="3x" onClick={() => {
                    ChatAPI.signOut();
                    dispatch({ type: "RESET_DETAILS" });
                    dispatch_chats({ type: "CLEAR" });
                    navigate('/login')
                }}/>
            }
        </header>
    );
}

export default Header;