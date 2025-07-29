// src/services/dashboardTaxService.js

import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../../../firebase'; // firebase.js에서 export한 functions 인스턴스를 사용합니다.
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// 1. 각 Cloud Function에 대한 참조를 따로 생성합니다.
const updateTaxIncomeCallable = httpsCallable(functions, 'updateTaxIncomeSummaryCallable');
const updateTaxExpenseCallable = httpsCallable(functions, 'updateTaxExpenseSummaryCallable');


/**
 * 세금 '수입' 현황 업데이트를 요청하는 서비스 함수.
 * 'updateTaxIncomeSummaryCallable' Cloud Function을 호출합니다.
 * @param {string} classId - 업데이트할 학급의 ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function triggerTaxIncomeUpdate(classId) {
    if (!classId) {
        const errorMessage = "학급 ID가 제공되지 않았습니다.";
        console.error(`[triggerTaxIncomeUpdate] ${errorMessage}`);
        return { success: false, message: errorMessage };
    }

    try {
        console.log(`[triggerTaxIncomeUpdate] Calling 'updateTaxIncomeSummaryCallable' for class: ${classId}`);
        const result = await updateTaxIncomeCallable({ classId: classId });
        const data = result.data || {};
        return { success: data.success, message: data.message || "수입 현황 업데이트 요청 성공" };

    } catch (error) {
        console.error("[triggerTaxIncomeUpdate] 수입 업데이트 함수 호출 중 오류:", error);
        return { success: false, message: error.message || '수입 현황 업데이트 중 오류가 발생했습니다.' };
    }
}


/**
 * 세금 '지출' 현황 업데이트를 요청하는 서비스 함수.
 * 'updateTaxExpenseSummaryCallable' Cloud Function을 호출합니다.
 * @param {string} classId - 업데이트할 학급의 ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function triggerTaxExpenseUpdate(classId) {
    if (!classId) {
        const errorMessage = "학급 ID가 제공되지 않았습니다.";
        console.error(`[triggerTaxExpenseUpdate] ${errorMessage}`);
        return { success: false, message: errorMessage };
    }

    try {
        console.log(`[triggerTaxExpenseUpdate] Calling 'updateTaxExpenseSummaryCallable' for class: ${classId}`);
        const result = await updateTaxExpenseCallable({ classId: classId });
        const data = result.data || {};
        return { success: true, message: data.message || "지출 현황 업데이트 요청 성공" };

    } catch (error) {
        console.error("[triggerTaxExpenseUpdate] 지출 업데이트 함수 호출 중 오류:", error);
        return { success: false, message: error.message || '지출 현황 업데이트 중 오류가 발생했습니다.' };
    }
}

// ⭐ 수정 3: 지출 기록 서비스 함수 추가 및 export
/**
 * 교사가 입력한 세금 지출 내역을 Firestore에 기록합니다.
 * @param {object} params
 * @param {string} params.classId
 * @param {number} params.amountUsed
 * @param {string} params.reason
 * @param {string} params.actorUid
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const recordTaxExpense = async ({ classId, amountUsed, reason, actorUid }) => {
    if (!classId || !amountUsed || !reason || !actorUid) {
        return { success: false, message: "필수 정보(금액, 사유)가 누락되었습니다." };
    }
    if (amountUsed <= 0) {
        return { success: false, message: "지출 금액은 0보다 커야 합니다." };
    }

    try {
        const historyColRef = collection(db, `classes/${classId}/taxUsageHistory`);
        await addDoc(historyColRef, {
            amountUsed: Number(amountUsed),
            reason: reason,
            usedAt: serverTimestamp(), // 지출 기록 시점
            recordedBy: actorUid,
        });
        return { success: true, message: "지출 내역이 성공적으로 기록되었습니다." };
    } catch (error) {
        console.error("Error recording tax expense:", error);
        return { success: false, message: "지출 내역 기록 중 오류가 발생했습니다." };
    }
};
