// src/pages/bank/hooks/useBankSettings.js
import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { doc, onSnapshot } from 'firebase/firestore'; // getDoc은 onSnapshot 사용 시 불필요할 수 있음

export default function useBankSettings(classId) {
    // 최종적으로 반환될 bankSettings 상태. 로딩 전까지 null로 초기화.
    const [bankSettings, setBankSettings] = useState(null);

    // 개별 데이터 소스에서 가져온 상태
    const [classProductSettings, setClassProductSettings] = useState({ depositProducts: [], loanProducts: [] });
    const [globalGeneralSettings, setGlobalGeneralSettings] = useState({
        savingsInterestRateAfterGracePeriod: 0.1, // 기본값
        loanGracePeriodDays: 3,                   // 기본값
        savingsGracePeriodDays: 7,                  // 기본값
    });
    const [tierCriteria, setTierCriteria] = useState([]);
    const [classTierRateAdjustments, setClassTierRateAdjustments] = useState({});

    // 개별 로딩 상태
    const [isLoadingClassProducts, setIsLoadingClassProducts] = useState(true);
    const [isLoadingGlobalGeneral, setIsLoadingGlobalGeneral] = useState(true);
    const [isLoadingTierCriteria, setIsLoadingTierCriteria] = useState(true);
    const [isLoadingClassAdjustments, setIsLoadingClassAdjustments] = useState(true);

    const [settingsError, setSettingsError] = useState(null);

    // 전체 설정 로딩 상태: 모든 개별 로딩이 끝나야 false가 됨
    const isLoadingSettings = isLoadingClassProducts || isLoadingGlobalGeneral || isLoadingTierCriteria || isLoadingClassAdjustments;

    // useEffect 1: 학급별 상품 목록 (classes/{classId}/config/classSettings -> bankProductSettings 필드)
    useEffect(() => {
        if (!classId) {
            setClassProductSettings({ depositProducts: [], loanProducts: [] });
            setIsLoadingClassProducts(false);
            return;
        }
        setIsLoadingClassProducts(true);
        const configDocRef = doc(db, "classes", classId, "config", "classSettings");
        const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const productSettings = data?.bankProductSettings || {};
                console.log(`[useBankSettings] Firestore에서 읽은 학급 상품 설정 (class: ${classId}):`, JSON.parse(JSON.stringify(productSettings || null)));

                // periodRate 마이그레이션 로직 (annualRate -> periodRate)
                const migratedLoanProducts = productSettings.loanProducts?.map(p => {
                    const productCopy = { ...p };
                    if (productCopy.annualRate !== undefined && productCopy.periodRate === undefined) {
                        productCopy.periodRate = productCopy.annualRate;
                        delete productCopy.annualRate; // 기존 필드 정리 (선택 사항)
                        console.log(`[useBankSettings] Loan product ID ${p.id}: Migrated annualRate to periodRate.`);
                    }
                    return productCopy;
                }) || [];

                setClassProductSettings({
                    depositProducts: productSettings.depositProducts?.filter(p => p.active !== false) || [],
                    loanProducts: migratedLoanProducts.filter(p => p.active !== false) || [],
                });
            } else {
                console.warn(`[useBankSettings] 학급 설정 문서(상품용) 없음 (class: ${classId}). 빈 상품 목록 사용.`);
                setClassProductSettings({ depositProducts: [], loanProducts: [] });
            }
            setIsLoadingClassProducts(false);
        }, (error) => {
            console.error(`[useBankSettings] 학급 상품 설정 Listen 오류 (class: ${classId}):`, error);
            setSettingsError(prev => ({ ...prev, classProductsError: error.message }));
            setClassProductSettings({ depositProducts: [], loanProducts: [] });
            setIsLoadingClassProducts(false);
        });
        return () => unsubscribe();
    }, [classId]);

    // useEffect 2: 전역 은행 일반 설정 (bankSettings/settings)
    useEffect(() => {
        setIsLoadingGlobalGeneral(true);
        const globalSettingsRef = doc(db, "bankSettings", "settings");
        const unsubscribe = onSnapshot(globalSettingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("[useBankSettings] Firestore에서 읽은 전역 은행 일반 설정:", JSON.parse(JSON.stringify(data || null)));
                setGlobalGeneralSettings({
                    savingsInterestRateAfterGracePeriod: data.savingsInterestRateAfterGracePeriod ?? 0.1,
                    loanGracePeriodDays: data.loanGracePeriodDays ?? 3,
                    savingsGracePeriodDays: data.savingsGracePeriodDays ?? 7,
                });
            } else {
                console.warn("[useBankSettings] 전역 은행 일반 설정 문서 없음. 기본값 사용.");
                // 기본값은 useState 초기값으로 이미 설정되어 있으므로, 여기서는 별도 설정 안 함
            }
            setIsLoadingGlobalGeneral(false);
        }, (error) => {
            console.error("[useBankSettings] 전역 은행 일반 설정 Listen 오류:", error);
            setSettingsError(prev => ({ ...prev, globalSettingsError: error.message }));
            setIsLoadingGlobalGeneral(false);
        });
        return () => unsubscribe();
    }, []);

    // useEffect 3: 학급별 티어 기준 (classes/{classId}/tierCriteria/default)
    useEffect(() => {
        if (!classId) {
            setTierCriteria([]);
            setIsLoadingTierCriteria(false);
            return;
        }
        setIsLoadingTierCriteria(true);
        const tierCriteriaRef = doc(db, "classes", classId, "tierCriteria", "default");
        const unsubscribeTierCriteria = onSnapshot(tierCriteriaRef, (docSnap) => {
            if (docSnap.exists() && Array.isArray(docSnap.data()?.tiers)) {
                const tiersData = docSnap.data().tiers;
                console.log(`[useBankSettings] Firestore에서 읽은 학급 티어 기준 (class: ${classId}):`, JSON.parse(JSON.stringify(tiersData || null)));
                setTierCriteria(tiersData.sort((a, b) => a.minScore - b.minScore));
            } else {
                console.warn(`[useBankSettings] 학급 티어 기준 없음 또는 배열 아님 (class: ${classId}). 빈 기준 사용.`);
                setTierCriteria([]);
            }
            setIsLoadingTierCriteria(false);
        }, (error) => {
            console.error(`[useBankSettings] 학급 티어 기준 Listen 오류 (class: ${classId}):`, error);
            setSettingsError(prev => ({ ...prev, tierCriteriaError: error.message }));
            setTierCriteria([]);
            setIsLoadingTierCriteria(false);
        });
        return () => unsubscribeTierCriteria();
    }, [classId]);

    // useEffect 4: 학급별 티어 이자율 보정 (classes/{classId}/config/classSettings -> bankTierRateAdjustments 필드)
    useEffect(() => {
        if (!classId) {
            setClassTierRateAdjustments({});
            setIsLoadingClassAdjustments(false);
            return;
        }
        setIsLoadingClassAdjustments(true);
        const configDocRef = doc(db, "classes", classId, "config", "classSettings");
        const unsubscribeClassAdjustments = onSnapshot(configDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const configData = docSnap.data();
                const adjustments = configData?.bankTierRateAdjustments || {};
                console.log(`[useBankSettings] Firestore에서 직접 읽은 bankTierRateAdjustments (class: ${classId}):`, JSON.parse(JSON.stringify(adjustments || null)));
                setClassTierRateAdjustments(adjustments);
            } else {
                console.warn(`[useBankSettings] 학급 설정 문서(보정치용) 없음 (class: ${classId}). 빈 보정치 사용.`);
                setClassTierRateAdjustments({});
            }
            setIsLoadingClassAdjustments(false);
        }, (error) => {
            console.error(`[useBankSettings] 학급 티어 보정치 Listen 오류 (class: ${classId}):`, error);
            setSettingsError(prev => ({ ...prev, classAdjustmentsError: error.message }));
            setClassTierRateAdjustments({});
            setIsLoadingClassAdjustments(false);
        });
        return () => unsubscribeClassAdjustments();
    }, [classId]);

    // ✨ useEffect 5: 개별적으로 가져온 설정들을 최종 bankSettings 상태로 조합 (가장 중요한 변경)
    useEffect(() => {
        // 모든 개별 설정의 로딩이 완료되었을 때만 bankSettings 조합
        if (!isLoadingClassProducts && !isLoadingGlobalGeneral && !isLoadingClassAdjustments) {
            const combinedSettings = {
                ...globalGeneralSettings,        // 전역 일반 설정
                ...classProductSettings,         // 학급별 상품 목록 (depositProducts, loanProducts 포함)
                bankTierRateAdjustments: classTierRateAdjustments, // ✨ 여기에 classTierRateAdjustments 추가!
            };
            console.log("[useBankSettings] 최종 조합된 bankSettings 객체 (useEffect 5):", JSON.parse(JSON.stringify(combinedSettings || null)));
            setBankSettings(combinedSettings);
        } else {
            // 로딩 중이거나 일부 데이터가 준비되지 않았으면 bankSettings를 null로 유지
            // (초기값이 이미 null이므로, 모든 로딩이 완료될 때까지 setBankSettings가 호출되지 않음)
            setBankSettings(null); // 명시적으로 로딩 중일 때 null로 설정
        }
    }, [
        globalGeneralSettings,
        classProductSettings,
        classTierRateAdjustments, // ✨ 의존성 배열에 추가
        isLoadingClassProducts,   // ✨ 로딩 상태들도 의존성 배열에 추가
        isLoadingGlobalGeneral,
        isLoadingClassAdjustments
    ]);

    return {
        bankSettings, // ✨ 이 객체 안에 모든 관련 설정 포함
        tierCriteria,
        // classTierRateAdjustments, // bankSettings에 포함되었으므로, 다른 곳에서 개별적으로 사용하지 않는다면 제거 가능
        isLoadingSettings,
        settingsError
    };
}