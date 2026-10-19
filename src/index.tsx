import {createRoot} from "react-dom/client";
import "./styles/base.scss";
import App from "./App";
import { Provider } from "react-redux";
import store from "./store";
import { applyTheme } from "./store/settings/theme";
import { setLocale } from "./i18n";

// before the first render, so the page doesn't flash in the wrong theme or language
applyTheme(store.getState().settings.theme);
setLocale(store.getState().settings.locale);

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
