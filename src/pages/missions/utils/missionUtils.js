// src/pages/missions/utils/missionUtils.js

export const getMissionPeriodLabel = (mission) => {
    if (mission.repeatDays && mission.repeatDays.length > 0) {
        const dayMap = {
            Mon: '월',
            Tue: '화',
            Wed: '수',
            Thu: '목',
            Fri: '금',
            Sat: '토',
            Sun: '일',
        };
        const days = mission.repeatDays.map(day => dayMap[day] || day);
        return `매주 ${days.join(', ')}`;
    }

    if (mission.startDate && mission.endDate) {
        return `${mission.startDate} ~ ${mission.endDate}`;
    }

    return '1회성 과제';
};
