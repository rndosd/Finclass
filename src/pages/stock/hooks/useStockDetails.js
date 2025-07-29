// src/pages/stock/hooks/useStockDetails.js

import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { fetchCompanyProfileFMP } from '../services/fmpApiService';

const PROFILE_CACHE_COLLECTION = "stockProfileCache";
const PROFILE_DATA_TTL = 24 * 60 * 60 * 1000; // 24시간

const useStockDetails = (fmpProxyUrl) => {
    const [activeSymbol, setActiveSymbol] = useState(null);

    // 기업 프로필
    const [profile, setProfile] = useState(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [errorProfile, setErrorProfile] = useState(null);

    // --- 기업 프로필 데이터 가져오기 ---
    const fetchProfile = useCallback(async (symbolToFetch) => {
        if (!db || !symbolToFetch) {
            setProfile(null); setErrorProfile(null); setIsLoadingProfile(false); return;
        }
        if (isLoadingProfile && activeSymbol === symbolToFetch) return;
        if (!isLoadingProfile && activeSymbol === symbolToFetch && profile && !profile.error) return;

        setActiveSymbol(symbolToFetch);
        setIsLoadingProfile(true);
        setErrorProfile(null);
        setProfile(null);

        const cacheDocRef = doc(db, PROFILE_CACHE_COLLECTION, symbolToFetch);
        const now = Date.now();

        try {
            const docSnap = await getDoc(cacheDocRef);
            if (docSnap.exists()) {
                const cachedEntry = docSnap.data();
                const lastFetchedMs = cachedEntry.lastFetchedTimestamp instanceof Timestamp
                    ? cachedEntry.lastFetchedTimestamp.toDate().getTime() : 0;
                if (cachedEntry.data && (now - lastFetchedMs) < PROFILE_DATA_TTL) {
                    setProfile({ ...cachedEntry.data, _source: 'cache-firestore' });
                    setIsLoadingProfile(false);
                    return;
                }
            }
        } catch (cacheError) {
            console.error(`[fetchProfile] Cache read error for ${symbolToFetch}:`, cacheError);
        }

        if (!fmpProxyUrl || fmpProxyUrl.includes("YOUR_FMP_FUNCTION_URL_PLACEHOLDER")) {
            const msg = "FMP 프록시 URL 미설정 (프로필)";
            setErrorProfile(msg);
            setProfile({ error: msg, _source: 'config-error' });
            setIsLoadingProfile(false);
            return;
        }

        console.log(`[fetchProfile] Fetching live profile for '${symbolToFetch}' from FMP API.`);
        try {
            const apiResult = await fetchCompanyProfileFMP(symbolToFetch, fmpProxyUrl);

            if (apiResult && !apiResult.error) {
                setProfile({ ...apiResult, _source: 'api' });
                await setDoc(cacheDocRef, {
                    data: apiResult,
                    lastFetchedTimestamp: serverTimestamp()
                }, { merge: true });
            } else {
                const errorMsg = apiResult?.error || `프로필 정보를 가져오지 못했습니다 (${symbolToFetch}).`;
                setErrorProfile(errorMsg);
                setProfile({ error: errorMsg, _source: 'api-error-handled' });
            }
        } catch (apiException) {
            console.error(`[fetchProfile] Exception fetching profile for ${symbolToFetch}:`, apiException);
            setErrorProfile(`프로필 API 호출 중 예외 발생: ${apiException.message}`);
            setProfile({ error: apiException.message, _source: 'api-exception-caught' });
        } finally {
            setIsLoadingProfile(false);
        }
    }, [fmpProxyUrl, activeSymbol, isLoadingProfile, profile]);

    return {
        activeSymbol,
        profile,
        isLoadingProfile,
        errorProfile,
        fetchProfile,
    };
};

export default useStockDetails;
