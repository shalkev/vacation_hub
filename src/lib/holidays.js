// German holidays for Baden-Württemberg
// These are the official public holidays for the year

export function getHolidaysBW(year) {
    // Calculate Easter Sunday using Gauss algorithm
    const easterSunday = calculateEaster(year);

    const holidays = [
        // Fixed holidays
        { date: `${year}-01-01`, name: 'Neujahr' },
        { date: `${year}-01-06`, name: 'Heilige Drei Könige' },
        { date: `${year}-05-01`, name: 'Tag der Arbeit' },
        { date: `${year}-10-03`, name: 'Tag der Deutschen Einheit' },
        { date: `${year}-11-01`, name: 'Allerheiligen' },
        { date: `${year}-12-25`, name: '1. Weihnachtsfeiertag' },
        { date: `${year}-12-26`, name: '2. Weihnachtsfeiertag' },

        // Easter-dependent holidays
        { date: addDays(easterSunday, -2), name: 'Karfreitag' },
        { date: addDays(easterSunday, 1), name: 'Ostermontag' },
        { date: addDays(easterSunday, 39), name: 'Christi Himmelfahrt' },
        { date: addDays(easterSunday, 50), name: 'Pfingstmontag' },
        { date: addDays(easterSunday, 60), name: 'Fronleichnam' },
    ];

    return holidays;
}

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
function calculateEaster(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');

    return `${year}-${monthStr}-${dayStr}`;
}

// Add days to a date string
function addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Check if a date is a weekend
export function isWeekend(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

// Check if a date is a holiday
export function isHoliday(dateStr, holidays) {
    return holidays.some(h => h.date === dateStr);
}

// Calculate working days between two dates (excluding weekends and holidays)
export function calculateWorkingDays(startStr, endStr, year) {
    const holidays = getHolidaysBW(year);
    const holidayDates = new Set(holidays.map(h => h.date));

    let workingDays = 0;
    const current = new Date(startStr);
    const end = new Date(endStr);

    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];

        if (!isWeekend(dateStr) && !holidayDates.has(dateStr)) {
            workingDays++;
        }

        current.setDate(current.getDate() + 1);
    }

    return workingDays;
}

// Get all holidays for multiple years
export function getHolidaysForYears(years) {
    const allHolidays = [];
    years.forEach(year => {
        allHolidays.push(...getHolidaysBW(year));
    });
    return allHolidays;
}

// School holidays for Baden-Württemberg 2026
export function getSchoolHolidaysBW(year) {
    if (year !== 2026) return []; // Data specifically for 2026

    return [
        { start: '2026-03-30', end: '2026-04-12', name: 'Osterferien ❤️' },
        { start: '2026-05-26', end: '2026-06-06', name: 'Pfingstferien ❤️' },
        { start: '2026-07-30', end: '2026-09-13', name: 'Sommerferien ❤️' },
        { start: '2026-10-26', end: '2026-10-31', name: 'Herbstferien ❤️' },
        { start: '2026-12-23', end: '2027-01-10', name: 'Weihnachtsferien ❤️' }
    ];
}
