import dayjs from 'dayjs';

const parseDateSafe = (rawDate) => {
    if (!rawDate) return null;
    if (rawDate.seconds) return new Date(rawDate.seconds * 1000); // Firestore Timestamp
    const parsed = dayjs(rawDate);
    return parsed.isValid() ? parsed.toDate() : null;
};

export const generateTimeframeChartData = (historicalData) => {
    if (!Array.isArray(historicalData) || historicalData.length === 0) {
        return { "1W": [], "1M": [], "3M": [], "1Y": [] };
    }

    const sorted = [...historicalData].sort((a, b) => {
        return parseDateSafe(a.date) - parseDateSafe(b.date);
    });

    const today = dayjs();
    const result = {};

    result["1Y"] = sorted;
    result["3M"] = sorted.filter(d => dayjs(parseDateSafe(d.date)).isAfter(today.subtract(90, 'day')));
    result["1M"] = sorted.filter(d => dayjs(parseDateSafe(d.date)).isAfter(today.subtract(30, 'day')));
    result["1W"] = sorted.filter(d => dayjs(parseDateSafe(d.date)).isAfter(today.subtract(7, 'day')));

    // ⭐ 시작: 차트에 적합한 { x, y } 구조로 데이터 최종 가공
    for (const key in result) {
        result[key] = result[key].map(d => {
            const parsedDate = parseDateSafe(d.date);
            return {
                x: parsedDate ? parsedDate.getTime() : 0, // X축: 숫자 형식의 타임스탬프
                y: d.close                                  // Y축: 가격
            };
        });
    }
    // ⭐ 끝: 수정된 부분

    return result;
};