// src/pages/store/hooks/usePendingRedemptions.js
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';

/**
 * storeRedemptions에서 "pending" 상태인 항목만 실시간으로 불러오는 훅
 */
const usePendingRedemptions = () => {
    const { classId } = useUser();
    const [pendingItems, setPendingItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!classId) return;

        setIsLoading(true);
        setError(null);

        const q = query(
            collection(db, `classes/${classId}/storeRedemptions`),
            where("status", "==", "pending"),
            orderBy("requestDate", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingItems(data);
            setIsLoading(false);
        }, (err) => {
            console.error("usePendingRedemptions error:", err);
            setError("미지급 데이터를 불러오는 중 오류가 발생했습니다.");
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    return { pendingItems, isLoading, error };
};

export default usePendingRedemptions;
