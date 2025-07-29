// src/utils/isWithinSubmissionTime.js
import dayjs from 'dayjs';

/**
 * 제출 가능한 시간대인지 검사
 * @param {Object|null} timeWindow - { start: "13:00", end: "17:00" } 또는 null
 * @returns {boolean} 현재 시간이 제출 가능 시간대에 포함되면 true
 */
export const isWithinSubmissionTime = (timeWindow) => {
    if (!timeWindow?.start || !timeWindow?.end) return true; // 제한 없음

    const now = dayjs();
    const [startHour, startMinute] = timeWindow.start.split(':').map(Number);
    const [endHour, endMinute] = timeWindow.end.split(':').map(Number);

    const start = now.hour(startHour).minute(startMinute).second(0);
    const end = now.hour(endHour).minute(endMinute).second(0);

    return now.isAfter(start) && now.isBefore(end);
};
