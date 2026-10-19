import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import Header from "./components/header/Header";
import {ChatsSection} from "./components/chatsSection/ChatsSection";
import {MessagesSection} from "./components/messagesSection/MessagesSection";
import LoginPage from "./components/loginPage/LoginPage";
import RegisterPage from "./components/registerPage/RegisterPage";
import useSessionExpiry from "./store/auth/useSessionExpiry";
import {UserDetailsSection} from "./components/userDetailsSection/UserDetailsSection";
import ProtectedRoute from "./components/ProtectedRoute";
import useChatSync from "./store/chats/useChatSync";
import useUnreadTitle from "./store/chats/useUnreadTitle";
import useAppearance from "./store/settings/useAppearance";
import { useAppSelector } from "./store/hooks";
import { selectListOpen } from "./store/chats/chatsSlice";
import { selectAuthDetails } from "./store/auth/authSlice";
import { ConnectionBanner } from "./components/status/ConnectionBanner";
import { Announcer } from "./components/status/Announcer";
import strings from "./strings";

const App = () => {
    useAppearance();
    useSessionExpiry();
    useChatSync();
    useUnreadTitle();
    const listOpen = useAppSelector(selectListOpen);
    const signedIn = useAppSelector(selectAuthDetails) !== null;

    const skipToInput = (e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById("message-input")?.focus();
    };

    return (
        <Router>
            {signedIn && <a href="#message-input" className="skipLink" onClick={skipToInput}>{strings.a11y.skipToInput}</a>}
            <Header/>
            {signedIn && <><ConnectionBanner/><Announcer/></>}
            <Routes>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/register" element={<RegisterPage/>}/>
                <Route path="/" element={<ProtectedRoute>
                    <div className={`app__container app__container--${listOpen ? "list" : "chat"}`}>
                        <ChatsSection/>
                        <MessagesSection/>
                        <UserDetailsSection/>
                    </div>
                </ProtectedRoute>
                }/>
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
        </Router>
    );
}

export default App;
