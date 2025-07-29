// src/utils/writeCreditLog.js

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

/**
 * 신용점수 변경 내역(creditLogs) Firestore 기록 (공통 함수)
 *
 * @param {Object} params
 * @param {string} params.classId        - 학급 ID (필수)
 * @param {string} params.studentUid     - 점수 변동 대상 학생 UID (필수)
 * @param {number} params.amount         - 점수 변동값 (양수/음수, 필수)
 * @param {string} params.reason         - 변경 사유(필수)
 * @param {string} params.actorUid       - 점수 변동 조작자(필수, 관리자/시스템/교사 등)
 * @param {string} params.source         - 로그 출처(필수, 'manual_adjustment', 'police_rule', 'mission_reward' 등)
 * @param {number=} params.dangerLevel   - (선택) 규칙/벌금 등 위험도
 * @param {string=} params.relatedDocId  - (선택) 연관 문서 id(규칙id/미션id 등)
 * @returns {Promise<void>}              - 기록 성공시 resolve, 실패시 reject
 */
export async function writeCreditLog({
    classId,
    studentUid,
    amount,          // 반드시 Number, +/-
    reason,
    actorUid,
    source,          // 'manual_adjustment', 'police_rule', 'mission_reward' 등
    dangerLevel,     // (선택)
    relatedDocId,    // (선택)
}) {
    // 필수 인자 체크
    if (!classId || !studentUid || !actorUid || amount === undefined || !reason || !source) {
        console.error('[writeCreditLog] 필수 인자 누락:', { classId, studentUid, actorUid, amount, reason, source });
        return Promise.reject(new Error('신용점수 로그 기록 실패: 필수 인자 누락'));
    }

    // 기록될 데이터 포맷
    const logData = {
        studentUid,
        actorUid,
        amount: Number(amount),
        reason,
        source,
        timestamp: serverTimestamp(),
    };
    if (dangerLevel !== undefined) logData.dangerLevel = dangerLevel;
    if (relatedDocId) logData.relatedDocId = relatedDocId;

    try {
        await addDoc(
            collection(db, `classes/${classId}/students/${studentUid}/creditLogs`),
            logData
        );
        return Promise.resolve();
    } catch (error) {
        console.error('[writeCreditLog] Firestore 기록 오류:', error, logData);
        return Promise.reject(error);
    }
}
