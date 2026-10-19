import type { Theme } from "./settingsSlice";

const DARK_QUERY = "(prefers-color-scheme: dark)";

/* "system" follows the device; anything else is the choice itself */
export const resolveTheme = (theme: Theme, deviceIsDark: boolean): "light" | "dark" =>
    theme === "system" ? (deviceIsDark ? "dark" : "light") : theme;

export const deviceIsDark = (): boolean =>
    typeof window.matchMedia !== "function" || window.matchMedia(DARK_QUERY).matches;

/* the colours are CSS variables chosen by data-theme on <html> */
export const applyTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = resolveTheme(theme, deviceIsDark());
};

/* re-applies a "system" theme when the device switches; returns the function that stops listening */
export const followDevice = (theme: Theme): (() => void) => {
    if (theme !== "system" || typeof window.matchMedia !== "function") return () => {};
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme(theme);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
};
