// src/pages/stock/hooks/useStockSettings.js
// ✅ 완전판 – classId 파라미터가 없거나 undefined면 UserContext에서 자동으로 가져오도록 수정

import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';

// ---------------- 기본값 ----------------
const DEFAULT_RATES_SETTINGS = {
    conversionRate: 0.0008,
    tradeFeeRate: 0.002,
    exchangeFeeRate: 0.01,
};

const DEFAULT_GLOBAL_SETTINGS = {
    fmpProxyUrl: 'YOUR_FMP_PROXY_URL_PLACEHOLDER',
    finnhubProxyUrl: 'YOUR_FINNHUB_PROXY_URL_PLACEHOLDER',
};

const GLOBAL_SETTINGS_PATH = 'appSettings/globalConfig';
// ----------------------------------------

/**
 * Stock(주식) 시장 설정을 불러오고 업데이트하는 커스텀 훅.
 * @param {string | undefined} classId 수동으로 classId를 주고 싶으면 넘겨준다.
 */
export default function useStockSettings(classId) {
    // UserContext 로부터 classId fallback
    const { classId: contextClassId } = useUser();
    const effectiveClassId = classId || contextClassId; // ⚡ 핵심: 둘 중 하나라도 있으면 사용

    // ───────────────── state
    const [conversionRate, setConversionRate] = useState(DEFAULT_RATES_SETTINGS.conversionRate);
    const [tradeFeeRate, setTradeFeeRate] = useState(DEFAULT_RATES_SETTINGS.tradeFeeRate);
    const [exchangeFeeRate, setExchangeFeeRate] = useState(DEFAULT_RATES_SETTINGS.exchangeFeeRate);
    const [fmpProxyUrl, setFmpProxyUrl] = useState(DEFAULT_GLOBAL_SETTINGS.fmpProxyUrl);
    const [finnhubProxyUrl, setFinnhubProxyUrl] = useState(DEFAULT_GLOBAL_SETTINGS.finnhubProxyUrl);
    const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);
    const [isLoadingClass, setIsLoadingClass] = useState(true);
    const [errorGlobal, setErrorGlobal] = useState(null);
    const [errorClass, setErrorClass] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ──────────────── 전역 설정 onSnapshot
    useEffect(() => {
        const globalDocRef = doc(db, GLOBAL_SETTINGS_PATH);
        const unsubscribe = onSnapshot(
            globalDocRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setFmpProxyUrl(data.fmpProxyUrl || DEFAULT_GLOBAL_SETTINGS.fmpProxyUrl);
                    setFinnhubProxyUrl(data.finnhubProxyUrl || DEFAULT_GLOBAL_SETTINGS.finnhubProxyUrl);
                }
                setIsLoadingGlobal(false);
            },
            (err) => {
                console.error('[useStockSettings] Global settings error:', err);
                setErrorGlobal(err);
                setIsLoadingGlobal(false);
            }
        );
        return () => unsubscribe();
    }, []);

    // ──────────────── 학급별 설정 onSnapshot
    useEffect(() => {
        console.log('[useStockSettings] 📦 effectiveClassId:', effectiveClassId);
        if (!effectiveClassId) {
            setIsLoadingClass(false);
            return;
        }
        const classDocRef = doc(db, `classes/${effectiveClassId}/config/stockMarket`);
        const unsubscribe = onSnapshot(
            classDocRef,
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setConversionRate(data.conversionRate ?? DEFAULT_RATES_SETTINGS.conversionRate);
                    setTradeFeeRate(data.tradeFeeRate ?? DEFAULT_RATES_SETTINGS.tradeFeeRate);
                    setExchangeFeeRate(data.exchangeFeeRate ?? DEFAULT_RATES_SETTINGS.exchangeFeeRate);
                }
                setIsLoadingClass(false);
            },
            (err) => {
                console.error('[useStockSettings] Class settings error:', err);
                setErrorClass(err);
                setIsLoadingClass(false);
            }
        );
        return () => unsubscribe();
    }, [effectiveClassId]);

    // ──────────────── 업데이트 함수
    const updateMarketSettings = useCallback(
        async (newSettings) => {
            console.log('[useStockSettings] 📝 Attempting update with:', newSettings);
            if (!effectiveClassId) {
                return { success: false, error: 'classId가 없습니다.' };
            }

            setIsSubmitting(true);
            const settingsRef = doc(db, `classes/${effectiveClassId}/config/stockMarket`);
            try {
                const payload = {
                    conversionRate: Number(newSettings.conversionRate),
                    tradeFeeRate: Number(newSettings.tradeFeeRate),
                    exchangeFeeRate: Number(newSettings.exchangeFeeRate),
                    lastUpdated: serverTimestamp(),
                };
                await setDoc(settingsRef, payload, { merge: true });
                setIsSubmitting(false);
                return { success: true, message: '시장 설정이 저장되었습니다.' };
            } catch (err) {
                console.error('[useStockSettings] Update error:', err);
                setIsSubmitting(false);
                return { success: false, error: err.message };
            }
        },
        [effectiveClassId]
    );

    return {
        // 값 리턴
        conversionRate,
        tradeFeeRate,
        exchangeFeeRate,
        fmpProxyUrl,
        finnhubProxyUrl,
        isLoadingSettings: isLoadingGlobal || isLoadingClass,
        errorSettings: errorGlobal || errorClass,
        isSubmitting,
        updateMarketSettings,
    };
}
