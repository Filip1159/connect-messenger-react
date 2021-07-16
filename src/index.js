import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
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