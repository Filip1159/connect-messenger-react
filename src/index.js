import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import AuthContextProvider from "./contexts/AuthContext";
import ConversationContextProvider from "./contexts/ConversationContext";

ReactDOM.render(
  <AuthContextProvider>
    <ConversationContextProvider>
      <App />
    </ConversationContextProvider>
  </AuthContextProvider>,
  document.getElementById("root")
);