import React, {useContext, useEffect} from "react";
import {BrowserRouter as Router, Route, Routes} from "react-router-dom";
import Header from "./components/header/Header";
import { ChatsSection } from "./components/chatsSection/ChatsSection";
import { MessagesSection } from "./components/messagesSection/MessagesSection";
import LoginPage from "./components/loginPage/LoginPage";
import {AuthContext} from "./store/auth/AuthContext";
import {ChatContext} from "./store/chats/ChatContext";
import RightPanel from "./components/userDetailsSection/RightPanel";
import ChatAPI from "./store/ChatAPI";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
    const {dispatch} = useContext(ChatContext);
    const {authDetails} = useContext(AuthContext);

    const messageWebsocketCallback = incoming => {
        const parsed = JSON.parse(incoming.body);
        console.log(parsed)
        if (parsed.content) { // got new message
            dispatch({type: "ADD_MESSAGE", newMessage: parsed});
        } else {
            dispatch({type: "UPDATE_STATUS", newStatus: parsed});
        }
    }

    const newChatWebsocketCallback = incoming => {
        const parsedChat = JSON.parse(incoming.body)
        console.log(parsedChat)
        dispatch({type: "ADD_CHAT", newChat: parsedChat})
        ChatAPI.subscribeToChat(parsedChat.id, messageWebsocketCallback)
    }

    useEffect(() => {
        console.log("authDetails useEffect called");
        console.log("authDetails = ");
        console.log(authDetails);

        if (authDetails) {
            ChatAPI.loadAllChats().then(chats => {
                dispatch({type: "SET_CHATS", newChats: chats});
                ChatAPI.initWebsocket(chats, messageWebsocketCallback, newChatWebsocketCallback);
            });
        }
        // eslint-disable-next-line
    }, [authDetails]);

    return (
        <Router>
            <Header/>
            <Routes>
                <Route path="/login" element={<LoginPage/>}/>
                <Route exact path="/" element={<ProtectedRoute>
                    <div className="app__container">
                        <ChatsSection/>
                        <MessagesSection/>
                        <RightPanel/>
                    </div>
                </ProtectedRoute>
                }/>
                <Route path=""/>
            </Routes>
        </Router>
    );
}

export default App;