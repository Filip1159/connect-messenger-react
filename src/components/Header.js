import React from "react";
import "./Header.css";
import { useHistory } from "react-router-dom";

const Header = () => {
    const history = useHistory();
    return (
        <header className="header">
            <span className="header__title">SpringChat</span>
            <img src="./images/logout.png" alt="Logout" className="header__logoutBtn" onClick={() => {
                localStorage.removeItem("token");
                history.push("/login");
            }}/>
        </header>
    );
}

export default Header;