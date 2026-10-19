import en from "./en";
import type { Strings } from "./en";
import pl from "./pl";

export type Locale = "en" | "pl";

export const LOCALES: { id: Locale; label: string }[] = [
    { id: "en", label: "English" },
    { id: "pl", label: "Polski" }
];

const dictionaries: Record<Locale, Strings> = { en, pl };
let current: Locale = "en";

export const isLocale = (value: unknown): value is Locale => value === "en" || value === "pl";

/* the browser language when it is one of ours */
export const detectLocale = (): Locale => (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("pl")) ? "pl" : "en";

export const getLocale = (): Locale => current;

export const setLocale = (locale: Locale) => {
    current = locale;
    if (typeof document !== "undefined") document.documentElement.lang = locale;
};

/* the texts of the current language; read at use time, so a language change shows on the next render */
const strings = new Proxy({} as Strings, {
    get: (_, key: string) => dictionaries[current][key as keyof Strings]
});

export default strings;
