import React, { useState, useEffect } from 'react';
import { Card, Button } from '../../../components/ui';
import { useUser } from '../../../contexts/UserContext';
import { db } from '../../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import tierImages from '../../../assets/tiers/tierImages';

const HomeCreditCard = ({
    tierCriteria,
    tierInfo,
    isAdmin,
    onShowTier,
    onShowCreditLog
}) => {
    const { classId, userData } = useUser();

    const [creditScore, setCreditScore] = useState(0);

    useEffect(() => {
        if (!classId || !userData?.uid) return;

        const studentDocRef = doc(db, `classes/${classId}/students/${userData.uid}`);

        const unsubscribe = onSnapshot(studentDocRef, (docSnap) => {
            const data = docSnap.data();
            setCreditScore(data?.creditScore ?? 0);
        });

        return () => unsubscribe();
    }, [classId, userData?.uid]);

    const tierImageSrc = tierInfo?.tierFullName ? tierImages[tierInfo.tierFullName] : null;

    return (
        <Card
            title="신용 등급"
            icon={null}
            titleColor="text-indigo-700"
            className="bg-indigo-50/50 border-indigo-200 h-full"
        >
            <div className="flex flex-col items-center justify-center text-center space-y-3 flex-grow py-4">
                {tierImageSrc ? (
                    <img
                        src={tierImageSrc}
                        alt={tierInfo.tierFullName}
                        className="w-32 h-32 object-contain"
                    />
                ) : (
                    <div className="w-20 h-20 bg-slate-200 flex items-center justify-center rounded-full text-slate-500 text-sm">
                        이미지 없음
                    </div>
                )}

                <div className="text-lg font-semibold text-indigo-800">
                    {tierInfo?.tierFullName || '정보 없음'}
                </div>

                <div className="text-3xl font-bold text-indigo-900">
                    {creditScore} 점
                </div>

                <div className="flex flex-row w-full pt-4 space-x-2">
                    <Button
                        onClick={onShowTier}
                        color="indigo"
                        className="flex-1"
                    >
                        티어표 보기
                    </Button>
                    <Button
                        onClick={onShowCreditLog}
                        variant="secondary"
                        color="slate"
                        className="flex-1"
                    >
                        변동 내역
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default HomeCreditCard;
