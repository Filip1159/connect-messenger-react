import React, { useContext } from "react";
import { AuthContext } from "../../store/auth/AuthContext";
import "./RightPanel.scss";

const RightPanel = () => {
    const { authDetails } = useContext(AuthContext);
    return (
        <div className="rightPanel">
            <img
                src={`./images/avatars/${authDetails.username}.png`}
                alt="User avatar"
                className="rightPanel__userAvatar"
            />
            <span className="rightPanel__nameSurname">{authDetails.name + " " + authDetails.surname}</span>
            <span className="rightPanel__username">{authDetails.username}</span>
        </div>
    );
}

export default RightPanel;