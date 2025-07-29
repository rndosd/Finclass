// src/pages/missions/services/missionService.js

import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    deleteField,
    serverTimestamp,
    getDoc,
} from 'firebase/firestore';
import { db, functions } from '../../../firebase';
import { httpsCallable } from 'firebase/functions';
import { isWithinSubmissionTime } from '../../missions/utils/isWithinSubmissionTime';

/**
 * ✅ 도전과제 등록 (교사용)
 */
export const addMission = async (missionData) => {
    const ref = collection(db, `classes/${missionData.classId}/missions`);
    await addDoc(ref, {
        ...missionData,
        createdAt: serverTimestamp(),
    });
};

/**
 * ✅ 도전과제 제출 (학생)
 * - completions Map 필드에 {uid: {...}}로 저장
 */
export const submitMissionCompletion = async ({ classId, missionId, studentUid }) => {
    const missionRef = doc(db, `classes/${classId}/missions/${missionId}`);
    const missionSnap = await getDoc(missionRef);
    const mission = missionSnap.data();

    // autoApprove일 때는 새로 만든 Cloud Function 호출
    if (mission?.autoApprove) {
        const processAutoApproveFunc = httpsCallable(functions, 'processAutoApproveMission');
        const result = await processAutoApproveFunc({ classId, missionId });
        return result.data;
    }
    // 수동 승인 미션은 기존대로 pending 처리
    else {
        const studentRef = doc(db, `classes/${classId}/students/${studentUid}`);
        const studentSnap = await getDoc(studentRef);
        const studentData = studentSnap.data();

        // (참고) 여기에도 시간 검사 로직이 있지만, 이젠 서버에서 이중 검사하므로 참고용.
        // if (!isWithinSubmissionTime(mission?.timeWindow)) {
        //     throw new Error('제출 가능 시간이 아닙니다.');
        // }

        await updateDoc(missionRef, {
            [`completions.${studentUid}`]: {
                name: studentData?.name || '학생',
                studentNumber: studentData?.studentNumber ?? null,
                status: 'pending',
                submittedAt: serverTimestamp(),
            }
        });
        return { success: true, message: '도전과제가 제출되었습니다. 승인을 기다려주세요.' };
    }
};

/**
 * ✅ 제출 취소 (학생)
 * - completions Map 필드에서 해당 uid만 삭제
 */
export const cancelMissionSubmission = async ({ classId, missionId, studentUid }) => {
    const missionRef = doc(db, `classes/${classId}/missions/${missionId}`);
    await updateDoc(missionRef, {
        [`completions.${studentUid}`]: deleteField(),
    });
};

/**
 * ✅ 제출 승인 (교사)
 * - Cloud Function으로 처리 (보상 지급 포함)
 */
export const approveMissionCompletion = async ({ classId, missionId, studentUid }) => {
    const approveMissionFunc = httpsCallable(functions, 'approveMission');
    const result = await approveMissionFunc({ classId, missionId, studentUid });
    return result.data;
};

/**
 * ✅ 승인 취소 (교사)
 * - Cloud Function으로 처리 (보상 회수)
 */
export const cancelMissionApproval = async ({ classId, missionId, studentUid }) => {
    const cancelMissionFunc = httpsCallable(functions, 'cancelMissionApproval');
    const result = await cancelMissionFunc({ classId, missionId, studentUid });
    return result.data;
};

// 미션 삭제
export const deleteMission = async ({ classId, missionId }) => {
    const missionRef = doc(db, `classes/${classId}/missions/${missionId}`);
    await deleteDoc(missionRef);
};