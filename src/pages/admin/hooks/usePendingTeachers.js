import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFeedback } from '../../../contexts/FeedbackContext';

export const usePendingTeachers = () => {
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showFeedback } = useFeedback();

    const fetchPendingTeachers = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(
                collection(db, "users"),
                where("role", "==", "teacher"),
                where("status", "==", "pending")
            );
            const snapshot = await getDocs(q);
            const teachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingTeachers(teachers);
        } catch (error) {
            showFeedback("승인 대기 중인 교사 목록을 불러오는 데 실패했습니다.", "error");
            console.error("Error fetching pending teachers:", error);
        } finally {
            setIsLoading(false);
        }
    }, [showFeedback]);

    useEffect(() => {
        fetchPendingTeachers();
    }, [fetchPendingTeachers]);

    return { pendingTeachers, isLoading, refresh: fetchPendingTeachers };
};