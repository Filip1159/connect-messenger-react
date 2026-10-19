import { afterEach, describe, expect, it } from "vitest";
import DateFormatter from "./DateFormatter";
import { setLocale } from "./i18n";

describe("DateFormatter", () => {
    afterEach(() => setLocale("en"));

    it("parses seconds, fractions and a space separator as local time", () => {
        const d = DateFormatter.sqlToDateObject("2021-05-04 12:30:15.123456");
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()])
            .toEqual([2021, 4, 4, 12, 30, 15]);
    });

    it("respects an explicit timezone", () => {
        expect(DateFormatter.sqlToDateObject("2021-05-04T12:00:00Z").toISOString()).toBe("2021-05-04T12:00:00.000Z");
    });

    it("shows the day only when the calendar day changes", () => {
        const at = (s: string) => new Date(s);
        expect(new DateFormatter(at("2021-05-04T23:59:00"), at("2021-05-05T00:01:00"), null).displayDayIfDifferent())
            .toBe("Wednesday, ");
        expect(new DateFormatter(at("2021-05-04T08:00:00"), at("2021-05-04T20:00:00"), null).displayDayIfDifferent())
            .toBe("");
        expect(new DateFormatter(null, at("2021-05-04T20:00:00"), null).displayDayIfDifferent()).toBe("Tuesday, ");
    });

    it("names the weekday in the language of the app", () => {
        setLocale("pl");
        expect(new DateFormatter(null, new Date("2021-05-05T20:00:00"), null).displayDayIfDifferent()).toBe("Środa, ");
    });

    it("detects messages sent less than 5 minutes apart", () => {
        const at = (s: string) => new Date(s);
        const df = new DateFormatter(at("2021-05-04T10:00:00"), at("2021-05-04T10:04:00"), at("2021-05-04T10:20:00"));
        expect(df.is5MinDiffBefore()).toBe(true);
        expect(df.is5MinDiffAfter()).toBe(false);
        expect(new DateFormatter(null, at("2021-05-04T10:04:00"), null).is5MinDiffBefore()).toBe(false);
    });
});
