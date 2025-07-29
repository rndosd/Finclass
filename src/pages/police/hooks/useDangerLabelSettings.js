import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const DEFAULT_LABELS = {
    3: '❗ 중대한 위반',
    2: '⚠️ 주의가 필요한 행동',
    1: '📎 일반 생활 수칙',
};

export const useDangerLabelSettings = (classId) => {
    const [labelMap, setLabelMap] = useState({ ...DEFAULT_LABELS });
    const [loading, setLoading] = useState(true);

    const fetchDangerLabels = useCallback(async () => {
        if (!classId) return;
        setLoading(true);

        try {
            const docRef = doc(db, `classes/${classId}/policeDangerLabels/settings`);
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                const data = snap.data();
                setLabelMap({
                    3: data?.[3]?.label || DEFAULT_LABELS[3],
                    2: data?.[2]?.label || DEFAULT_LABELS[2],
                    1: data?.[1]?.label || DEFAULT_LABELS[1],
                });
            } else {
                setLabelMap({ ...DEFAULT_LABELS });
            }
        } catch (err) {
            console.error('DangerLabel fetch 실패:', err);
        } finally {
            setLoading(false);
        }
    }, [classId]);

    const saveDangerLabelSettings = async ({ labelMap }) => {
        if (!classId) return;

        const docRef = doc(db, `classes/${classId}/policeDangerLabels/settings`);
        const payload = {
            3: { label: labelMap[3] },
            2: { label: labelMap[2] },
            1: { label: labelMap[1] },
        };
        await setDoc(docRef, payload);
        await fetchDangerLabels(); // 저장 후 리프레시
    };

    useEffect(() => {
        fetchDangerLabels();
    }, [fetchDangerLabels]);

    return {
        labelMap,
        loading,
        refresh: fetchDangerLabels,
        saveDangerLabelSettings,
    };
};
