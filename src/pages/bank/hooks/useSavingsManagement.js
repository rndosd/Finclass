// src/pages/bank/hooks/useSavingsManagement.js
import { useState } from 'react';
import { db } from '../../../firebase';
import {
    doc,
    writeBatch,
    serverTimestamp,
    increment,
} from 'firebase/firestore';
import {
    logDepositClaimed,
    logDepositTerminated,
    logDepositRefund,
} from '../../../utils/logUtils';
import dayjs from 'dayjs';
import { useFeedback } from '../../../contexts/FeedbackContext'; // ✅
import { useUser } from '../../../contexts/UserContext';         // ✅

export default function useSavingsManagement({
    savings,
    uid,
    classId,
    isMyBankPage,
    currencyUnit,
    refreshStudentData,
}) {
    const { showFeedback } = useFeedback(); // ✅
    const { userData } = useUser();         // 현재 로그인 UID
    const actorUid = userData?.uid;

    const [isProcessingSaving, setIsProcessingSaving] = useState(false);

    // ✅ 만기일 계산 함수 추가
    const calculateMaturityDate = (saving) => {
        // 1순위: maturityDate 필드 사용 (실제 계산된 만기일)
        if (saving.maturityDate?.toDate) {
            return dayjs(saving.maturityDate.toDate());
        } else if (saving.maturityDate?.seconds) {
            return dayjs(new Date(saving.maturityDate.seconds * 1000));
        } else if (saving.maturityDate) {
            return dayjs(saving.maturityDate);
        }

        // 2순위: actualMaturityDate 필드 (기존 로직)
        if (saving.actualMaturityDate?.toDate) {
            return dayjs(saving.actualMaturityDate.toDate());
        } else if (saving.actualMaturityDate?.seconds) {
            return dayjs(new Date(saving.actualMaturityDate.seconds * 1000));
        } else if (saving.actualMaturityDate) {
            return dayjs(saving.actualMaturityDate);
        }

        // 3순위: startedAt + days로 계산 (fallback)
        let startedAtDate = null;
        if (saving.startedAt?.toDate) {
            startedAtDate = dayjs(saving.startedAt.toDate());
        } else if (saving.startedAt?.seconds) {
            startedAtDate = dayjs(new Date(saving.startedAt.seconds * 1000));
        } else if (saving.startedAt) {
            startedAtDate = dayjs(saving.startedAt);
        }

        if (startedAtDate && typeof saving.days === 'number' && saving.days > 0) {
            return startedAtDate.add(saving.days, 'day');
        }

        return null;
    };

    const processSavingAction = async (savingId, actionType) => {
        if (!isMyBankPage) {
            showFeedback('본인 예금만 처리할 수 있습니다.', 'warning');
            return;
        }
        if (!uid || !classId || !actorUid) {
            showFeedback('사용자/학급 정보가 부족합니다.', 'error');
            return;
        }

        const saving = savings.find((s) => s.id === savingId);
        if (!saving) {
            showFeedback('예금 정보를 찾을 수 없습니다.', 'error');
            return;
        }

        /* --- actionType별 처리 분기 --- */
        let newStatus = '';
        let payoutAmount = 0;
        let interestEarned = 0;
        let confirmMsg = '';

        const now = dayjs();

        // ✅ 개선된 만기일 계산
        const maturity = calculateMaturityDate(saving);

        // 디버깅 로그 추가
        console.log('=== useSavingsManagement 수령 처리 디버깅 ===');
        console.log('예금 ID:', savingId);
        console.log('액션 타입:', actionType);
        console.log('예금 상태:', saving.status);
        console.log('현재 시간:', now.format('YYYY-MM-DD HH:mm:ss'));
        console.log('만기일 계산 결과:', maturity?.format('YYYY-MM-DD HH:mm:ss'));
        console.log('만기 여부:', maturity ? now.isSameOrAfter(maturity, 'day') : false);
        console.log('원본 데이터:', {
            maturityDate: saving.maturityDate,
            actualMaturityDate: saving.actualMaturityDate,
            startedAt: saving.startedAt,
            days: saving.days
        });

        const baseParams = {
            classId,
            studentUid: uid,
            actorUid,
            currency: currencyUnit,
            relatedSavingId: savingId,
        };

        if (actionType === 'claim') {
            // ✅ 수령 조건 개선
            console.log('수령 조건 체크:');
            console.log('- status === "active":', saving.status === 'active');
            console.log('- maturity 존재:', !!maturity);
            console.log('- 현재시간 >= 만기일:', maturity ? now.isSameOrAfter(maturity, 'day') : false);

            if (saving.status !== 'active') {
                showFeedback('활성 상태의 예금만 수령 가능합니다.', 'warning');
                return;
            }

            if (!maturity) {
                showFeedback('만기일 정보를 찾을 수 없습니다.', 'error');
                return;
            }

            if (now.isBefore(maturity, 'day')) {
                const daysLeft = maturity.diff(now, 'day');
                showFeedback(`아직 만기가 되지 않았습니다. (${daysLeft}일 남음)`, 'warning');
                return;
            }

            interestEarned =
                saving.finalInterestPaid ?? saving.interestCalculatedOnRequest ?? 0;
            payoutAmount = saving.amount + interestEarned;
            newStatus = 'completed';
            confirmMsg = `'${saving.productLabel}' 예금을 해지하고 총 ${payoutAmount.toLocaleString()}${currencyUnit}을 수령하시겠습니까?`;
        } else if (actionType === 'terminate') {
            if (saving.status !== 'active') {
                showFeedback('진행 중 예금만 중도 해지 가능합니다.', 'warning');
                return;
            }
            payoutAmount = saving.amount;
            newStatus = 'terminated';
            confirmMsg = `'${saving.productLabel}' 예금을 중도 해지하시겠습니까? 원금만 반환됩니다.`;
        } else if (actionType === 'cancel_request') {
            if (saving.status !== 'pending') {
                showFeedback('승인 대기 예금만 취소 가능합니다.', 'warning');
                return;
            }
            payoutAmount = saving.amount;
            newStatus = 'cancelled_request';
            confirmMsg = `'${saving.productLabel}' 예금 신청을 취소하시겠습니까?`;
        } else {
            showFeedback('알 수 없는 작업입니다.', 'error');
            return;
        }

        if (!window.confirm(confirmMsg)) return;

        /* --- Firestore batch --- */
        setIsProcessingSaving(true);
        const batch = writeBatch(db);
        const studentRef = doc(db, 'classes', classId, 'students', uid);
        const savingRef = doc(db, 'classes', classId, 'students', uid, 'savings', savingId);

        batch.update(studentRef, { 'assets.cash': increment(payoutAmount) });
        if (actionType !== 'cancel_request') {
            batch.update(studentRef, { 'assets.deposit': increment(-saving.amount) });
        }

        const updateData = {
            status: newStatus,
            processedAt: serverTimestamp(),
            processedBy: actorUid,
        };
        if (actionType === 'claim') {
            updateData.claimedAt = serverTimestamp();
            updateData.finalInterestPaid = interestEarned;
        }
        if (actionType === 'terminate') {
            updateData.terminatedAt = serverTimestamp();
        }
        batch.update(savingRef, updateData);

        /* 로그 */
        const logParams = { ...baseParams, batchObject: batch };
        if (actionType === 'claim') {
            await logDepositClaimed({ ...logParams, principalAmount: saving.amount, interestAmount: interestEarned });
        } else if (actionType === 'terminate') {
            await logDepositTerminated({ ...logParams, principalAmount: saving.amount });
        } else if (actionType === 'cancel_request') {
            await logDepositRefund({
                ...logParams,
                amount: payoutAmount,
                refundActionCode: 'student_cancelled_refund',
                customDescription: `'${saving.productLabel}' 신청 취소`,
            });
        }

        try {
            await batch.commit();
            showFeedback(`예금 처리 완료! ${payoutAmount.toLocaleString()}${currencyUnit} 반환`, 'success');
            await refreshStudentData?.();
        } catch (err) {
            console.error('예금 처리 오류:', err);
            showFeedback(`예금 처리 중 오류: ${err.message}`, 'error');

        } finally {
            setIsProcessingSaving(false);
        }
    };

    return { processSavingAction, isProcessingSaving };
}