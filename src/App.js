import React, { useContext, useEffect } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Header from "./components/Header";
import LeftPanel from "./components/LeftPanel";
import Messages from "./components/Messages";
import LoginPage from "./components/LoginPage";
import { AuthContext } from "./contexts/AuthContext";
import { ChatContext } from "./contexts/ChatContext";
import RightPanel from "./components/RightPanel";
import ChatAPI from "./helpers/ChatAPI";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
    const { dispatch } = useContext(ChatContext);
    const { authDetails } = useContext(AuthContext);

    const websocketCallback = incoming => {
        const parsed = JSON.parse(incoming.body);
        if (parsed.content) { // got new message
            dispatch({ type: "ADD_MESSAGE", newMessage: parsed });
        } else {
            dispatch({ type: "UPDATE_STATUS", newStatus: parsed });
        }
    };

    useEffect(() => {
        console.log("authDetails useEffect called");
        console.log("authDetails = ");
        console.log(authDetails);

        if (authDetails) {
            ChatAPI.loadAllChats().then(chats => {
                dispatch({ type: "SET_CHATS", newChats: chats });
                ChatAPI.initWebsocket(chats, websocketCallback);
            });
        }
        // eslint-disable-next-line
    }, [ authDetails ]);

    return (
        <Router>
            <Header />
            <Switch>
                <Route path="/connect-messenger-react/login" >
                    <LoginPage />
                </Route>
                <ProtectedRoute exact path="/connect-messenger-react">
                    <div className="app__container">
                        <LeftPanel />
                        <Messages />
                        <RightPanel />
                    </div>
                </ProtectedRoute>
                <Route path=""/>
            </Switch>
        </Router>
    );
}

export default App;