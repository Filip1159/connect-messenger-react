import "./Header.scss";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import strings from "../../strings";
import ChatAPI from "../../store/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faPowerOff } from '@fortawesome/free-solid-svg-icons'
import { useAppSelector } from "../../store/hooks";
import { selectAuthDetails } from "../../store/auth/authSlice";
import Avatar from "../common/Avatar";
import { ProfileDialog } from "../profile/ProfileDialog";
import { SettingsDialog } from "../settings/SettingsDialog";

const Header = () => {
    const navigate = useNavigate();
    const authDetails = useAppSelector(selectAuthDetails);
    const [ profileOpen, setProfileOpen ] = useState(false);
    const [ settingsOpen, setSettingsOpen ] = useState(false);

    return (
        <header className="header">
            <span className="header__title">
                <span aria-hidden="true" style={{fontWeight: "800"}}>&gt;&gt;&gt; </span>
                {strings.appName}
            </span>
            {authDetails &&
                <div className="header__actions">
                <button
                    type="button"
                    className="header__profile"
                    aria-label={strings.profile.open}
                    title={strings.profile.open}
                    onClick={() => setProfileOpen(true)}
                >
                    <Avatar user={authDetails} alt="" className="header__avatar" />
                    <span className="header__profileName">{authDetails.name}</span>
                </button>
                <button
                    type="button"
                    className="header__logout"
                    aria-label={strings.settings.open}
                    title={strings.settings.open}
                    onClick={() => setSettingsOpen(true)}
                >
                    <FontAwesomeIcon icon={faGear} size="3x" />
                </button>
                <button
                    type="button"
                    className="header__logout"
                    aria-label={strings.header.signOut}
                    title={strings.header.signOut}
                    onClick={() => {
                        ChatAPI.signOut();  // notifies AuthContext, which also clears chats
                        navigate('/login')
                    }}
                >
                    <FontAwesomeIcon icon={faPowerOff} size="3x" />
                </button>
                </div>
            }
            {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}
            {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
        </header>
    );
}

export default Header;