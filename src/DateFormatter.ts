import { getLocale } from "./i18n";

const pad = (n: number): string => String(n).padStart(2, "0");
/* building an Intl formatter is slow, and every row asks for one */
const weekdayFormats = new Map<string, Intl.DateTimeFormat>();
const FIVE_MINUTES = 5 * 60 * 1000;

/* prevDate / nextDate are null for the first / last message */
class DateFormatter {

    constructor(
        private readonly prevDate: Date | null,
        private readonly currentDate: Date,
        private readonly nextDate: Date | null
    ) {}

    /* the weekday in the language of the app, with a capital letter */
    static #day(date: Date): string {
        const locale = getLocale();
        let format = weekdayFormats.get(locale);
        if (!format) weekdayFormats.set(locale, format = new Intl.DateTimeFormat(locale, { weekday: "long" }));
        const name = format.format(date);
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    /* accepts "2021-05-04T12:30:15", "2021-05-04 12:30", fractional seconds and explicit timezones */
    static sqlToDateObject(sqlString: string): Date {
        const iso = sqlString.replace(" ", "T");
        const hasTimezone = /(Z|[+-]\d{2}:?\d{2})$/.test(iso);
        return new Date(hasTimezone ? iso : iso.slice(0, 19));
    }

    currentToHourMinute(): string {
        return `${pad(this.currentDate.getHours())}:${pad(this.currentDate.getMinutes())}`;
    }

    currentToPretty(): string {
        const d = this.currentDate;
        return `${DateFormatter.#day(d)}, ${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}, ${this.currentToHourMinute()}`;
    }

    displayDayIfDifferent(): string {
        const sameDay = this.prevDate && this.prevDate.toDateString() === this.currentDate.toDateString();
        return sameDay ? "" : `${DateFormatter.#day(this.currentDate)}, `;
    }

    is5MinDiffBefore(): boolean {
        return !!this.prevDate && this.currentDate.getTime() - this.prevDate.getTime() < FIVE_MINUTES;
    }

    is5MinDiffAfter(): boolean {
        return !!this.nextDate && this.nextDate.getTime() - this.currentDate.getTime() < FIVE_MINUTES;
    }

}

export default DateFormatter;
