import React, { useContext, useEffect } from "react";
import { BrowserRouter as Router, Route, Redirect, Switch } from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import RightPanel from "./components/RightPanel";
import LeftPanel from "./components/LeftPanel";
import Messages from "./components/Messages";
import LoginPage from "./components/LoginPage";
import { AuthContext } from "./contexts/AuthContext";
import { ChatContext } from "./contexts/ChatContext";
import SockJsClient from "react-stomp";

const App = () => {
    const { state: { chats }, dispatch } = useContext(ChatContext);
    const { authDetails } = useContext(AuthContext);

    useEffect(() => {
        const getChats = async () => {  /* download all chat data */
            const response = await fetch(`http://localhost:8080/chats/${authDetails.id}`, {
                headers: {
                    Authorization: localStorage.getItem("token")
                }
            });
            const newChats = await response.json();
            dispatch({ type: "SET_CHATS", newChats });
            dispatch({ type: "SET_ACTIVE", newActive: 0 });
        };
        if (authDetails) getChats();
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
                            url="http://localhost:8080/websocket"
                            topics={ chats.map(c => `/topic/messages/${c.id}`) }
                            onConnect={() => console.log("Connected!")}
                            onDisconnect={() => console.log("Disconnected!")}
                            onMessage={ incoming => {
                                if (incoming.content !== undefined) { // got new message
                                    console.log("New message from websocket: ", incoming);
                                    dispatch({ type: "ADD_MESSAGE", newMessage: incoming });
                                } else {
                                    console.log("Status update from websocket: ", incoming);
                                    dispatch({ type: "UPDATE_STATUS", newStatus: incoming });
                                } 
                            }}
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