// src/pages/bank/hooks/useDepositActions.js
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { doc, collection, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import dayjs from 'dayjs';
import { calculateSavingInterest } from '../../../utils/bankUtils';
import { useFeedback } from '../../../contexts/FeedbackContext';     // ✅ 전역 피드백

export default function useDepositActions({
    studentAssets,
    bankSettings,
    uid,
    classId,
    currencyUnit,
    refreshStudentData,
    isLoadingSettings,
    currentTierInfo,
}) {
    const { showFeedback } = useFeedback();                            // ✅

    const [selectedDepositProductId, setSelectedDepositProductId] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [showDepositConfirmModal, setShowDepositConfirmModal] = useState(false);
    const [depositConfirmDetails, setDepositConfirmDetails] = useState(null);
    const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

    /* ---------- 디버깅용 로그 ---------- */
    useEffect(() => {
        console.log("[useDepositActions] currentTierInfo:", JSON.parse(JSON.stringify(currentTierInfo || null)));
    }, [currentTierInfo]);

    /* ---------- 초기 상품 ID 선택 ---------- */
    useEffect(() => {
        if (!isLoadingSettings && bankSettings?.depositProducts?.length) {
            const active = bankSettings.depositProducts.filter(p => p.active);
            const valid = active.some(p => p.id === selectedDepositProductId);
            if (!valid) setSelectedDepositProductId(active[0]?.id || '');
        } else if (!isLoadingSettings) {
            setSelectedDepositProductId('');
        }
    }, [bankSettings, isLoadingSettings, selectedDepositProductId]);

    /* ---------- 예금 확인 모달 열기 ---------- */
    const handleOpenDepositConfirmModal = useCallback(() => {
        /* --- 유효성 검사 --- */
        if (!selectedDepositProductId) {
            showFeedback({ type: 'warning', message: '예금 상품을 선택해주세요.' });
            return;
        }

        const product = bankSettings?.depositProducts?.find(p => p.id === selectedDepositProductId);
        if (!product) {
            showFeedback('선택한 예금 상품 정보를 찾을 수 없습니다.', 'error');
            return;
        }

        const amountNum = Number(depositAmount);
        if (amountNum <= 0 || isNaN(amountNum)) {
            showFeedback('예금액은 0보다 큰 숫자여야 합니다.', 'warning');
            return;
        }
        if (!studentAssets || studentAssets.cash < amountNum) {
            showFeedback('예금액이 보유 금액을 초과합니다.', 'warning');
            return;
        }

        /* --- 티어 보정 계산 --- */
        const baseRate = product.rate;
        const tierMain = currentTierInfo?.mainTierName || '기본';
        const mod = bankSettings?.bankTierRateAdjustments?.[tierMain]?.depositRateModifier ?? 0;
        const weeks = product.days ? product.days / 7 : 1;
        const tierDelta = parseFloat((mod * weeks).toFixed(4));
        const finalRate = Math.max(0, parseFloat((baseRate + tierDelta).toFixed(4)));

        const baseInterest = calculateSavingInterest(amountNum, baseRate);
        const totalInterest = calculateSavingInterest(amountNum, finalRate);

        /* --- 모달 상세 객체 --- */
        setDepositConfirmDetails({
            product,
            depositAmount: amountNum,
            rateModifiers: { depositRateModifier: mod },
            finalCalculations: {
                baseInterestAmount: baseInterest,
                tierBonusInterestAmount: parseFloat((totalInterest - baseInterest).toFixed(4)),
                totalEstimatedInterest: totalInterest,
                finalPeriodRate: finalRate,
            },
            firestoreData: {
                baseRate,
                finalRate,
                tierApplied: currentTierInfo?.tierFullName || '기본 등급',
                tierAppliedMainName: tierMain,
                tierRateModifier: tierDelta,
                interestCalculatedOnRequest: totalInterest,
            },
        });
        setShowDepositConfirmModal(true);
    }, [
        selectedDepositProductId,
        bankSettings,
        depositAmount,
        studentAssets,
        currentTierInfo,
        showFeedback
    ]);

    /* ---------- 예금 신청 실행 ---------- */
    const executeDepositApplication = useCallback(async () => {
        if (!depositConfirmDetails) {
            showFeedback('예금 신청 정보가 없습니다.', 'error');
            return;
        }
        const { product, depositAmount: amt, firestoreData } = depositConfirmDetails;
        const now = new Date();
        const maturity = dayjs(now).add(product.days, 'day').toDate();

        setIsSubmittingDeposit(true);
        setShowDepositConfirmModal(false);

        try {
            const batch = writeBatch(db);
            const studentRef = doc(db, "classes", classId, "students", uid);
            const savingRef = doc(collection(db, "classes", classId, "students", uid, "savings"));

            batch.set(savingRef, {
                amount: amt,
                days: product.days,
                productId: product.id,
                productLabel: product.label,
                status: 'pending',
                classId,
                requestedBy: uid,
                createdAt: serverTimestamp(),
                clientRequestedAt: now,
                expectedMaturityDate: maturity,
                ...firestoreData,
                approvedBy: null,
                approvedAt: null,
                startedAt: null,
                processedAt: null,
            });
            batch.update(studentRef, { "assets.cash": increment(-amt) });

            await batch.commit();
            showFeedback('예금 신청이 완료되었습니다!', 'success');

            setDepositAmount('');
            const firstActive = bankSettings?.depositProducts?.filter(p => p.active)[0];
            setSelectedDepositProductId(firstActive?.id || '');
            await refreshStudentData?.();
        } catch (err) {
            console.error("예금 신청 오류:", err);
            showFeedback(`예금 신청 중 오류: ${err.message}`, 'error');

        } finally {
            setIsSubmittingDeposit(false);
            setDepositConfirmDetails(null);
        }
    }, [depositConfirmDetails, classId, uid, bankSettings, showFeedback, refreshStudentData]);

    return {
        selectedDepositProductId,
        setSelectedDepositProductId,
        depositAmount,
        setDepositAmount,
        showDepositConfirmModal,
        setShowDepositConfirmModal,
        depositConfirmDetails,
        handleOpenDepositConfirmModal,
        executeDepositApplication,
        isSubmittingDeposit,
    };
}
