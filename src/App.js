import React, { useContext, useEffect, useRef } from "react";
import { BrowserRouter as Router, Route, Redirect, Switch } from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import RightPanel from "./components/RightPanel";
import LeftPanel from "./components/LeftPanel";
import Messages from "./components/Messages";
import LoginPage from "./components/LoginPage";
import { AuthContext } from "./contexts/AuthContext";
import { ConversationContext } from "./contexts/ConversationContext";
import SockJsClient from "react-stomp";

const App = () => {
    const { state: { conversations }, dispatch } = useContext(ConversationContext);
    const initialRender = useRef(true);
    const { authDetails } = useContext(AuthContext);

    useEffect(() => {
        const getConversations = async () => {  /* download all conversation data */
            const response = await fetch(`http://localhost:8080/conversations/${authDetails.userId}`, {
                headers: {
                    Authorization: localStorage.getItem("token")
                }
            });
            const conversations = await response.json();
            dispatch({ type: "SET_CONVERSATIONS", conversations });
            dispatch({ type: "SET_ACTIVE", newActive: 0 });
        };
        if (initialRender.current) initialRender.current = false;
        else getConversations();
        // eslint-disable-next-line
    }, [authDetails]);

    return (
        <Router>
            <Header />
            <Switch>
                <Route path="/login" >
                    <LoginPage />
                </Route>
                <Route path="/" >{
                    authDetails ?
                    <div className="app__container">
                        <SockJsClient
                            url="http://localhost:8080/chat"
                            topics={ conversations.map(c => `/topic/messages/${c.conversationId}`) }
                            onConnect={() => console.log("Connected!")}
                            onDisconnect={() => console.log("Disconnected!")}
                            onMessage={ newMessage => dispatch({ type: "ADD_MESSAGE", newMessage }) }
                            debug={false}
                        />
                        <LeftPanel />
                        <Messages />
                        <RightPanel />
                    </div>
                    :
                    <Redirect to="/login" />
                }</Route>
            </Switch>
        </Router>
    );
}

export default App;