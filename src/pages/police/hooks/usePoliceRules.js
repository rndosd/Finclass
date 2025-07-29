import { useState, useCallback } from 'react';
import {
    collection,
    getDocs,
    doc,
    query,
    orderBy,
    where,
    writeBatch,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { getPolicePath } from '../utils/policePathUtils';
import { useFeedback } from '../../../contexts/FeedbackContext';

export const usePoliceRules = (classId) => {
    const [policeRules, setPoliceRules] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { showFeedback } = useFeedback();

    const fetchPoliceRules = useCallback(async () => {
        if (!classId) return;
        setIsLoading(true);

        try {
            const rulesPath = getPolicePath('policeRulesCollection', classId);
            const q = query(collection(db, rulesPath), orderBy('order', 'asc'));
            const querySnapshot = await getDocs(q);

            const fetched = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
            setPoliceRules(fetched);
        } catch (err) {
            console.error("규칙 로딩 오류:", err);
            showFeedback("규칙을 불러오는 중 오류 발생: " + err.message, "error");
            setPoliceRules([]);
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback]);

    const deletePoliceRule = useCallback(async (ruleId, ruleOrder) => {
        if (!classId || !ruleId || typeof ruleOrder !== 'number') return;

        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const ruleDocPath = getPolicePath('policeRuleDocument', classId, ruleId);
            batch.delete(doc(db, ruleDocPath));

            const rulesPath = getPolicePath('policeRulesCollection', classId);
            const q = query(collection(db, rulesPath), where("order", ">", ruleOrder));
            const snapshot = await getDocs(q);

            snapshot.forEach(docSnap => {
                batch.update(doc(db, rulesPath, docSnap.id), {
                    order: (docSnap.data().order || 0) - 1,
                    updatedAt: serverTimestamp(),
                });
            });

            await batch.commit();
            showFeedback("규칙이 성공적으로 삭제되고 순서가 재정렬되었습니다.", "success");
            fetchPoliceRules();
        } catch (err) {
            console.error("규칙 삭제 오류:", err);
            showFeedback("규칙 삭제 중 오류 발생: " + err.message, "error");
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback, fetchPoliceRules]);

    return {
        policeRules,
        isLoading,
        fetchPoliceRules,
        deletePoliceRule,
    };
};
