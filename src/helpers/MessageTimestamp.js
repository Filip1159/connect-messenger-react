export default class MessageTimestamp {
    static #days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    static #MILLIS_PER_5_MINUTES = 5 * 60 * 1000;
    static #MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

    constructor(messageIndex, chat) {
        const message = chat.messages[messageIndex]
        this.thisMessageTimestamp = MessageTimestamp.sqlToDateObject(message.time);
        if (messageIndex !== 0) {
            const previousMessage = chat.messages[messageIndex - 1];
            this.previousMessageTimestamp = MessageTimestamp.sqlToDateObject(previousMessage.time);
        }
        if (messageIndex !== chat.messages.length - 1) {
            const nextMessage = chat.messages[messageIndex + 1];
            this.nextMessageTimestamp = MessageTimestamp.sqlToDateObject(nextMessage.time);
        }
    }

    static nowToSql() {
        const d = new Date();
        let yr = d.getFullYear(), mon = d.getMonth()+1, day = d.getDate(), h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
        if (mon < 10) mon = "0" + mon;
        if (day < 10) day = "0" + day;
        if (h < 10) h = "0" + h;
        if (m < 10) m = "0" + m;
        if (s < 10) s = "0" + s;
        return `${yr}-${mon}-${day}T${h}:${m}:${s}`;
    }

    static sqlToDateObject(sqlString) {
        const year = sqlString.substring(0, 4);
        const month = sqlString.substring(5, 7);
        const day = sqlString.substring(8, 10);
        const hour = sqlString.substring(11, 13);
        const minute = sqlString.substring(14, 16);
        return new Date(year, month-1, day, hour, minute);
    }

    currentToHourMinute() {
        let hr = this.thisMessageTimestamp.getHours();
        if (hr < 10) hr = "0" + hr;
        let min = this.thisMessageTimestamp.getMinutes();
        if (min < 10) min = "0" + min;
        return `${hr}:${min}`;
    }

    currentToPretty() {
        let mon = this.thisMessageTimestamp.getMonth()+1, day = this.thisMessageTimestamp.getDate(), h = this.thisMessageTimestamp.getHours(), m = this.thisMessageTimestamp.getMinutes();
        if (mon < 10) mon = "0" + mon;
        if (day < 10) day = "0" + day;
        if (h < 10) h = "0" + h;
        if (m < 10) m = "0" + m;
        return `${MessageTimestamp.#days[this.thisMessageTimestamp.getDay()]}, ${this.thisMessageTimestamp.getFullYear()}.${mon}.${day}, ${h}:${m}`;
    }

    displayDayIfDifferent() {
        return !this.previousMessageTimestamp ||
            this.thisMessageTimestamp.getTime() - this.previousMessageTimestamp.getTime() > MessageTimestamp.#MILLIS_PER_DAY ?
            `${MessageTimestamp.#days[this.thisMessageTimestamp.getDay()]}, ` : ""
    }

    isPreviousLessThan5MinutesBeforeThis() {
        if (!this.previousMessageTimestamp) return false;
        return this.thisMessageTimestamp.getTime() - this.previousMessageTimestamp.getTime() < MessageTimestamp.#MILLIS_PER_5_MINUTES;
    }

    isNextLessThan5MinutesAfterThis() {
        if (!this.nextMessageTimestamp) return false;
        return this.nextMessageTimestamp.getTime() - this.thisMessageTimestamp.getTime() < MessageTimestamp.#MILLIS_PER_5_MINUTES;
    }

}