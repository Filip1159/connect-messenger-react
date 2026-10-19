import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectSettings, setLanguage, setNotifications, setSound, setTheme } from "../../store/settings/settingsSlice";
import type { Theme } from "../../store/settings/settingsSlice";
import { LOCALES, isLocale } from "../../i18n";
import { notificationsSupported, requestNotificationPermission } from "../../notifications";
import strings from "../../strings";
import { Dialog } from "../common/Dialog";

const THEMES: { id: Theme; label: () => string }[] = [
    { id: "system", label: () => strings.settings.themeSystem },
    { id: "light", label: () => strings.settings.themeLight },
    { id: "dark", label: () => strings.settings.themeDark }
];

/* theme, language and notifications of this device */
export const SettingsDialog = ({ onClose }: { onClose: () => void }) => {
    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectSettings);
    const [ message, setMessage ] = useState("");

    const toggleNotifications = async (wanted: boolean) => {
        setMessage("");
        if (!wanted) return void dispatch(setNotifications(false));
        if (!notificationsSupported()) return setMessage(strings.settings.notificationsUnsupported);
        const granted = await requestNotificationPermission();
        if (!granted) setMessage(strings.settings.notificationsDenied);
        dispatch(setNotifications(granted));
    };

    return (
        <Dialog title={strings.settings.title} onClose={onClose}>
            <fieldset className="dialog__section dialog__fieldset">
                <legend>{strings.settings.theme}</legend>
                {THEMES.map(({ id, label }) => (
                    <label key={id} className="dialog__choice">
                        <input type="radio" name="theme" value={id} checked={settings.theme === id}
                               onChange={() => dispatch(setTheme(id))} />
                        {label()}
                    </label>
                ))}
            </fieldset>

            <div className="dialog__section">
                <div className="dialog__field">
                    <label htmlFor="settings-language">{strings.settings.language}</label>
                    <select id="settings-language" className="dialog__select" value={settings.locale}
                            onChange={e => { if (isLocale(e.target.value)) dispatch(setLanguage(e.target.value)); }}>
                        {LOCALES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                    </select>
                </div>
            </div>

            <fieldset className="dialog__section dialog__fieldset">
                <legend>{strings.settings.notificationsSection}</legend>
                <label className="dialog__choice">
                    <input type="checkbox" checked={settings.notifications} onChange={e => void toggleNotifications(e.target.checked)} />
                    {strings.settings.notifications}
                </label>
                <p className="dialog__hint">{strings.settings.notificationsHint}</p>
                <label className="dialog__choice">
                    <input type="checkbox" checked={settings.sound} onChange={e => dispatch(setSound(e.target.checked))} />
                    {strings.settings.sound}
                </label>
                {message && <p role="alert" className="dialog__error">{message}</p>}
            </fieldset>
        </Dialog>
    );
};
