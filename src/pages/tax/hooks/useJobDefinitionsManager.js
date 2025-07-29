// src/pages/tax/hooks/useJobDefinitionsManager.js

import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { getPath } from '../utils/taxPathUtils';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';

export const useJobDefinitionsManager = () => {
    const { classId } = useUser();
    const { showFeedback } = useFeedback();

    // --- 상태 ---
    const [jobDefinitions, setJobDefinitions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // --- 데이터 로드 ---
    const fetchAllData = useCallback(async () => {
        if (!classId) return;
        setIsLoading(true);
        try {
            const q = query(collection(db, getPath('jobDefinitions', classId)), orderBy("name"));
            const snap = await getDocs(q);
            setJobDefinitions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error('직업 정의 로드 실패:', err);
            showFeedback('직업 정의 로드 실패: ' + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback]);

    // --- 직업 추가 ---
    const handleAddJob = useCallback(async (name, salary, onSuccess) => {
        const trimmedName = name.trim();
        const parsedSalary = parseInt(salary, 10);

        if (!trimmedName || isNaN(parsedSalary) || parsedSalary < 0) {
            showFeedback("직업 이름과 올바른 주급(0 이상)을 입력하세요.", 'error');
            return;
        }

        if (jobDefinitions.some(j => j.name.toLowerCase() === trimmedName.toLowerCase())) {
            showFeedback(`직업 '${trimmedName}'은(는) 이미 존재합니다.`, 'error');
            return;
        }

        setIsLoading(true);
        try {
            const jobDefCollectionPath = getPath('jobDefinitions', classId);
            const collectionRef = collection(db, jobDefCollectionPath);

            await addDoc(collectionRef, {
                name: trimmedName,
                baseSalary: parsedSalary,
                createdAt: serverTimestamp(),
            });

            showFeedback(`직업 '${trimmedName}' 추가 완료.`, 'success');
            await fetchAllData();

            if (onSuccess) onSuccess(); // 입력 필드 초기화 콜백 (선택적)
        } catch (err) {
            console.error("Error adding job definition:", err);
            showFeedback("직업 추가 중 오류: " + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback, fetchAllData, jobDefinitions]);


    const handleUpdateJob = useCallback(async (jobName, updatedData) => {
        setIsLoading(true);
        try {
            // ⭐ getPath 호출 방식을 ids 객체를 사용하는 것으로 수정
            const jobDefPath = getPath('jobDefinition', classId, { docId: jobName });

            if (!jobDefPath) throw new Error("유효하지 않은 직업 경로입니다."); // 경로 유효성 검사

            await updateDoc(doc(db, jobDefPath), updatedData);
            showFeedback(`직업 '${jobName}' 수정 완료.`, 'success');
            await fetchAllData();
        } catch (err) {
            // ... (오류 처리)
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback, fetchAllData]);

    // --- 직업 삭제 ---
    const handleDeleteJob = useCallback(async (jobId, jobName) => {
        if (!window.confirm(`'${jobName}' 직업을 삭제하시겠습니까?`)) return;

        setIsLoading(true);
        try {
            const jobDefPath = getPath('jobDefinition', classId, { docId: jobId });
            await deleteDoc(doc(db, jobDefPath));
            showFeedback(`직업 '${jobName}' 삭제 완료.`, 'success');
            await fetchAllData();
        } catch (err) {
            console.error("Error deleting job definition:", err);
            showFeedback("직업 삭제 중 오류: " + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback, fetchAllData]);

    // --- 최초 로드 ---
    useEffect(() => {
        if (classId) {
            fetchAllData();
        }
    }, [classId, fetchAllData]);

    // --- 반환 ---
    return {
        jobDefinitions,
        isLoading,
        fetchAllData,
        handleAddJob,
        handleUpdateJob,
        handleDeleteJob,
        showFeedback
    };
};
