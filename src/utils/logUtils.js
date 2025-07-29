// src/utils/logUtils.js

import { db } from '../firebase'; // Adjust the path to your firebase.js
import {
    collection,
    addDoc,
    doc, // Only if you plan to set custom log IDs, otherwise addDoc is fine
    serverTimestamp,
    writeBatch,
    setDoc,
    getDoc
} from 'firebase/firestore';

/**
 * -----------------------------------------------------------------------------
 * Core Logging Functions
 * -----------------------------------------------------------------------------
 */

/**
 * 활동 로그를 Firestore에 기록하는 함수.
 * WriteBatch를 사용하거나 직접 addDoc으로 추가할 수 있습니다.
 */
export const writeActivityLog = async ({
    classId,
    studentUid,    // 로그의 주체가 되는 학생 UID
    actorUid,      // 행동을 수행한 주체의 UID (학생, 교사, 시스템 등)
    type,          // 로그 유형 (예: 'transfer', 'deposit_request')
    action,        // 세부 행동 (예: 'sent', 'received', 'approved')
    amount,        // 금액 (숫자, 금융 관련 로그에만 해당)
    currency,      // 통화 단위
    description,   // 로그 설명
    relatedDocId,  // 관련된 다른 문서 ID (선택 사항)
    counterpartyUid, // 거래 상대방 UID (선택 사항)
    counterpartyName,// 거래 상대방 이름 (선택 사항)
    date,          // 로그 발생 시각 (Firestore Timestamp)
    batchObject,   // Firestore WriteBatch 객체 (선택 사항)
}) => {
    if (!classId || !studentUid || !actorUid || !type || !action) {
        const errorMsg = 'Missing required fields for activity log.';
        console.error(errorMsg, { classId, studentUid, actorUid, type, action });
        return Promise.reject(new Error(errorMsg));
    }

    const logData = {
        classId,
        studentUid,
        actorUid,
        type,
        action,
        description,
        date: date || serverTimestamp(),
    };

    if (amount !== undefined && amount !== null) {
        logData.amount = Number(amount);
        logData.currency = currency || '통화정보없음';
    }

    if (relatedDocId) logData.relatedDocId = relatedDocId;
    if (counterpartyUid) logData.counterpartyUid = counterpartyUid;
    if (counterpartyName) logData.counterpartyName = counterpartyName;

    const logCollectionPath =
        type === 'transfer'
            ? `classes/${classId}/students/${studentUid}/transferLogs`
            : `classes/${classId}/students/${studentUid}/activityLogs`;

    try {
        if (batchObject) {
            const newLogRef = doc(collection(db, logCollectionPath));
            batchObject.set(newLogRef, logData);
        } else {
            await addDoc(collection(db, logCollectionPath), logData);
        }
        return Promise.resolve();
    } catch (error) {
        console.error('[writeActivityLog] Error writing transfer log:', error, "Data attempted:", logData);
        return Promise.reject(error);
    }
};

/**
 * Writes a credit log to Firestore.
 */
const writeCreditLog = async ({
    classId,
    studentUid,     // UID of the student whose credit score is affected
    actorUid,       // UID of the teacher or authorized student performing the adjustment
    change,         // Numerical change in credit score (+ or -)
    reason,         // Text description for the reason of change
    source,         // Source of change (e.g., 'manual', 'fine_applied', 'system_연체')
    relatedDocId,   // Optional: ID of a related document (e.g., ruleId that led to fine)
    batchObject,    // Optional: Firestore WriteBatch object
}) => {
    if (!classId || !studentUid || !actorUid || change === undefined || !reason || !source) {
        console.error('Missing required fields for credit log:', { classId, studentUid, actorUid, change, reason, source });
        return Promise.reject(new Error('Missing required fields for credit log.'));
    }

    const logData = {
        studentUid,
        actorUid,
        change: Number(change),
        reason,
        source,
        timestamp: serverTimestamp(),
    };

    if (relatedDocId) {
        logData.relatedDocId = relatedDocId;
    }

    const logCollectionRef = collection(db, `classes/${classId}/students/${studentUid}/creditLogs`);

    try {
        if (batchObject) {
            const newLogRef = doc(collection(db, `classes/${classId}/students/${studentUid}/creditLogs`));
            batchObject.set(newLogRef, logData);
        } else {
            await addDoc(logCollectionRef, logData);
        }
        return Promise.resolve();
    } catch (error) {
        console.error('Error writing credit log:', error, logData);
        return Promise.reject(error);
    }
};

/**
 * -----------------------------------------------------------------------------
 * Activity Log Helper Functions
 * -----------------------------------------------------------------------------
 */

// --- Store ---
export const logItemPurchased = ({ classId, studentUid, actorUid, itemName, amount, currency, relatedDocId }) => {
    return writeActivityLog({
        classId,
        studentUid,
        actorUid: actorUid || studentUid, // If actor not specified, assume student is actor
        type: 'store',
        action: 'item_purchased',
        amount: -Math.abs(Number(amount)),
        currency,
        description: `${itemName} 구매`,
        relatedDocId, // e.g., itemId from 'items' collection
    });
};

export const logPurchaseCancelled = ({ classId, studentUid, actorUid, itemName, amount, currency, relatedDocId }) => {
    // actorUid here is likely a teacher's UID
    return writeActivityLog({
        classId,
        studentUid,
        actorUid,
        type: 'store',
        action: 'purchase_cancelled',
        amount: Math.abs(Number(amount)),
        currency,
        description: `${itemName} 구매 취소`,
        relatedDocId, // e.g., original transaction log ID or itemId
    });
};

export const logTransfer = async ({
    classId,
    senderUid,
    receiverUid,
    amount,
    currency = '단위',
    senderName,
    receiverName,
}) => {
    const absAmount = Math.abs(Number(amount));
    const date = serverTimestamp();

    // 이름 조회 부분은 그대로...
    if (!senderName || !receiverName) {
        // ... 기존 코드 유지
    }

    const transferData = {
        classId,
        senderUid,
        receiverUid,
        senderName,
        receiverName,
        amount: absAmount,
        currency,
        date,
    };

    try {
        const batch = writeBatch(db);

        // 보내는 사람 로그 (sent 타입)
        const senderLogRef = doc(collection(db, `classes/${classId}/students/${senderUid}/transferLogs`));
        batch.set(senderLogRef, { ...transferData, type: 'sent' });

        // 받는 사람 로그 (received 타입)
        const receiverLogRef = doc(collection(db, `classes/${classId}/students/${receiverUid}/transferLogs`));
        batch.set(receiverLogRef, { ...transferData, type: 'received' });

        await batch.commit();
        console.log('[logTransfer] 송금 로그 기록 완료');
    } catch (err) {
        console.error('[logTransfer] 송금 로그 저장 실패:', err);
        throw err;
    }
};

// --- Loan ---
export const logLoanApproved = ({ classId, studentUid, actorUid, loanAmount, currency, durationDays, interestRate, relatedLoanId }) => {
    // actorUid is likely a teacher or system that approved the loan
    return writeActivityLog({
        classId,
        studentUid,
        actorUid,
        type: 'loan',
        action: 'loan_approved',
        amount: Math.abs(Number(loanAmount)),
        currency,
        description: `대출 승인 (기간: ${durationDays}일, 이율: ${interestRate}%)`,
        relatedDocId: relatedLoanId, // loans/{loanId}
    });
};

export const logLoanRepaid = ({
    classId,
    studentUid,
    actorUid,
    repaidAmount, // 총 상환액
    currency,
    isFullRepayment,
    relatedLoanId,
    detailsForDescription, // { productName, paidPrincipal, paidInterest }
    batchObject, // batchObject 파라미터 추가 (이전 코드에는 없었음)
}) => {
    let description;
    if (detailsForDescription) {
        description = `'${detailsForDescription.productName}' 대출금 ${Number(repaidAmount).toLocaleString()}${currency} 상환 (원금 ${Number(detailsForDescription.paidPrincipal).toLocaleString()}, 이자 ${Number(detailsForDescription.paidInterest).toLocaleString()})`;
        if (isFullRepayment) {
            description += " - 완납";
        }
    } else {
        description = isFullRepayment ? `대출 전액 상환 (${Number(repaidAmount).toLocaleString()}${currency})` : `대출 일부 상환 (${Number(repaidAmount).toLocaleString()}${currency})`;
    }

    return writeActivityLog({
        classId,
        studentUid,
        actorUid: actorUid || studentUid, // actorUid가 없으면 studentUid를 사용
        type: 'loan',
        action: 'loan_repaid',
        amount: -Math.abs(Number(repaidAmount)), // 학생 계좌에서 현금 감소 (-)
        currency,
        description, // 동적으로 생성된 상세 설명 사용
        relatedDocId: relatedLoanId,
        batchObject, // writeActivityLog에 batchObject 전달
    });
};

// --- Savings (Deposit) ---
export const logDepositApproved = ({ classId, studentUid, actorUid, depositAmount, currency, durationDays, interestRate, relatedSavingId }) => {
    // actorUid is likely a teacher or system that approved the deposit
    return writeActivityLog({
        classId,
        studentUid,
        actorUid,
        type: 'deposit',
        action: 'deposit_approved',
        amount: -Math.abs(Number(depositAmount)), // Cash moves from student to savings
        currency,
        description: `적금 가입 (기간: ${durationDays}일, 이율: ${interestRate}%)`,
        relatedDocId: relatedSavingId, // savings/{savingId}
    });
};

export const logDepositInterestPaid = ({ classId, studentUid, actorUid, interestAmount, currency, relatedSavingId }) => {
    // actorUid is likely "SYSTEM" or a teacher UID if manual
    return writeActivityLog({
        classId,
        studentUid,
        actorUid,
        type: 'deposit',
        action: 'deposit_interest_paid',
        amount: Math.abs(Number(interestAmount)),
        currency,
        description: `적금 만기 이자 지급`,
        relatedDocId: relatedSavingId, // savings/{savingId}
    });
};

/**
 * 예금 만기 수령 로그를 기록합니다.
 * 학생이 만기된 예금의 원금과 이자를 현금으로 수령할 때 사용됩니다.
 */
export const logDepositClaimed = ({
    classId,
    studentUid,     // 예금을 수령하는 학생 UID
    actorUid,       // 이 경우 학생 본인 UID (studentUid와 동일)
    principalAmount,// 원금
    interestAmount, // 지급된 이자
    currency,
    relatedSavingId,// 관련 예금 문서 ID
    batchObject,
}) => {
    const totalPayout = Math.abs(Number(principalAmount)) + Math.abs(Number(interestAmount));
    return writeActivityLog({
        classId,
        studentUid,
        actorUid,
        type: 'deposit_event', // 예금 관련 이벤트
        action: 'claim_matured_payout', // 만기 수령 및 지급
        amount: totalPayout, // 학생에게 현금 증가 (+)
        currency,
        description: `예금 만기 수령 (원금 ${Number(principalAmount).toLocaleString()}${currency}, 이자 ${Number(interestAmount).toLocaleString()}${currency})`,
        relatedDocId: relatedSavingId,
        batchObject,
    });
};

/**
 * 예금 중도 해지 로그를 기록합니다. (이자 없이 원금만 반환)
 * 학생이 예금을 중도 해지하고 원금만 현금으로 돌려받을 때 사용됩니다.
 */
export const logDepositTerminated = ({
    classId,
    studentUid,     // 예금을 해지하는 학생 UID
    actorUid,       // 이 경우 학생 본인 UID (studentUid와 동일)
    principalAmount,// 반환되는 원금
    currency,
    relatedSavingId,// 관련 예금 문서 ID
    batchObject,
}) => {
    const payoutAmount = Math.abs(Number(principalAmount));
    return writeActivityLog({
        classId,
        studentUid,
        actorUid,
        type: 'deposit_event', // 예금 관련 이벤트
        action: 'terminate_early_principal_only', // 중도 해지 (원금만)
        amount: payoutAmount, // 학생에게 현금 증가 (+)
        currency,
        description: `예금 중도 해지 (원금 ${payoutAmount.toLocaleString()}${currency} 반환, 중도 이자 없음)`,
        relatedDocId: relatedSavingId,
        batchObject,
    });
};

/**
 * 예금 관련 환불 로그를 기록합니다.
 * (예: 교사가 예금 신청을 거절하여 선차감된 금액을 환불하거나, 학생이 승인 대기 중인 신청을 직접 취소하여 환불받는 경우)
 */
export const logDepositRefund = ({
    classId,
    studentUid,     // 환불받는 학생 UID
    actorUid,       // 환불 처리를 한 주체 (교사 UID 또는 학생 본인 UID)
    amount,         // 환불된 금액
    currency,
    relatedSavingId,// 관련 예금 신청(또는 문서) ID
    refundActionCode, // 환불 사유를 나타내는 코드 (예: 'teacher_rejected_refund', 'student_cancelled_refund')
    customDescription,// (선택적) 기본 설명 대신 사용할 설명
    batchObject,
}) => {
    const refundAmount = Math.abs(Number(amount));
    let description = customDescription;

    if (!description) {
        if (refundActionCode === 'teacher_rejected_refund') {
            description = `예금 신청 거절로 ${refundAmount.toLocaleString()}${currency} 환불`;
        } else if (refundActionCode === 'student_cancelled_refund') {
            description = `예금 신청 본인 취소로 ${refundAmount.toLocaleString()}${currency} 환불`;
        } else {
            description = `예금 관련 ${refundAmount.toLocaleString()}${currency} 환불`;
        }
    }

    return writeActivityLog({
        classId,
        studentUid,
        actorUid,
        type: 'deposit_refund', // 타입 명확화: '예금 환불'
        action: refundActionCode || 'generic_refund', // 구체적인 환불 원인 액션 코드
        amount: refundAmount, // 학생에게 현금 증가 (+)
        currency,
        description,
        relatedDocId: relatedSavingId,
        batchObject,
    });
};


/**
 * 세금 고지 알림 로그를 기록합니다.
 * 학생에게 새로운 세금이 부과되었음을 알리는 정보성 로그입니다.
 * (실제 현금 변동은 없으며, 납부는 별도의 logTaxPayment를 통해 기록됩니다.)
 */
export const logTaxAssessed = ({
    classId,
    studentUid,     // 세금 고지를 받는 학생 UID
    actorUid,       // 세금 고지를 한 주체 (교사 UID)
    assessedAmount, // 고지된 세금액 (설명에 사용될 정보)
    currency,       // 화폐 단위
    taxTypeDescription, // 세금의 종류 또는 고지서 이름/사유
    relatedDocId,   // 생성된 세금 고지서 문서의 ID
    batchObject,    // (선택적) Firestore WriteBatch 객체
}) => {
    // 실제 현금 이동이 아니므로 amount는 0으로 설정, currency는 null 또는 생략 가능
    // 중요한 정보는 description에 포함
    const description = `${taxTypeDescription || '세금'} ${Number(assessedAmount).toLocaleString()}${currency} 납부 고지. (상세내역 확인 요망)`;

    return writeActivityLog({
        classId,
        studentUid,
        actorUid,
        type: 'tax_event', // 세금 관련 이벤트
        action: 'assessment_notification', // 고지 알림
        amount: 0, // 알림성 로그이므로 실제 자산 변동액은 0
        currency: null, // 금액이 0이므로 통화 단위도 null 또는 생략
        description,
        relatedDocId,
        counterpartyUid: null, // 이 경우 특정 거래 상대방은 없음
        batchObject,
    });
};

/**
 * 학생이 세금을 납부했을 때 로그를 기록합니다.
 * (예: 수동으로 부과된 세금, 재산세 등 월급 자동 공제 외의 세금 납부 시)
 */
export const logTaxPayment = ({
    classId,
    studentUid,     // 세금을 납부한 학생 UID
    actorUid,       // 납부 행위를 한 주체 (보통 학생 본인 studentUid)
    taxAmount,      // 납부한 세금액 (양수로 전달)
    currency,       // 화폐 단위
    taxTypeDescription, // 납부한 세금의 종류 또는 고지서 이름/사유
    relatedDocId,   // 납부 처리한 taxAssessments 문서 ID 또는 관련 세금 규칙 ID
    batchObject,    // (선택적) Firestore WriteBatch 객체
}) => {
    const amountPaid = Math.abs(Number(taxAmount));

    return writeActivityLog({
        classId,
        studentUid,
        actorUid,
        type: 'tax', // 세금 관련
        action: 'payment_processed', // 납부 처리됨 (수동 납부의 경우 'manual_payment' 등으로 더 구체화 가능)
        amount: -amountPaid, // 학생 계좌에서 현금 차감 (-)
        currency,
        description: `${taxTypeDescription || '세금'} ${amountPaid.toLocaleString()}${currency} 납부 완료`,
        relatedDocId,
        counterpartyUid: null, // 이 경우 특정 거래 상대방은 보통 없음 (국가/시스템에 납부하는 개념)
        batchObject,
    });
};


/**
 * -----------------------------------------------------------------------------
 * Credit Log Helper Functions
 * -----------------------------------------------------------------------------
 */

export const logCreditChangeManual = ({ classId, studentUid, actorUid, change, reason, relatedDocId }) => {
    // actorUid is the teacher or authorized student making the change
    return writeCreditLog({
        classId,
        studentUid,
        actorUid, // Teacher/Authorized student UID
        change,
        reason,
        source: 'manual_adjustment',
        relatedDocId,
    });
};

// Example: if a loan becomes overdue, system might log credit change
export const logCreditChangeSystem = ({ classId, studentUid, change, reason, relatedDocId }) => {
    return writeCreditLog({
        classId,
        studentUid,
        actorUid: 'SYSTEM', // Or a specific system user ID
        change,
        reason,
        source: 'system_auto', // e.g., system_loan_overdue
        relatedDocId, // e.g., loanId
    });
};

export const logCreditChangeByFine = ({ classId, studentUid, actorUid, creditChangeAmount, ruleText, relatedFineLogIdOrRuleId }) => {
    // actorUid is the teacher who applied the fine (which results in credit change)
    return writeCreditLog({
        classId,
        studentUid,
        actorUid,
        change: creditChangeAmount, // Should be negative
        reason: `${ruleText} 위반으로 인한 신용점수 변경`,
        source: 'fine_penalty',
        relatedDocId: relatedFineLogIdOrRuleId, // ID of the fine's activity log or policeRules/{ruleId}
    });
};

/**
 * 학생의 상점 상품 구매 활동을 기록합니다.
 * @param {object} params - 로그 기록에 필요한 파라미터 객체
 * @param {string} params.classId - 학급 ID
 * @param {string} params.studentUid - 구매한 학생 UID
 * @param {string} params.actorUid - 활동 주체 UID (보통 학생 본인)
 * @param {string} params.itemId - 구매한 상품 ID
 * @param {string} params.itemName - 구매한 상품명
 * @param {number} params.quantity - 구매 수량
 * @param {number} params.pricePerItem - 개당 가격
 * @param {number} params.totalCost - 총 구매 비용 (수수료 등이 있다면 포함된 최종 비용)
 * @param {string} params.currencyUnit - 사용된 화폐 단위 (예: "빌")
 * @param {string} params.relatedTransactionId - 연관된 상세 거래내역 문서 ID (선택적)
 * @param {object} params.batchObject - Firestore WriteBatch 객체 (선택적, 배치 작업에 포함시킬 경우)
 * @returns {Promise<string|void>} 생성된 로그 문서 ID 또는 void
 */
export const logStorePurchase = async ({
    classId,
    studentUid,
    actorUid,
    itemId,
    itemName,
    quantity,
    pricePerItem,
    totalCost,
    currencyUnit, // ★ 학급 화폐 단위
    relatedTransactionId,
    batchObject
}) => {
    if (!db || !classId || !studentUid || !itemId || !itemName || typeof quantity !== 'number' || typeof totalCost !== 'number' || !currencyUnit) {
        console.error("logStorePurchase: Missing required parameters.");
        // 실제 운영 환경에서는 이 오류를 좀 더 적극적으로 처리하거나 로깅할 수 있습니다.
        return Promise.reject(new Error("Missing required parameters for logging store purchase."));
    }

    const logData = {
        actorUid: actorUid || studentUid,
        targetUid: studentUid,
        type: 'store_transaction', // 로그 타입 (예: 상점 거래)
        action: 'item_purchased',  // 활동 유형 (예: 상품 구매)
        timestamp: serverTimestamp(),
        description: `${itemName} ${quantity}개 구매 (-${totalCost.toLocaleString()} ${currencyUnit})`,
        details: {
            itemId,
            itemName,
            quantity,
            pricePerItem,
            totalCost,
            currency: currencyUnit, // 사용된 화폐 단위 명시
        },
    };

    if (relatedTransactionId) {
        logData.relatedTransactionId = relatedTransactionId;
    }

    // activityLogs 경로: classes/{classId}/students/{studentUid}/activityLogs/{logId}
    const activityLogRef = doc(collection(db, "classes", classId, "students", studentUid, "activityLogs"));

    try {
        if (batchObject) {
            batchObject.set(activityLogRef, logData);
            console.log(`[logStorePurchase] Activity log for item purchase prepared in batch for student ${studentUid}.`);
        } else {
            await setDoc(activityLogRef, logData);
            console.log(`[logStorePurchase] Activity log for item purchase written for student ${studentUid}.`);
        }
        return activityLogRef.id; // 생성된 로그 ID 반환 (선택적)
    } catch (error) {
        console.error("Error writing store purchase activity log:", error);
        // 오류를 다시 throw하거나, 또는 실패를 나타내는 값을 반환할 수 있습니다.
        return Promise.reject(error);
    }
};