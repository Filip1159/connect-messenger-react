import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import AuthContextProvider from "./contexts/AuthContext";
import ConversationContextProvider from "./contexts/ConversationContext";

ReactDOM.render(
  <React.StrictMode>
    <AuthContextProvider>
      <ConversationContextProvider>
        <App />
      </ConversationContextProvider>
    </AuthContextProvider>
  </React.StrictMode>,
  document.getElementById("root")
);