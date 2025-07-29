import { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import {
    collection,
    query,
    orderBy,
    where,
    onSnapshot,
    doc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';

import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';

import {
    getPath,
    applyPenaltyAndLog,
    checkIsPoliceAdmin
} from '../../../utils/policeUtils';

export const useReportList = ({ classId, allStudents, policeRules }) => {
    const { userData } = useUser();
    const { showFeedback } = useFeedback();

    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!classId) {
            setReports([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const q = query(
            collection(db, `classes/${classId}/policeReports`),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const allFetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // ✅ 교사가 아니면 민감 신고 제거
            const filtered = userData?.role === 'teacher'
                ? allFetched
                : allFetched.filter(r => !r.isSensitive);

            setReports(filtered);
            setIsLoading(false);
        }, (error) => {
            console.error("신고 실시간 조회 오류:", error);
            showFeedback("신고 목록을 가져오는 중 오류 발생: " + error.message, 'error');
            setIsLoading(false);
            setReports([]);
        });

        return () => unsubscribe();
    }, [classId, userData?.role]); // role 바뀌면 반응하도록 의존성에 포함

    const handleResolveReport = async (report, applyPenalty = false) => {
        if (!classId || !userData?.uid) {
            showFeedback("학급 ID 또는 사용자 정보가 없습니다.", "error");
            return;
        }

        const confirmText = applyPenalty ? "처벌" : "무시";
        if (!window.confirm(`[${report.accusedStudentName}] 학생에 대한 신고(${report.ruleText})를 ${confirmText} 처리할까요?`)) return;

        const reportRef = doc(db, getPath('reportDoc', classId, null, report.id));
        const batch = writeBatch(db);

        try {
            if (applyPenalty) {
                const rule = policeRules.find(r => r.id === report.ruleId);
                if (!rule) throw new Error('규칙 정보를 찾을 수 없습니다.');

                const penaltyResult = await applyPenaltyAndLog({
                    batch, db, classId,
                    studentUid: report.accusedStudentUid,
                    studentName: report.accusedStudentName,
                    ruleId: rule.id,
                    policeRules,
                    reason: report.reason || '신고 기반 부과',
                    reportId: report.id,
                    originalReportCreatedAt: report.createdAt,
                    actorUid: userData.uid,
                    actorName: userData.name || `관리자(${userData.uid.slice(0, 5)})`
                });

                if (!penaltyResult.success) throw new Error(penaltyResult.message);

                batch.update(reportRef, {
                    status: 'resolved_applied',
                    resolvedAt: serverTimestamp(),
                    resolverUid: userData.uid,
                    resolverName: userData.name || `관리자(${userData.uid.slice(0, 5)})`,
                    actionTaken: 'fined',
                    linkedFineHistoryId: penaltyResult.newFineHistoryId
                });
            } else {
                batch.update(reportRef, {
                    status: 'resolved_ignored',
                    resolvedAt: serverTimestamp(),
                    resolverUid: userData.uid,
                    resolverName: userData.name || `관리자(${userData.uid.slice(0, 5)})`,
                    actionTaken: 'ignored'
                });
            }

            await batch.commit();
            setTimeout(() => {
                showFeedback(`신고가 ${applyPenalty ? '처벌' : '무시'} 처리되었습니다.`, 'success');
            }, 100);

        } catch (err) {
            console.error("신고 처리 오류:", err);
            showFeedback("신고 처리 중 오류 발생: " + err.message, 'error');
        }
    };

    return {
        reports,
        isLoading,
        handleResolveReport
    };
};
