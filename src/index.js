import React from "react";
import {createRoot} from "react-dom/client";
import "./styles/base.scss";
import App from "./App";
import AuthContextProvider from "./store/auth/AuthContext";
import ChatContextProvider from "./store/chats/ChatContext";

window.addEventListener("resize", () => {
    let vh = window.innerHeight * .01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
});

const root = createRoot(document.getElementById("root"))

root.render(
    <AuthContextProvider>
        <ChatContextProvider>
            <App />
        </ChatContextProvider>
    </AuthContextProvider>
)
