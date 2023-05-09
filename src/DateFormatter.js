class DateFormatter {
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

    static toUiTooltipFormat(date) {
        let mon = date.getMonth() + 1
        let day = date.getDate()
        let h = date.getHours()
        let m = date.getMinutes()
        if (mon < 10) mon = "0" + mon
        if (day < 10) day = "0" + day
        if (h < 10) h = "0" + h
        if (m < 10) m = "0" + m
        return `${DateFormatter.#days[date.getDay()]}, ${date.getFullYear()}.${mon}.${day}, ${h}:${m}`
    }

    static toUiFormat(date, shouldDisplayDay) {
        let hr = date.getHours();
        if (hr < 10) hr = "0" + hr;
        let min = date.getMinutes();
        if (min < 10) min = "0" + min;
        return (shouldDisplayDay ? `${DateFormatter.#days[date.getDay()]}, ` : '') + hr + ':' + min
    }

}

export default DateFormatter;