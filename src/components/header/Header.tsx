import "./Header.scss";
import { useNavigate } from "react-router-dom";
import strings from "../../strings";
import ChatAPI from "../../store/ChatAPI";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPowerOff } from '@fortawesome/free-solid-svg-icons'
import { useAppSelector } from "../../store/hooks";
import { selectAuthDetails } from "../../store/auth/authSlice";

const Header = () => {
    const navigate = useNavigate();
    const authDetails = useAppSelector(selectAuthDetails);

    return (
        <header className="header">
            <span className="header__title">
                <span aria-hidden="true" style={{fontWeight: "800"}}>&gt;&gt;&gt; </span>
                {strings.appName}
            </span>
            {authDetails &&
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
            }
        </header>
    );
}

export default Header;