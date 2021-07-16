class DateFormatter {

    constructor(prevDate, currentDate, nextDate) {
        this.prevDate = prevDate;
        this.currentDate = currentDate;
        this.nextDate = nextDate;
    }

    static #days = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];

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
        let hr = this.currentDate.getHours();
        if (hr < 10) hr = "0" + hr;
        let min = this.currentDate.getMinutes();
        if (min < 10) min = "0" + min;
        return `${hr}:${min}`;
    }

    currentToPretty() {
        let mon = this.currentDate.getMonth()+1, day = this.currentDate.getDate(), h = this.currentDate.getHours(), m = this.currentDate.getMinutes();
        if (mon < 10) mon = "0" + mon;
        if (day < 10) day = "0" + day;
        if (h < 10) h = "0" + h;
        if (m < 10) m = "0" + m;
        return `${DateFormatter.#days[this.currentDate.getDay()]}, ${this.currentDate.getFullYear()}.${mon}.${day}, ${h}:${m}`;
    }

    displayDayIfDifferent() {
        return this.currentDate.getTime() - this.prevDate.getTime() > 24*60*60*1000 ? `${DateFormatter.#days[this.currentDate.getDay()]}, ` : ""
    }

    is5MinDiffBefore() {
        return this.currentDate.getTime() - this.prevDate.getTime() < 5*60*1000;
    }

    is5MinDiffAfter() {
        return this.nextDate.getTime() - this.currentDate.getTime() < 5*60*1000;
    }

}

export default DateFormatter;