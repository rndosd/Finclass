// src/pages/bank/hooks/useTierLogic.js
import { useState, useEffect } from 'react'; // ✨ 오타 수정!
import { getTierInfoByScore } from '../../../utils/tierUtils';
export default function useTierLogic(creditScore, tierCriteria, classTierRateAdjustments, isLoadingData = false) {
    // 초기 상태를 null로 설정하여 로딩/미설정 상태 명확화 (선택 사항)
    const [currentTierInfo, setCurrentTierInfo] = useState(null);
    const [currentRateModifiers, setCurrentRateModifiers] = useState(null);

    useEffect(() => {
        const logPrefix = "[useTierLogic]";
        console.log(`${logPrefix} useEffect triggered. Inputs:`, {
            creditScore,
            tierCriteriaLength: Array.isArray(tierCriteria) ? tierCriteria.length : typeof tierCriteria,
            classTierRateAdjustmentsExists: !!classTierRateAdjustments,
            isLoadingData
        });

        // isLoadingData가 true이거나, 필수 데이터(creditScore, tierCriteria)가 없으면 초기화/기본값 설정
        if (isLoadingData || !creditScore || creditScore === "-" || !Array.isArray(tierCriteria) || tierCriteria.length === 0) {
            const defaultTierInfo = { tierFullName: "정보 없음", mainTierName: "정보 없음" };
            const defaultModifiers = { depositRateModifier: 0, loanRateModifier: 0 };

            // currentTierInfo가 이미 defaultTierInfo와 다를 때만 업데이트 (불필요한 업데이트 방지)
            if (!currentTierInfo || currentTierInfo.tierFullName !== defaultTierInfo.tierFullName || currentTierInfo.mainTierName !== defaultTierInfo.mainTierName) {
                console.log(`${logPrefix} Prerequisites not met or data loading. Setting defaultTierInfo.`);
                setCurrentTierInfo(defaultTierInfo);
            }
            // currentRateModifiers가 이미 defaultModifiers와 다를 때만 업데이트
            if (!currentRateModifiers || currentRateModifiers.depositRateModifier !== defaultModifiers.depositRateModifier || currentRateModifiers.loanRateModifier !== defaultModifiers.loanRateModifier) {
                console.log(`${logPrefix} Prerequisites not met or data loading. Setting defaultRateModifiers.`);
                setCurrentRateModifiers(defaultModifiers);
            }
            return;
        }

        const numericCreditScore = parseInt(creditScore, 10);

        if (isNaN(numericCreditScore)) {
            console.warn(`${logPrefix} numericCreditScore is NaN after parsing creditScore: '${creditScore}'. Setting defaults.`);
            const defaultTierInfo = { tierFullName: "정보 없음", mainTierName: "정보 없음" };
            const defaultModifiers = { depositRateModifier: 0, loanRateModifier: 0 };
            // 상태 변경 조건 추가
            if (!currentTierInfo || currentTierInfo.tierFullName !== defaultTierInfo.tierFullName) setCurrentTierInfo(defaultTierInfo);
            if (!currentRateModifiers || currentRateModifiers.depositRateModifier !== defaultModifiers.depositRateModifier) setCurrentRateModifiers(defaultModifiers);
            return;
        }

        // getTierInfoByScore는 { tierFullName, mainTierName } 또는 null/undefined를 반환할 수 있음
        const tierInfoFromUtil = getTierInfoByScore(numericCreditScore, tierCriteria);
        console.log(`${logPrefix} Result from getTierInfoByScore:`, tierInfoFromUtil);

        const newTierInfo = {
            tierFullName: tierInfoFromUtil?.tierFullName || "등급 없음",
            mainTierName: tierInfoFromUtil?.mainTierName || "정보 없음"
        };

        // currentTierInfo가 실제로 변경되었을 때만 업데이트
        if (!currentTierInfo || currentTierInfo.tierFullName !== newTierInfo.tierFullName || currentTierInfo.mainTierName !== newTierInfo.mainTierName) {
            console.log(`${logPrefix} Updating currentTierInfo to:`, newTierInfo);
            setCurrentTierInfo(newTierInfo);
        }

        let newRateModifiers = { depositRateModifier: 0, loanRateModifier: 0 };
        if (newTierInfo.mainTierName && newTierInfo.mainTierName !== "정보 없음" && newTierInfo.mainTierName !== "등급 없음" &&
            classTierRateAdjustments && classTierRateAdjustments[newTierInfo.mainTierName]) {

            const modifiers = classTierRateAdjustments[newTierInfo.mainTierName];
            if (modifiers) { // modifiers 객체가 실제로 존재하는지 확인
                const depMod = Number(modifiers.depositRateModifier);
                const loanMod = Number(modifiers.loanRateModifier);

                newRateModifiers = {
                    depositRateModifier: isNaN(depMod) ? 0 : depMod,
                    loanRateModifier: isNaN(loanMod) ? 0 : loanMod
                };
            } else {
                console.log(`${logPrefix} Modifiers object for tier ${newTierInfo.mainTierName} is undefined, null, or missing rate fields.`);
            }
        }

        // currentRateModifiers가 실제로 변경되었을 때만 업데이트
        if (!currentRateModifiers || currentRateModifiers.depositRateModifier !== newRateModifiers.depositRateModifier || currentRateModifiers.loanRateModifier !== newRateModifiers.loanRateModifier) {
            console.log(`${logPrefix} Updating currentRateModifiers to:`, newRateModifiers);
            setCurrentRateModifiers(newRateModifiers);
        }

        // ✨ 의존성 배열에서 currentTierInfo와 currentRateModifiers 제거!
    }, [creditScore, tierCriteria, classTierRateAdjustments, isLoadingData]);

    return { currentTierInfo, currentRateModifiers };
}