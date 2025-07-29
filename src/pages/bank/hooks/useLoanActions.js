// src/pages/bank/hooks/useLoanActions.js
import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import dayjs from 'dayjs';
import { calculateLoanInterest } from '../../../utils/bankUtils';
import { useFeedback } from '../../../contexts/FeedbackContext';   // ✅ 전역 피드백

export default function useLoanActions({
    bankSettings,
    creditScore,
    currentTierInfo,
    uid,
    classId,
    isMyBankPage,
    currencyUnit,
    refreshStudentData,
}) {
    const { showFeedback } = useFeedback();                         // ✅

    const [selectedLoanProductId, setSelectedLoanProductId] = useState('');
    const [loanAmount, setLoanAmount] = useState('');
    const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);

    // 확인 모달
    const [showLoanConfirmModal, setShowLoanConfirmModal] = useState(false);
    const [loanConfirmDetails, setLoanConfirmDetails] = useState(null);

    /* ---------- 초기 상품 선택 ---------- */
    useEffect(() => {
        if (bankSettings?.loanProducts?.length) {
            const active = bankSettings.loanProducts.filter(p => p.active);
            const valid = active.some(p => p.id === selectedLoanProductId);
            if (!valid) setSelectedLoanProductId(active[0]?.id || '');
        } else {
            setSelectedLoanProductId('');
        }
    }, [bankSettings, selectedLoanProductId]);

    /* ---------- 확인 모달 열기 ---------- */
    const handleOpenLoanConfirmModal = useCallback(() => {
        /* 유효성 검사 */
        if (!selectedLoanProductId) {
            showFeedback('대출 상품을 선택해주세요.', 'warning');
            return;
        }
        const product = bankSettings?.loanProducts?.find(p => p.id === selectedLoanProductId);
        if (!product) {
            showFeedback('선택한 대출 상품 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        if (typeof product.periodRate !== 'number') {
            showFeedback(`상품(${product.label})의 기간 이율이 잘못되었습니다.`, 'error');
            return;
        }

        const amountNum = Number(loanAmount);
        if (amountNum <= 0 || isNaN(amountNum)) {
            showFeedback('대출 금액은 0보다 큰 숫자여야 합니다.', 'warning');
            return;
        }
        const minCredit = product.minCreditScore ?? 0;
        if ((creditScore ?? 0) < minCredit) {
            showFeedback(`신용점수가 상품 요구(${minCredit}점) 미만입니다.`, 'error');
            return;
        }
        if (product.maxLoanProductLimit && amountNum > product.maxLoanProductLimit) {
            showFeedback('이 상품의 최대 대출액을 초과했습니다.', 'error');
            return;
        }

        /* 티어 보정 계산 */
        const tierMain = currentTierInfo?.mainTierName || '기본';
        const mod = bankSettings?.bankTierRateAdjustments?.[tierMain]?.loanRateModifier ?? 0;
        const weeks = product.days ? product.days / 7 : 1;
        const delta = parseFloat((mod * weeks).toFixed(4));
        const baseRate = product.periodRate;
        const finalRate = Math.max(0, parseFloat((baseRate + delta).toFixed(4)));

        const baseInterest = calculateLoanInterest(amountNum, baseRate, product.days);
        const totalInterest = calculateLoanInterest(amountNum, finalRate, product.days);

        setLoanConfirmDetails({
            product,
            loanAmount: amountNum,
            studentCreditInfo: { tierFullName: currentTierInfo?.tierFullName || '기본 등급' },
            rateModifiers: { loanRateModifier: mod },
            finalCalculations: {
                baseInterestAmount: baseInterest,
                tierBonusInterestAmount: parseFloat((totalInterest - baseInterest).toFixed(4)),
                totalEstimatedInterest: totalInterest,
                finalPeriodRate: finalRate,
            },
            firestoreData: {
                basePeriodRate: baseRate,
                tierAppliedFullName: currentTierInfo?.tierFullName || '기본 등급',
                tierAppliedMainName: tierMain,
                tierRateModifierApplied: delta,
                finalPeriodRateApplied: finalRate,
                interestCalculatedOnRequest: totalInterest,
            },
        });
        setShowLoanConfirmModal(true);
    }, [
        selectedLoanProductId,
        loanAmount,
        bankSettings,
        creditScore,
        currentTierInfo,
        showFeedback,
    ]);

    /* ---------- 대출 신청 실행 ---------- */
    const executeLoanApplication = useCallback(async () => {
        if (!isMyBankPage || !loanConfirmDetails) {
            showFeedback('대출 신청 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        const { product, loanAmount: amt, firestoreData } = loanConfirmDetails;

        setIsSubmittingLoan(true);
        setShowLoanConfirmModal(false);

        try {
            const batch = writeBatch(db);
            const loanRef = doc(collection(db, "classes", classId, "students", uid, "loans"));

            const now = new Date();
            const repayDate = dayjs(now).add(product.days, 'day').toDate();

            batch.set(loanRef, {
                amount: amt,
                days: product.days,
                productId: product.id,
                productLabel: product.label,
                status: 'pending',
                classId,
                requestedBy: uid,
                createdAt: serverTimestamp(),
                clientRequestedAt: now,
                expectedRepaymentDate: repayDate,
                ...firestoreData,
                amountLeft: amt,
                interestLeft: firestoreData.interestCalculatedOnRequest,
                totalToRepayOnRequest: amt + firestoreData.interestCalculatedOnRequest,
                approvedBy: null,
                approvedAt: null,
                startedAt: null,
            });

            await batch.commit();
            showFeedback('대출 신청이 완료되었습니다. 관리자 승인을 기다려주세요.', 'success');

            /* 입력값 리셋 */
            setLoanAmount('');
            const firstActive = bankSettings?.loanProducts?.filter(p => p.active)[0];
            setSelectedLoanProductId(firstActive?.id || '');

            await refreshStudentData?.();
        } catch (err) {
            console.error('대출 신청 오류:', err);
            showFeedback(`대출 신청 중 오류: ${err.message}`, 'error');
        } finally {
            setIsSubmittingLoan(false);
            setLoanConfirmDetails(null);
        }
    }, [
        isMyBankPage,
        loanConfirmDetails,
        classId,
        uid,
        bankSettings,
        refreshStudentData,
        showFeedback,
    ]);

    return {
        selectedLoanProductId,
        setSelectedLoanProductId,
        loanAmount,
        setLoanAmount,
        isSubmittingLoan,
        showLoanConfirmModal,
        setShowLoanConfirmModal,
        loanConfirmDetails,
        handleOpenLoanConfirmModal,
        executeLoanApplication,
    };
}
