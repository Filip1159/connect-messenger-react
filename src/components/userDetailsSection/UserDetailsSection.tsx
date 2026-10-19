import { useState } from "react";
import { useAppSelector } from "../../store/hooks";
import { selectAuthDetails } from "../../store/auth/authSlice";
import Avatar from "../common/Avatar";
import strings from "../../strings";
import { ProfileDialog } from "../profile/ProfileDialog";
import "./UserDetailsSection.scss";

export const UserDetailsSection = () => {
    const authDetails = useAppSelector(selectAuthDetails);
    const [ profileOpen, setProfileOpen ] = useState(false);
    if (!authDetails) return null;

    return (
        <div className="userDetailsSection">
            <Avatar
                user={authDetails}
                className="userDetailsSection__userAvatar"
            />
            <span className="userDetailsSection__nameSurname">{authDetails.name + " " + authDetails.surname}</span>
            <span className="userDetailsSection__username">{authDetails.username}</span>
            <button type="button" className="userDetailsSection__edit" onClick={() => setProfileOpen(true)}>{strings.profile.edit}</button>
            {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
        </div>
    );
}
