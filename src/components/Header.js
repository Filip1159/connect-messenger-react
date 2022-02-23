import React, { useContext } from "react";
import "../styles/Header.scss";
import { useHistory } from "react-router-dom";
import ChatAPI from "../helpers/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPowerOff } from '@fortawesome/free-solid-svg-icons'
import { AuthContext } from "../contexts/AuthContext";
import { ChatContext } from "../contexts/ChatContext";

const Header = () => {
    const history = useHistory();
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
                    history.replace("/connect-messenger-react/login");
                }}/>
            }
        </header>
    );
}

export default Header;