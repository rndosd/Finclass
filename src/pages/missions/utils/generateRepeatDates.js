// src/pages/missions/utils/generateRepeatDates.js
export const generateRepeatDates = (startDateStr, endDateStr, repeatSchedule) => {
    const dayMap = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };
    const validWeekdays = Object.keys(repeatSchedule).map(d => dayMap[d]);

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const dates = [];

    const current = new Date(start);
    while (current <= end) {
        if (validWeekdays.includes(current.getDay())) {
            dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }

    return dates;
};
