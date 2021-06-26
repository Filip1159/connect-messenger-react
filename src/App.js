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

function App() {
    const { dispatch } = useContext(ConversationContext);
    const initialRender = useRef(true);
    const { authDetails } = useContext(AuthContext);

    const getConvs = async () => {
        const response = await fetch(`http://localhost:8080/conversations/${authDetails.userId}`, {
            headers: {
                Authorization: localStorage.getItem("token")
            }
        });
        const conversations = await response.json();
        dispatch({ type: "SET_CONVERSATIONS", conversations });
        dispatch({ type: "SET_ACTIVE", newActive: 0 });
    };

    useEffect(() => {
        const fun = async () => {
            await getConvs()
        };
        if (initialRender.current) initialRender.current = false;
        else fun();
        // eslint-disable-next-line
    }, [authDetails]);

    return (
        <>
            <Router>
                <Header />
                <Switch>
                    <Route path="/login" >
                        <LoginPage />
                    </Route>
                    <Route path="/" >{
                        authDetails ?
                        <div className="app__container">
                            <LeftPanel />
                            <Messages />
                            <RightPanel />
                        </div>
                        :
                        <Redirect to="/login" />
                    }</Route>
                </Switch>
            </Router>
        </>
    );
}

export default App;