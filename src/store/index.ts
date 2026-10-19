import { combineReducers, configureStore } from "@reduxjs/toolkit";
import authReducer, { getInitialAuthState, resetDetails } from "./auth/authSlice";
import chatsReducer from "./chats/chatsSlice";
import settingsReducer, { loadSettings, saveSettings } from "./settings/settingsSlice";
import uiReducer from "./ui/uiSlice";
import ChatAPI from "./ChatAPI";

const rootReducer = combineReducers({
    auth: authReducer,
    chats: chatsReducer,
    settings: settingsReducer,
    ui: uiReducer
});

export type RootState = ReturnType<typeof rootReducer>;

export const makeStore = (preloadedState?: Partial<RootState>) => configureStore({ reducer: rootReducer, preloadedState });

export type AppDispatch = ReturnType<typeof makeStore>["dispatch"];

const store = makeStore({ auth: getInitialAuthState(), settings: loadSettings() });

// the settings stay on this device
let savedSettings = store.getState().settings;
store.subscribe(() => {
    const settings = store.getState().settings;
    if (settings !== savedSettings) saveSettings(savedSettings = settings);
});

/* ChatAPI signs the user out on its own (expired token, 401 response) - keep the store in sync */
ChatAPI.onSignOut(() => store.dispatch(resetDetails()));

export default store;
