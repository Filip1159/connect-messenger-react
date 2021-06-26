import React, { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import "./RightPanel.css";

const RightPanel = () => {
    const { authDetails } = useContext(AuthContext);
    return (
        <div className="rightPanel">
            <div className="rightPanel__userData">
                <img src={`./images/avatars/${authDetails.username}.png`} alt="User avatar" className="rightPanel__userAvatar" />
                <span className="rightPanel__nameSurname">{`${authDetails.name} ${authDetails.surname}`}</span>
                <span className="rightPanel__username">{authDetails.username}</span>
            </div>
            <img src="./images/spring-logo.png" alt="Spring logo" className="rightPanel__springLogo" />
        </div>
    );
}

export default RightPanel;