import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import { detectLocale, isLocale } from "../../i18n";
import type { Locale } from "../../i18n";

export type Theme = "system" | "light" | "dark";

/* per-device choices of the user, kept in localStorage */
export interface SettingsState {
    theme: Theme;
    locale: Locale;
    notifications: boolean; // desktop notifications about new messages
    sound: boolean; // a short beep with them
}

export const initialSettingsState: SettingsState = { theme: "system", locale: "en", notifications: false, sound: true };

const STORAGE_KEY = "settings";

const isTheme = (value: unknown): value is Theme => value === "system" || value === "light" || value === "dark";

/* whatever is stored, only valid values are taken; the language defaults to the browser's */
export const loadSettings = (): SettingsState => {
    let stored: Partial<Record<keyof SettingsState, unknown>> = {};
    try {
        stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
    } catch {
        // storage unavailable or damaged: the defaults apply
    }
    return {
        theme: isTheme(stored.theme) ? stored.theme : initialSettingsState.theme,
        locale: isLocale(stored.locale) ? stored.locale : detectLocale(),
        notifications: stored.notifications === true,
        sound: stored.sound !== false
    };
};

export const saveSettings = (settings: SettingsState) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // storage unavailable: the choice lasts until the page is closed
    }
};

const settingsSlice = createSlice({
    name: "settings",
    initialState: initialSettingsState,
    reducers: {
        setTheme: (state, action: PayloadAction<Theme>) => {
            state.theme = action.payload;
        },
        setLanguage: (state, action: PayloadAction<Locale>) => {
            state.locale = action.payload;
        },
        setNotifications: (state, action: PayloadAction<boolean>) => {
            state.notifications = action.payload;
        },
        setSound: (state, action: PayloadAction<boolean>) => {
            state.sound = action.payload;
        }
    }
});

export const { setTheme, setLanguage, setNotifications, setSound } = settingsSlice.actions;

export const selectSettings = (state: RootState) => state.settings;
export const selectTheme = (state: RootState) => state.settings.theme;
export const selectLocale = (state: RootState) => state.settings.locale;

export default settingsSlice.reducer;
