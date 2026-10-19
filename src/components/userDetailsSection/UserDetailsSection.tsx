import { useAppSelector } from "../../store/hooks";
import { selectAuthDetails } from "../../store/auth/authSlice";
import Avatar from "../common/Avatar";
import "./UserDetailsSection.scss";

export const UserDetailsSection = () => {
    const authDetails = useAppSelector(selectAuthDetails);
    if (!authDetails) return null;

    return (
        <div className="userDetailsSection">
            <Avatar
                username={authDetails.username}
                className="userDetailsSection__userAvatar"
            />
            <span className="userDetailsSection__nameSurname">{authDetails.name + " " + authDetails.surname}</span>
            <span className="userDetailsSection__username">{authDetails.username}</span>
        </div>
    );
}
