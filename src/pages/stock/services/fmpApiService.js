// src/pages/stock/services/fmpApiService.js

import { db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";

// FMP API 프록시 URL이 설정되지 않았거나 플레이스홀더인지 확인하는 용도의 상수
const GENERIC_FMP_PLACEHOLDER_URL = "YOUR_FMP_FUNCTION_URL_PLACEHOLDER";

/**
 * 여러 주식 심볼에 대한 현재 시세 (및 전일 종가)를 FMP 프록시를 통해 가져옵니다.
 * @param {string[]} symbolsArray - 시세를 가져올 주식 심볼 배열 (예: ["AAPL", "MSFT"])
 * @param {string} fmpProxyUrl - FMP 프록시 서버 URL
 * @returns {Promise<object>} 성공 시 { SYMBOL: { c: currentPrice, pc: previousClose, name?, t?, source? }, ... } 형태의 객체, 실패 시 { error: "..." } 객체 반환
 */
export const fetchStockQuotesFMP = async (symbolsArray, fmpProxyUrl) => {
    if (!fmpProxyUrl || typeof fmpProxyUrl !== 'string' || fmpProxyUrl.toLowerCase().includes(GENERIC_FMP_PLACEHOLDER_URL.toLowerCase())) {
        const errorMsg = "API 프록시 URL이 올바르게 설정되지 않았습니다 (시세 조회).";
        console.error("[fmpApiService] fetchStockQuotesFMP:", errorMsg);
        return { error: errorMsg };
    }
    if (!Array.isArray(symbolsArray) || symbolsArray.length === 0) {
        console.warn("[fmpApiService] fetchStockQuotesFMP: 시세를 가져올 심볼이 제공되지 않았습니다.");
        return {}; // 빈 객체 반환 (호출하는 쪽에서 처리)
    }

    const endpoint = 'quote'; // Cloud Function fmpProxy에서 사용하는 엔드포인트명
    const symbolsParam = symbolsArray.map(s => s.trim().toUpperCase()).join(','); // 공백 제거 및 대문자화 후 join
    const url = `${fmpProxyUrl}?endpoint=${endpoint}&symbols=${symbolsParam}`;

    console.log(`[fmpApiService] Fetching stock quotes for ${symbolsParam} from: ${url.split('?')[0]}`);

    try {
        const response = await fetch(url); // HTTP GET 요청
        if (!response.ok) {
            let errorText = `HTTP error! status: ${response.status}`;
            try {
                const errDataText = await response.text();
                errorText = `시세 API 호출 실패 (${response.status}): ${errDataText || response.statusText}`;
            } catch (e) {
                console.warn("[fmpApiService] Failed to parse error response body (quotes):", e);
            }
            console.error(`[fmpApiService] Quote API Error for ${symbolsParam}: ${errorText}`);
            return { error: errorText };
        }
        const data = await response.json();

        // fmpProxy가 { SYMBOL: { c, pc, t, source, name? }, ... } 형태로 반환한다고 가정
        if (typeof data === 'object' && data !== null && !data.error) { // data.error는 fmpProxy에서 설정한 오류 객체일 수 있음
            console.log(`[fmpApiService] Stock quotes for ${symbolsParam} fetched:`, data);
            return data;
        } else {
            const errorMsg = data?.error || "시세 API로부터 예상치 못한 형식의 응답을 받았습니다.";
            console.error(`[fmpApiService] Unexpected quote API response for ${symbolsParam}:`, data);
            return { error: errorMsg };
        }
    } catch (error) {
        console.error(`[fmpApiService] Network or other error in fetchStockQuotesFMP for ${symbolsParam}:`, error);
        return { error: error.message || "시세 조회 중 네트워크 또는 알 수 없는 오류가 발생했습니다." };
    }
};

/**
 * FMP 프록시를 통한 회사 프로필 정보 가져오기
 * 캐시된 데이터가 없으면 아무것도 반환하지 않음
 * 
 * @param {string} symbol 주식 심볼 (예: AAPL)
 * @param {string} fmpProxyUrl FMP 프록시 URL (현재 사용하지 않음)
 * @returns {Promise<object|null>} 캐시된 프로필 정보 또는 null
 */
export const fetchCompanyProfileFMP = async (symbol, fmpProxyUrl) => {
    try {
        const symbolUpper = symbol.toUpperCase();
        const docRef = doc(db, "stockProfileCache", symbolUpper);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.warn(`[fmpApiService] Profile for ${symbolUpper} not found in Firestore cache.`);
            return null;
        }

        const data = docSnap.data();
        if (!data || !data.data) {
            console.warn(`[fmpApiService] Cache doc for ${symbolUpper} is empty or missing 'data' field.`);
            return null;
        }

        return data.data; // 🔁 저장된 구조에 따라 `.data` 필드 내부만 반환
    } catch (error) {
        console.error(`[fmpApiService] Error fetching profile from Firestore for ${symbol}:`, error);
        return { error: error.message };
    }
};

/**
 * 특정 주식 심볼 및 기간에 대한 차트 데이터를 FMP 프록시를 통해 가져옵니다.
 * @param {string} symbol - 주식 심볼
 * @param {string} timeframe - 차트 기간 (예: '7d', '1m', '1y')
 * @param {string} fmpProxyUrl - FMP 프록시 서버 URL
 * @returns {Promise<object>} 성공 시 { s: 'ok', t: [timestamps], c: [prices], source: '...' } 또는 { s: 'no_data', ... }, 실패 시 { error: "..." }
 */
export const fetchHistoricalChartFMP = async (symbol, timeframe, fmpProxyUrl) => {
    if (!fmpProxyUrl || typeof fmpProxyUrl !== 'string' || fmpProxyUrl.toLowerCase().includes(GENERIC_FMP_PLACEHOLDER_URL.toLowerCase())) {
        return { error: 'API 프록시 URL이 올바르게 설정되지 않았습니다 (차트 조회).' };
    }
    if (!symbol || !timeframe) {
        return { error: '차트 조회를 위한 심볼 또는 기간이 누락되었습니다.' };
    }

    const endpoint = 'historical-chart';
    const trimmedSymbol = symbol.trim().toUpperCase();
    const url = `${fmpProxyUrl}?endpoint=${endpoint}&symbol=${trimmedSymbol}&timeframe=${timeframe}`;

    console.log(`[fmpApiService] Fetching historical chart for ${trimmedSymbol} (Timeframe: ${timeframe}) from: ${url.split('?')[0]}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            return { error: `차트 API 호출 실패 (${response.status}): ${errorText || response.statusText}` };
        }
        const data = await response.json(); // fmpProxy가 {s:'ok', t:[], c:[], source:'cache'/'no-cache'} 또는 {error:'...'} 반환 가정

        // fmpProxy의 응답 형식을 그대로 반환하거나, 필요시 여기서 추가 가공
        console.log(`[fmpApiService] Chart data for ${trimmedSymbol} (Timeframe: ${timeframe}) fetched:`, data);
        return data;

    } catch (error) {
        console.error(`[fmpApiService] Network or other error in fetchHistoricalChartFMP for ${trimmedSymbol}:`, error);
        return { error: `차트 데이터 호출 중 오류 발생: ${error.message}` };
    }
};

