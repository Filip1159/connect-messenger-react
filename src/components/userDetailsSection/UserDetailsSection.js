import React, { useContext } from "react";
import { AuthContext } from "../../store/auth/AuthContext";
import "./UserDetailsSection.scss";

export const UserDetailsSection = () => {
    const { authDetails } = useContext(AuthContext);
    return (
        <div className="userDetailsSection">
            <img
                src={`./images/avatars/${authDetails.username}.png`}
                alt="User avatar"
                className="userDetailsSection__userAvatar"
            />
            <span className="userDetailsSection__nameSurname">{authDetails.name + " " + authDetails.surname}</span>
            <span className="userDetailsSection__username">{authDetails.username}</span>
        </div>
    );
}
