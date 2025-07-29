import { useState, useEffect, useCallback, useMemo } from 'react';
import { Timestamp, collection, getDocs, onSnapshot, orderBy, query, where, writeBatch } from 'firebase/firestore';
import dayjs from 'dayjs';

import { db } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';

import {
    cancelFineAndRevert,
    applyPenaltyAndLog,
    getPath,
    checkIsPoliceAdmin
} from '../../../utils/policeUtils';

export const useFineHistory = ({ allStudents, policeRules }) => {
    const { classId, userData, classData } = useUser();
    const { showFeedback } = useFeedback();

    const isPoliceAdmin = checkIsPoliceAdmin(userData);
    const isTeacher = userData?.role === 'teacher'; // ✅ 교사 여부 판단
    const currencyUnit = classData?.currencyUnit || '단위';

    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fineForm, setFineForm] = useState({ uid: '', ruleId: '', reason: '' });
    const [showFineForm, setShowFineForm] = useState(false);
    const [displayMode, setDisplayMode] = useState('recent');
    const [searchStartDate, setSearchStartDate] = useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
    const [searchEndDate, setSearchEndDate] = useState(dayjs().format('YYYY-MM-DD'));

    const threeDaysAgoTimestamp = useMemo(() => {
        return Timestamp.fromDate(dayjs().subtract(2, 'days').startOf('day').toDate());
    }, []);

    const subscribeToRecentFines = useCallback(() => {
        if (!classId) {
            setIsLoading(false);
            return () => { };
        }

        const basePath = getPath('policeFineHistory', classId);
        if (!basePath) {
            setIsLoading(false);
            return () => { };
        }

        setIsLoading(true);

        const q = query(
            collection(db, basePath),
            orderBy('appliedAt', 'desc'),
            where('appliedAt', '>=', threeDaysAgoTimestamp)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const all = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    reportedAt: data.reportedAt || null,
                };
            });
            const filtered = isTeacher ? all : all.filter(r => !r.isSensitive); // ✅ 필터 적용
            setRecords(filtered);
            setIsLoading(false);
        }, (error) => {
            console.error("실시간 벌금 조회 오류:", error);
            setIsLoading(false);
            showFeedback("최근 벌금 조회 중 오류 발생", "error");
        });

        return unsubscribe;
    }, [classId, threeDaysAgoTimestamp, showFeedback, isTeacher]);

    const fetchHistoricalFines = useCallback(async (start, end) => {
        if (!classId) return;
        setIsLoading(true);
        try {
            const basePath = getPath('policeFineHistory', classId);
            const startTs = Timestamp.fromDate(dayjs(start).startOf('day').toDate());
            const endTs = Timestamp.fromDate(dayjs(end).endOf('day').toDate());

            const q = query(
                collection(db, basePath),
                orderBy('appliedAt', 'desc'),
                where('appliedAt', '>=', startTs),
                where('appliedAt', '<=', endTs)
            );

            const snapshot = await getDocs(q);
            const all = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    reportedAt: data.reportedAt || null,
                };
            });
            const filtered = isTeacher ? all : all.filter(r => !r.isSensitive); // ✅ 필터 적용
            setRecords(filtered);
            showFeedback(`${dayjs(start).format('YY.MM.DD')} ~ ${dayjs(end).format('YY.MM.DD')} 내역 ${filtered.length}건 조회 완료`, 'success');
        } catch (err) {
            console.error("과거 벌금 조회 오류:", err);
            showFeedback('과거 벌금 조회 실패: ' + err.message, 'error');
            setRecords([]);
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback, isTeacher]);

    const handleCancelFine = useCallback(async (record) => {
        if (!isPoliceAdmin || !classId || !record?.id || !userData?.uid) return;

        setIsLoading(true);
        const batch = writeBatch(db);

        try {
            const result = await cancelFineAndRevert({
                db, batch, classId, fineRecord: record,
                actorUid: userData.uid,
                actorName: userData.name || `관리자(${userData.uid.slice(0, 5)})`
            });

            if (!result.success) throw new Error(result.message);

            await batch.commit();
            showFeedback('벌금 취소 완료', 'success');

            if (displayMode === 'historical') {
                fetchHistoricalFines(searchStartDate, searchEndDate);
            }
        } catch (err) {
            console.error('벌금 취소 실패:', err);
            showFeedback('벌금 취소 중 오류: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [classId, isPoliceAdmin, userData, displayMode, fetchHistoricalFines, searchStartDate, searchEndDate, showFeedback]);

    const handleApplyDirectFine = useCallback(async () => {
        if (!fineForm.uids || fineForm.uids.length === 0 || !fineForm.ruleId || !classId || !userData?.uid) return;
        const rule = policeRules.find(r => r.id === fineForm.ruleId);
        if (!rule) return;

        setIsLoading(true);

        const batch = writeBatch(db);

        try {
            for (const studentUid of fineForm.uids) {
                const student = allStudents.find(s => s.uid === studentUid);
                if (!student) continue;

                // applyPenaltyAndLog는 이제 commit 없이 작업만 배치에 추가합니다.
                const result = await applyPenaltyAndLog({
                    batch, db, classId,
                    studentUid: student.uid,
                    studentName: student.name,
                    ruleId: rule.id,
                    policeRules,
                    reason: fineForm.reason || '직접 부과',
                    actorUid: userData.uid,
                    actorName: userData.name || `관리자(${userData.uid.slice(0, 5)})`,
                    originalReportId: fineForm.originalReportId || null,
                    // fineForm에 있는 값을 그대로 전달
                    originalReportCreatedAt: fineForm.originalReportCreatedAt || null
                });

                if (!result.success) {
                    // 한 명이라도 실패하면 전체 작업을 중단
                    throw new Error(result.message);
                }
            }

            // ▼▼▼ 2. 모든 학생에 대한 작업이 배치에 추가된 후, 마지막에 한 번만 commit합니다. ▼▼▼
            await batch.commit();

            showFeedback(`벌금 부과 완료 (${fineForm.uids.length}명)`, 'success');
            setShowFineForm(false);
            setFineForm({ uids: [], ruleId: '', reason: '' });

        } catch (err) {
            console.error('벌금 부과 실패:', err);
            showFeedback('벌금 부과 중 오류: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [fineForm, classId, userData, policeRules, allStudents, showFeedback]);

    useEffect(() => {
        if (displayMode === 'recent') {
            const unsubscribe = subscribeToRecentFines();
            return unsubscribe;
        } else {
            setIsLoading(false);
        }
    }, [displayMode, subscribeToRecentFines]);

    return {
        records,
        isLoading,
        fineForm,
        showFineForm,
        displayMode,
        searchStartDate,
        searchEndDate,
        isPoliceAdmin,
        setFineForm,
        setShowFineForm,
        setDisplayMode,
        setSearchStartDate,
        setSearchEndDate,
        handleApplyDirectFine,
        handleCancelFine,
        fetchHistoricalFines
    };
};
