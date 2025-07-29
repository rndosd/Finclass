// src/pages/bank/hooks/useLoanRepayment.js
import { useState } from 'react';
import { db } from '../../../firebase';
import {
    doc,
    writeBatch,
    serverTimestamp,
    increment,
    getDoc,
} from 'firebase/firestore';
import dayjs from 'dayjs';
import { logLoanRepaid } from '../../../utils/logUtils';
import { useFeedback } from '../../../contexts/FeedbackContext';   // ✅
import { useUser } from '../../../contexts/UserContext';           // ✅

export default function useLoanRepayment({
    loans,
    studentAssets,
    studentInfo,
    uid,          // 학생 UID
    classId,
    isMyBankPage,
    isTeacher,
    isBankManager,
    currencyUnit,
    refreshStudentData,
}) {
    const { showFeedback } = useFeedback();       // ✅ 전역 피드백
    const { userData } = useUser();               // ✅ 현재 로그인 UID
    const actorUid = userData?.uid;               //   (교사·학생 관계없이)

    const [showRepayModal, setShowRepayModal] = useState(false);
    const [selectedLoanId, setSelectedLoanId] = useState(null);
    const [isRepayingLoan, setIsRepayingLoan] = useState(false);

    /* ---------- 모달 열기/닫기 ---------- */
    const handleOpenRepayModal = (loanId) => {
        setSelectedLoanId(loanId);
        setShowRepayModal(true);
    };
    const handleCloseRepayModal = () => {
        setShowRepayModal(false);
        setSelectedLoanId(null);
    };

    /* ---------- 조기 상환이자 계산 ---------- */
    const calculateEarlyRepaymentInterest = (loan) => {
        if (!loan.startedAt?.toDate || !loan.days) return loan.interestLeft ?? 0;

        const start = dayjs(loan.startedAt.toDate());
        const now = dayjs();
        const ratio = Math.min(now.diff(start, 'day'), loan.days) / loan.days;

        const reCalc = Math.round((loan.totalInterest ?? 0) * ratio);
        return Math.max(
            reCalc - (loan.totalInterestPaidOnThisLoan ?? 0),
            0
        );
    };

    /* ---------- 상환 실행 ---------- */
    const handleRepayLoan = async (loanIdToRepay, amountInput) => {
        const amountToPay = Number(amountInput);

        /* --- 기본 검증 --- */
        if (!actorUid) {
            showFeedback('로그인 정보가 없습니다.', 'error');
            return;
        }
        if (!loanIdToRepay || isNaN(amountToPay) || amountToPay <= 0) {
            showFeedback('상환 정보가 올바르지 않습니다.', 'warning');
            return;
        }

        /* --- 최신 대출 데이터 fetch --- */
        const loanRef = doc(
            db,
            'classes',
            classId,
            'students',
            uid,
            'loans',
            loanIdToRepay
        );
        const loanSnap = await getDoc(loanRef);
        if (!loanSnap.exists()) {
            showFeedback('대출 정보를 찾을 수 없습니다.', 'error');
            return;
        }
        const loan = { id: loanIdToRepay, ...loanSnap.data() };

        if (!['approved', 'ongoing'].includes(loan.status)) {
            showFeedback(`상환 불가 상태입니다 (${loan.status})`, 'error');
            return;
        }
        if (amountToPay > studentAssets.cash) {
            showFeedback('현금이 부족합니다.', 'error');
            return;
        }

        /* --- 계산 --- */
        let principalLeft = loan.amountLeft ?? loan.amount;
        let interestLeft = calculateEarlyRepaymentInterest(loan);
        const totalOwed = principalLeft + interestLeft;

        if (amountToPay > totalOwed + 0.001) {
            showFeedback({ type: 'error', message: '상환액이 남은 총액을 초과합니다.' });
            return;
        }

        let payInterest = 0, payPrincipal = 0, remain = amountToPay;
        if (interestLeft) {
            payInterest = Math.min(remain, interestLeft);
            interestLeft -= payInterest;
            remain -= payInterest;
        }
        if (remain && principalLeft) {
            payPrincipal = Math.min(remain, principalLeft);
            principalLeft -= payPrincipal;
        }
        interestLeft = Number(interestLeft.toFixed(2));
        principalLeft = Number(principalLeft.toFixed(2));

        const fullyRepaid = principalLeft < 0.01 && interestLeft < 0.01;

        /* --- Firestore batch --- */
        setIsRepayingLoan(true);
        const batch = writeBatch(db);
        const studentRef = doc(db, 'classes', classId, 'students', uid);

        batch.update(studentRef, {
            'assets.cash': increment(-amountToPay),
            'assets.loan': increment(-payPrincipal),
        });

        batch.update(loanRef, {
            amountLeft: principalLeft,
            interestLeft,
            status: fullyRepaid ? 'repaid' : loan.status === 'approved' ? 'ongoing' : loan.status,
            lastRepaymentAt: serverTimestamp(),
            totalRepaidAmount: increment(amountToPay),
            totalInterestPaidOnThisLoan: increment(payInterest),
            ...(fullyRepaid && {
                actualRepaymentDate: serverTimestamp(),
                finalInterestPaid: (loan.totalInterestPaidOnThisLoan || 0) + payInterest,
            }),
        });

        await logLoanRepaid({
            classId,
            studentUid: uid,
            actorUid,
            repaidAmount: amountToPay,
            currency: currencyUnit,
            isFullRepayment: fullyRepaid,
            relatedDocId: loanIdToRepay,
            detailsForDescription: {
                productName: loan.productLabel,
                paidPrincipal: payPrincipal,
                paidInterest: payInterest,
            },
            batchObject: batch,
        });

        try {
            await batch.commit();
            showFeedback(
                fullyRepaid
                    ? '대출금 상환 완료!'
                    : `${amountToPay.toLocaleString()}${currencyUnit} 상환 처리`,
                'success'
            );
            handleCloseRepayModal();
            await refreshStudentData?.();
        } catch (err) {
            console.error('대출 상환 오류:', err);
            showFeedback({ type: 'error', message: `대출 상환 중 오류: ${err.message}` });
            showFeedback(`대출 상환 중 오류: ${err.message}`, 'error');
        } finally {
            setIsRepayingLoan(false);
        }
    };

    return {
        showRepayModal,
        selectedLoanId,
        handleOpenRepayModal,
        handleCloseRepayModal,
        handleRepayLoan,
        isRepayingLoan,
        calculateEarlyRepaymentInterest,
    };
}
