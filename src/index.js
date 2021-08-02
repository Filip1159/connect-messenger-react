import React from "react";
import ReactDOM from "react-dom";
import "./styles/base.scss";
import App from "./App";
import AuthContextProvider from "./contexts/AuthContext";
import ChatContextProvider from "./contexts/ChatContext";

ReactDOM.render(
  <AuthContextProvider>
    <ChatContextProvider>
      <App />
    </ChatContextProvider>
  </AuthContextProvider>,
  document.getElementById("root")
);