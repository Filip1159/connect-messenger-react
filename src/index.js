import React from "react";
import ReactDOM from "react-dom";
import "./styles/base.scss";
import App from "./App";
import AuthContextProvider from "./contexts/AuthContext";
import ChatContextProvider from "./contexts/ChatContext";

window.addEventListener("resize", () => {

  let vh = window.innerHeight * .01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);

});

ReactDOM.render(
  <AuthContextProvider>
    <ChatContextProvider>
      <App />
    </ChatContextProvider>
  </AuthContextProvider>,
  document.getElementById("root")
);