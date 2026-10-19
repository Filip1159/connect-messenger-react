import DateFormatter from "./DateFormatter";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/* "just now", "5 min ago", "3 h ago", or the date for older values; `lastSeen` is a backend local date time */
export const formatLastSeen = (lastSeen: string, now: Date = new Date()): string => {
    const diff = now.getTime() - DateFormatter.sqlToDateObject(lastSeen).getTime();
    if (diff < MINUTE) return "just now";
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`;
    if (diff < 24 * HOUR) return `${Math.floor(diff / HOUR)} h ago`;
    return lastSeen.slice(0, 10);
};
