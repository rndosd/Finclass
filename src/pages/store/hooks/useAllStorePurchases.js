// src/pages/store/hooks/useAllStorePurchases.js
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';

/**
 * storeRedemptions에서 "redeemed" 상태인 구매내역만 불러오는 훅 (전체 구매내역 탭에서 사용)
 */
const useAllStorePurchases = () => {
    const { classId } = useUser();
    const [allPurchases, setAllPurchases] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!classId) return;

        setIsLoading(true);

        const q = query(
            collection(db, `classes/${classId}/storeRedemptions`),
            where("status", "==", "redeemed"),
            orderBy("requestDate", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllPurchases(data);
            setIsLoading(false);
        }, (err) => {
            console.error("전체 구매 내역 구독 오류:", err);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    return { allPurchases, isLoading };
};

export default useAllStorePurchases;
