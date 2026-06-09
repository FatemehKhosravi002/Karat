const Jalali = (function() {
    const PERSIAN_MONTHS = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];

    function toPersianNum(n) {
        return String(n).replace(/\d/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; });
    }

    function toJalaali(gy, gm, gd) {
        const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        let jy = gy <= 1600 ? 0 : 979;
        gy -= gy <= 1600 ? 621 : 1600;
        const gy2 = gm > 2 ? gy + 1 : gy;
        let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
        jy += 33 * Math.floor(days / 12053);
        days %= 12053;
        jy += 4 * Math.floor(days / 1461);
        days %= 1461;
        jy += Math.floor((days - 1) / 365);
        if (days > 365) days = (days - 1) % 365;
        const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
        const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
        return { jy: jy, jm: jm, jd: jd };
    }

    function toGregorian(jy, jm, jd) {
        let gy = jy <= 979 ? 621 : 1600;
        jy -= jy <= 979 ? 0 : 979;
        let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
        gy += 400 * Math.floor(days / 146097);
        days %= 146097;
        if (days > 36524) {
            gy += 100 * Math.floor(--days / 36524);
            days %= 36524;
            if (days >= 365) days++;
        }
        gy += 4 * Math.floor(days / 1461);
        days %= 1461;
        gy += Math.floor((days - 1) / 365);
        if (days > 365) days = (days - 1) % 365;
        const gd = days + 1;
        const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let gm = 0;
        let v = gd;
        for (gm = 0; gm < 13 && v > sal_a[gm]; gm++) v -= sal_a[gm];
        return { gy: gy, gm: gm, gd: v };
    }

    function isLeap(jy) {
        const r = jy % 33;
        return r === 1 || r === 5 || r === 9 || r === 13 || r === 17 || r === 22 || r === 26 || r === 30;
    }

    function monthLength(jy, jm) {
        if (jm <= 6) return 31;
        if (jm <= 11) return 30;
        return isLeap(jy) ? 30 : 29;
    }

    function fromDate(date) {
        return toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }

    function toDate(jy, jm, jd, hour, minute) {
        const g = toGregorian(jy, jm, jd);
        return new Date(g.gy, g.gm - 1, g.gd, hour || 0, minute || 0, 0);
    }

    function parseISO(str) {
        if (!str) return null;
        const d = new Date(str);
        return isNaN(d) ? null : d;
    }

    function format(str) {
        const d = parseISO(str);
        if (!d) return null;
        const j = fromDate(d);
        const h = toPersianNum(String(d.getHours()).padStart(2, '0'));
        const m = toPersianNum(String(d.getMinutes()).padStart(2, '0'));
        return toPersianNum(j.jy) + '/' + toPersianNum(String(j.jm).padStart(2, '0')) + '/' + toPersianNum(String(j.jd).padStart(2, '0')) + ' — ' + h + ':' + m;
    }

    function toISO(jy, jm, jd, hour, minute) {
        return toDate(jy, jm, jd, hour, minute).toISOString();
    }

    function nowJalali() {
        return fromDate(new Date());
    }

    return {
        PERSIAN_MONTHS: PERSIAN_MONTHS,
        toPersianNum: toPersianNum,
        monthLength: monthLength,
        fromDate: fromDate,
        toDate: toDate,
        parseISO: parseISO,
        format: format,
        toISO: toISO,
        nowJalali: nowJalali
    };
})();