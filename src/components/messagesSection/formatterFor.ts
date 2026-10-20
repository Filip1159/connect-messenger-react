import DateFormatter from "../../DateFormatter";
import type { Message } from "../../types";

/* a formatter is rebuilt only when the times around its message change, so memoized rows keep their props */
const cache = new Map<number, { key: string; df: DateFormatter }>();

export const formatterFor = (messages: Message[], i: number): DateFormatter => {
    const m = messages[i];
    const key = `${messages[i - 1]?.time ?? ""}|${m.time}|${messages[i + 1]?.time ?? ""}`;
    const cached = cache.get(m.id);
    if (cached?.key === key) return cached.df;
    const df = new DateFormatter(
        i === 0 ? null : DateFormatter.sqlToDateObject(messages[i - 1].time),
        DateFormatter.sqlToDateObject(m.time),
        i === messages.length - 1 ? null : DateFormatter.sqlToDateObject(messages[i + 1].time));
    cache.set(m.id, { key, df });
    return df;
};
