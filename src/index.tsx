import {createRoot} from "react-dom/client";
import "./styles/base.scss";
import App from "./App";
import { Provider } from "react-redux";
import store from "./store";

window.addEventListener("resize", () => {
    const vh = window.innerHeight * .01;
    document.documentElement.style.setProperty("--vh", `${vh}px`);
});

const root = createRoot(document.getElementById("root")!)

root.render(
    <Provider store={store}>
        <App />
    </Provider>
)
