// functions/utils/firestoreUtils.js
const dayjs = require('dayjs'); // dayjs 라이브러리 사용

/**
 * Date 객체, Firestore Timestamp 객체, 또는 날짜 문자열을 Date 객체로 파싱합니다.
 * @param {string|Date|object} rawDate - 파싱할 날짜 데이터
 * @returns {Date|null} 파싱된 Date 객체 또는 유효하지 않으면 null
 */
const parseDateSafe = (rawDate) => {
    if (!rawDate) return null;
    if (rawDate instanceof Date) return rawDate;
    if (typeof rawDate === 'string') {
        const parsed = dayjs(rawDate);
        return parsed.isValid() ? parsed.toDate() : null;
    }
    if (rawDate.seconds && typeof rawDate.seconds === 'number') { // Firestore Timestamp
        return new Date(rawDate.seconds * 1000);
    }
    // Unix timestamp (milliseconds or seconds)
    if (typeof rawDate === 'number') {
        if (rawDate.toString().length === 10) return new Date(rawDate * 1000); // Likely seconds
        if (rawDate.toString().length === 13) return new Date(rawDate);      // Likely milliseconds
    }
    console.warn("[generateTimeframeChartData] Unparseable date:", rawDate);
    return null;
};

/**
 * 1년치 상세 일봉 데이터를 받아 각 타임프레임별로 데이터를 분할/가공합니다.
 * @param {Array<object>} historicalData - 1년치 일봉 데이터 배열 (날짜 오름차순 또는 내림차순 정렬)
 * 각 객체는 { date: "YYYY-MM-DD", close: number, ... } 형태
 * @returns {object} 타임프레임별 데이터 객체 { "1W": [], "1M": [], "3M": [], "1Y": [] }
 */
const generateTimeframeChartData = (historicalData) => {
    if (!Array.isArray(historicalData) || historicalData.length === 0) {
        return { "1W": [], "1M": [], "3M": [], "1Y": [] };
    }

    // 데이터가 날짜 오름차순(오래된 날짜 -> 최신 날짜)으로 정렬되어 있다고 가정
    // FMP API는 보통 그렇게 반환합니다. 만약 아니라면 정렬 필요.
    const sortedHistorical = [...historicalData].sort((a, b) => {
        const dateA = parseDateSafe(a.date);
        const dateB = parseDateSafe(b.date);
        if (!dateA || !dateB) return 0;
        return dateA - dateB;
    });

    const today = dayjs(); // 현재 날짜를 기준으로 필터링
    const output = {
        "1W": [],
        "1M": [],
        "3M": [],
        "1Y": []
    };

    // --- 1W (최근 7일) 데이터 ---
    // 가장 최근 데이터부터 7일치 또는 약 5~7개의 거래일 데이터 (일봉 기준)
    const oneWeekAgo = today.subtract(7, 'day');
    output["1W"] = sortedHistorical.filter(d => {
        const dDate = parseDateSafe(d.date);
        return dDate && dayjs(dDate).isAfter(oneWeekAgo);
    }).slice(-7); // 최근 7개 거래일 데이터만 (혹시 휴일 등으로 7일이 넘을 수 있으니)

    // --- 1M (최근 30일) 데이터 ---
    // 최근 30일치 데이터. 데이터 포인트가 너무 많으면 건너뛰며 샘플링 가능 (예: 20~22개)
    const oneMonthAgo = today.subtract(30, 'day');
    const monthlyData = sortedHistorical.filter(d => {
        const dDate = parseDateSafe(d.date);
        return dDate && dayjs(dDate).isAfter(oneMonthAgo);
    });
    // 약 20-22개의 데이터 포인트가 적절 (매일 데이터가 있다면 약 1.5일 간격)
    // 여기서는 일단 모든 일봉 데이터를 포함 (클라이언트에서 Recharts가 잘 처리해줄 수도 있음)
    output["1M"] = monthlyData;
    // 만약 줄인다면:
    // output["1M"] = monthlyData.filter((_, i) => i % Math.ceil(monthlyData.length / 22) === 0);


    // --- 3M (최근 90일) 데이터 ---
    // 최근 90일치 데이터. 데이터 포인트가 너무 많으면 건너뛰며 샘플링 (예: 30~45개)
    const threeMonthsAgo = today.subtract(90, 'day');
    const quarterlyData = sortedHistorical.filter(d => {
        const dDate = parseDateSafe(d.date);
        return dDate && dayjs(dDate).isAfter(threeMonthsAgo);
    });
    // 약 30-45개 데이터 포인트 (매 2-3일 간격)
    // 여기서는 일단 모든 일봉 데이터를 포함
    output["3M"] = quarterlyData;
    // 만약 줄인다면:
    // output["3M"] = quarterlyData.filter((_, i) => i % Math.ceil(quarterlyData.length / 45) === 0);


    // --- 1Y (최근 365일) 데이터 ---
    // 1년치 데이터. 주봉과 유사하게 (약 52개) 또는 월초/월말 데이터로 간추릴 수 있음.
    // 또는 약 60개 포인트 (매주 1개 + 월초/월말 등)
    const oneYearAgo = today.subtract(365, 'day');
    const yearlyData = sortedHistorical.filter(d => {
        const dDate = parseDateSafe(d.date);
        return dDate && dayjs(dDate).isAfter(oneYearAgo);
    });
    // 여기서는 일단 모든 일봉 데이터를 포함
    // (FMP API에서 1년치를 요청했다면 historicalData 자체가 이 범위일 것임)
    // 만약 Firestore stockChartCache에는 1년치 전체가 있고, 여기서 요약본을 만드는 것이라면,
    // 데이터 포인트 수를 줄이는 것이 좋음 (예: 매주 금요일 데이터만 선택)
    output["1Y"] = yearlyData.filter((d, i, arr) => {
        const dDate = parseDateSafe(d.date);
        if (!dDate) return false;
        // 매주 금요일(5) 데이터 또는 그 주의 마지막 거래일 데이터. 
        // 더 간단하게는 N개마다 하나씩 샘플링. 약 50~60개 포인트 목표.
        if (yearlyData.length <= 60) return true; // 데이터가 충분히 적으면 모두 포함
        return i % Math.ceil(yearlyData.length / 60) === 0; // 약 60개로 샘플링
    });


    // 모든 타임프레임에 대해 { date: "YYYY-MM-DD", close: number } 형식으로 통일
    for (const timeframe in output) {
        output[timeframe] = output[timeframe].map(d => ({
            date: dayjs(parseDateSafe(d.date)).format('YYYY-MM-DD'), // 날짜 형식 통일
            close: d.close
        }));
    }

    return output;
};

/**
 * 큰 데이터 객체를 여러 문서로 분할하여 Firestore에 저장합니다.
 * @param {object} db - Firestore db 인스턴스
 * @param {string} collectionName - 저장할 컬렉션 이름
 * @param {string} docIdPrefix - 생성될 문서 ID의 접두사
 * @param {object} dataMap - 저장할 전체 데이터 객체
 * @param {number} maxFieldsPerDoc - 문서당 최대 필드(키) 수
 */
async function splitAndSetDoc(db, collectionName, docIdPrefix, dataMap, maxFieldsPerDoc = 400) {
    const keys = Object.keys(dataMap);
    if (keys.length === 0) return 0;

    let docIndex = 1;
    let partsWritten = 0;

    for (let i = 0; i < keys.length; i += maxFieldsPerDoc) {
        // ⭐ 1. 루프 안에서 매번 새로운 batch를 생성합니다.
        const batch = db.batch();
        const chunkKeys = keys.slice(i, i + maxFieldsPerDoc);
        const chunkData = {};

        chunkKeys.forEach(key => {
            chunkData[key] = dataMap[key];
        });

        const docId = `${docIdPrefix}_${docIndex++}`;
        const docRef = db.collection(collectionName).doc(docId);

        batch.set(docRef, chunkData);

        try {
            // ⭐ 2. 준비된 batch를 즉시 commit (저장)합니다.
            await batch.commit();
            console.log(`Successfully wrote part ${docIndex - 1} to ${collectionName}/${docId}`);
            partsWritten++;
        } catch (e) {
            console.error(`Error committing batch for part ${docIndex - 1}:`, e);
            // 오류가 발생해도 다음 chunk를 계속 시도할 수 있습니다.
        }
    }

    console.info(`[splitAndSetDoc] Total parts written: ${partsWritten}`);
    return partsWritten;
}

module.exports = {
    generateTimeframeChartData,
    splitAndSetDoc,
    parseDateSafe
};