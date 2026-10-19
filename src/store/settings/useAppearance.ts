import { useEffect } from "react";
import { useAppSelector } from "../hooks";
import { selectLocale, selectTheme } from "./settingsSlice";
import { applyTheme, followDevice } from "./theme";
import { getLocale, setLocale } from "../../i18n";

/* theme and language of the app; call it at the top of the tree */
const useAppearance = () => {
    const theme = useAppSelector(selectTheme);
    const locale = useAppSelector(selectLocale);

    // during the render, so that everything below reads the new texts at once (it only assigns a module variable)
    if (getLocale() !== locale) setLocale(locale);

    useEffect(() => {
        applyTheme(theme);
        return followDevice(theme);
    }, [ theme ]);
}

export default useAppearance;
