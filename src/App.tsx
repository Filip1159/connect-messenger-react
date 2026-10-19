import {BrowserRouter as Router, Navigate, Route, Routes} from "react-router-dom";
import Header from "./components/header/Header";
import {ChatsSection} from "./components/chatsSection/ChatsSection";
import {MessagesSection} from "./components/messagesSection/MessagesSection";
import LoginPage from "./components/loginPage/LoginPage";
import useSessionExpiry from "./store/auth/useSessionExpiry";
import {UserDetailsSection} from "./components/userDetailsSection/UserDetailsSection";
import ProtectedRoute from "./components/ProtectedRoute";
import useChatSync from "./store/chats/useChatSync";
import useUnreadTitle from "./store/chats/useUnreadTitle";
import { useAppSelector } from "./store/hooks";
import { selectListOpen } from "./store/chats/chatsSlice";

const App = () => {
    useSessionExpiry();
    useChatSync();
    useUnreadTitle();
    const listOpen = useAppSelector(selectListOpen);

    return (
        <Router>
            <Header/>
            <Routes>
                <Route path="/login" element={<LoginPage/>}/>
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
