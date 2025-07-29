// src/utils/policeUtils.js

import { doc, increment, serverTimestamp, writeBatch, collection } from 'firebase/firestore';

/**
 * Firestore 경로 헬퍼
 */
export const getPath = (type, classId, studentUid = null, docId = null) => {
    if (!classId) {
        console.error("policeUtils getPath: classId is undefined for type:", type);
        return null;
    }
    switch (type) {
        case 'reports': return `classes/${classId}/policeReports`;
        case 'reportDoc': return `classes/${classId}/policeReports/${docId}`;
        case 'studentDoc': return `classes/${classId}/students/${studentUid}`;
        case 'policeFineHistory': return `classes/${classId}/policeFineHistory`;
        default:
            console.error(`Unknown path type in policeUtils: ${type}`);
            return null;
    }
};

/**
 * 규칙 적용 + 신용점수 로그 남기기 (필드 표준화: amount, reason, ...)
 */
export const applyPenaltyAndLog = async ({
    batch, db, classId, studentUid, studentName,
    ruleId, reason,
    reportId,
    originalReportCreatedAt,
    policeRules,
    actorUid, actorName
}) => {
    if (!batch || !db || !classId || !studentUid || !ruleId || !policeRules || !actorUid || !actorName) {
        return { success: false, message: '벌금 적용을 위한 필수 정보가 부족합니다.' };
    }

    const rule = policeRules.find(r => r.id === ruleId);
    if (!rule) return { success: false, message: '규칙 정보를 찾을 수 없습니다.' };

    const studentPath = getPath('studentDoc', classId, studentUid);
    const fineHistoryPath = getPath('policeFineHistory', classId);

    if (!studentPath || !fineHistoryPath) {
        return { success: false, message: '데이터 경로 생성에 실패했습니다.' };
    }

    const studentRef = doc(db, studentPath);
    const fineRef = doc(collection(db, fineHistoryPath)); // 벌금 기록 문서

    const fineAmountToApply = Math.abs(rule.fineAmount || 0);
    const creditChangeToApply = rule.creditChange || 0;

    // 1. 자산 변화 처리
    if (fineAmountToApply > 0) {
        batch.update(studentRef, { "assets.cash": increment(-fineAmountToApply) });
    }
    if (creditChangeToApply !== 0) {
        batch.update(studentRef, { creditScore: increment(creditChangeToApply) });

        // ✅ creditLogs 기록 (필드명 표준화)
        const creditLogRef = doc(collection(db, `classes/${classId}/students/${studentUid}/creditLogs`));
        batch.set(creditLogRef, {
            amount: creditChangeToApply,
            reason: `'${rule.text}' 위반으로 인한 신용점수 ${creditChangeToApply > 0 ? "상승" : "감점"}`,
            source: "police_rule",
            dangerLevel: rule.dangerLevel || 2,
            relatedDocId: fineRef.id,      // 벌금 이력 id와 연동
            ruleId,
            timestamp: serverTimestamp(),
            actorUid,
            actorName,
        });
    }

    // 2. 벌금 기록 생성
    batch.set(fineRef, {
        studentUid,
        studentName: studentName || `학생(${studentUid.substring(0, 5)})`,
        ruleId,
        ruleText: rule.text,
        fineAmountApplied: fineAmountToApply,
        creditChangeApplied: creditChangeToApply,
        appliedAt: serverTimestamp(),
        appliedByUid: actorUid,
        appliedByName: actorName,
        reason: reason || rule.notes || '규칙 위반으로 인한 처리',
        originalReportId: reportId || null,
        reportedAt: originalReportCreatedAt || null, // ✅ 추가된 필드 (신고 시각)
        status: 'applied',
        classId,
    });

    return {
        success: true,
        message: `'${studentName || studentUid}' 학생에게 '${rule.text}' 규칙 적용 완료 (벌금 기록 ID: ${fineRef.id})`,
        newFineHistoryId: fineRef.id
    };
};

/**
 * 벌금 취소 + creditLogs 복구 로그 (필드 표준화)
 */
export const cancelFineAndRevert = async ({
    db,
    batch,
    classId,
    fineRecord,
    actorUid, actorName
}) => {
    if (!batch || !db || !classId || !fineRecord?.id || !fineRecord?.studentUid || !actorUid || !actorName) {
        return { success: false, message: '벌금 취소를 위한 필수 정보가 부족합니다.' };
    }

    const studentPath = getPath('studentDoc', classId, fineRecord.studentUid);
    const fineHistoryCollectionPath = getPath('policeFineHistory', classId);

    if (!studentPath || !fineHistoryCollectionPath) {
        return { success: false, message: '데이터 경로 생성에 실패했습니다.' };
    }

    const studentRef = doc(db, studentPath);
    const fineHistoryRef = doc(db, fineHistoryCollectionPath, fineRecord.id);

    const fineAmountToRefund = Math.abs(fineRecord.fineAmountApplied || 0);
    const creditChangeToRevert = -(fineRecord.creditChangeApplied || 0);

    // 1. 자산 회복
    if (fineAmountToRefund > 0) {
        batch.update(studentRef, { 'assets.cash': increment(fineAmountToRefund) });
    }

    // 2. 신용점수 복구
    if (creditChangeToRevert !== 0) {
        batch.update(studentRef, { creditScore: increment(creditChangeToRevert) });

        // ✅ creditLogs 기록 표준화
        const creditLogRef = doc(collection(db, `classes/${classId}/students/${fineRecord.studentUid}/creditLogs`));
        batch.set(creditLogRef, {
            amount: creditChangeToRevert,
            reason: `경찰청 벌금 취소로 인한 신용점수 회복`,
            source: "police_cancel",
            ruleId: fineRecord.ruleId || null,
            relatedDocId: fineRecord.id,
            dangerLevel: fineRecord.dangerLevel || 2,
            timestamp: serverTimestamp(),
            actorUid,
            actorName
        });
    }

    // 3. 벌금 상태 업데이트
    batch.update(fineHistoryRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledByUid: actorUid,
        cancelledByName: actorName
    });

    return {
        success: true,
        message: '벌금 취소 및 자산/신용점수 복구 작업이 배치에 추가되었습니다.',
        refundedAmount: fineAmountToRefund,
        revertedCreditChange: creditChangeToRevert
    };
};

/**
 * 경찰청 관리자 권한 여부 체크
 */
export const checkIsPoliceAdmin = (userData) => {
    return userData?.role === 'teacher' || userData?.permissions?.policeAdmin === true;
};
