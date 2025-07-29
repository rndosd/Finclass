import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

const useStoreRedemptions = (classId) => {
    const [storeRedemptions, setStoreRedemptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!classId) return;

        const q = query(
            collection(db, `classes/${classId}/storeRedemptions`),
            orderBy('redeemedAt', 'desc')
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setStoreRedemptions(list);
                setIsLoading(false);
            },
            (err) => {
                console.error('storeRedemptions 구독 오류:', err);
                setError('상점 소비 데이터를 불러오지 못했습니다.');
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [classId]);

    return {
        storeRedemptions,
        isLoading,
        error,
    };
};

export default useStoreRedemptions;
