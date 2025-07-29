// src/pages/dashboard/components/HomeDonationCard.jsx

import React, { useState, useEffect } from 'react';
import { Card, Spinner, Button } from '../../../components/ui';
import { db } from '../../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import { HandHeart, Settings } from 'lucide-react'; // 아이콘 import

// 모달 컴포넌트 import
import DonationModal from '../modals/DonationModal';
import SetDonationGoalModal from '../modals/SetDonationGoalModal';

const HomeDonationCard = () => {
    const { classId, userData, classData } = useUser();
    const currencyUnit = classData?.currencyUnit || '단위';
    const isTeacher = userData?.role === 'teacher';

    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // 모달들의 열림/닫힘 상태 관리
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

    // 실시간으로 기부 요약 데이터를 구독합니다.
    useEffect(() => {
        if (!classId) {
            setIsLoading(false);
            setSummary(null); // 학급 ID가 없으면 데이터 없음 처리
            return;
        }

        setIsLoading(true);
        const summaryDocRef = doc(db, `classes/${classId}/dashboardSummary/donationSummary`);

        const unsubscribe = onSnapshot(summaryDocRef, (docSnap) => {
            // 문서가 존재하면 해당 데이터를, 없으면 기본값으로 상태 설정
            setSummary(docSnap.exists() ? docSnap.data() : { totalAmount: 0, goalAmount: 10000 });
            setIsLoading(false);
        }, (error) => {
            console.error("기부 현황 데이터 구독 중 오류:", error);
            setIsLoading(false);
        });

        // 컴포넌트가 사라질 때 구독을 해제합니다.
        return () => unsubscribe();
    }, [classId]);

    // Firestore 데이터 또는 기본값 사용
    const totalAmount = summary?.totalAmount || 0;
    const donationGoal = summary?.goalAmount || 10000; // 문서에 목표액이 없으면 기본값 10,000

    // 기부 진행률 계산
    const progressPercent = donationGoal > 0 ? Math.min((totalAmount / donationGoal) * 100, 100) : 0;

    return (
        <>
            <Card>
                <Card.Header>
                    {/* ⭐ Card.Title에 flex 스타일을 추가하여 텍스트와 버튼을 나란히 배치합니다. */}
                    <Card.Title className="text-lg flex items-center gap-2">
                        <span>🎁 우리반 기부 현황</span>

                        {/* 교사에게만 목표 설정 버튼 표시 */}
                        {isTeacher && (
                            <Button
                                onClick={() => setIsGoalModalOpen(true)}
                                size="icon"      // 아이콘 전용 버튼 크기
                                variant="ghost"   // 배경이 없는 투명한 버튼 스타일
                                className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded-full" // 세부 스타일 조정
                                aria-label="기부 목표 설정" // 스크린 리더 등을 위한 접근성
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                        )}
                    </Card.Title>
                </Card.Header>

                <Card.Content className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                    {isLoading ? <Spinner /> : (
                        <>
                            <HandHeart className="w-12 h-12 text-rose-400" strokeWidth={1.5} />
                            <div>
                                <p className="text-sm text-slate-500">모인 기부금</p>
                                <p className="text-4xl font-bold text-rose-500 my-1">
                                    {totalAmount.toLocaleString()} <span className="text-2xl font-medium">{currencyUnit}</span>
                                </p>
                            </div>

                            {/* 기부 목표 및 진행률 바 */}
                            <div className="w-full pt-2">
                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                    <span>목표</span>
                                    <span>{donationGoal.toLocaleString()} {currencyUnit}</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5">
                                    <div
                                        className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                                <p className="text-right text-xs mt-1 font-semibold text-rose-600">
                                    {progressPercent.toFixed(1)}% 달성!
                                </p>
                            </div>
                        </>
                    )}
                </Card.Content>

                <Card.Footer className="p-4 bg-slate-50/50">
                    <Button onClick={() => setIsDonationModalOpen(true)} color="rose" className="w-full">
                        따뜻한 마음 기부하기
                    </Button>
                </Card.Footer>
            </Card>

            {/* 기부하기 모달 */}
            {isDonationModalOpen && (
                <DonationModal
                    isOpen={isDonationModalOpen}
                    onClose={() => setIsDonationModalOpen(false)}
                    classId={classId}
                />
            )}

            {/* 기부 목표 설정 모달 (교사에게만 필요) */}
            {isGoalModalOpen && isTeacher && (
                <SetDonationGoalModal
                    isOpen={isGoalModalOpen}
                    onClose={() => setIsGoalModalOpen(false)}
                    classId={classId}
                    currentGoal={donationGoal}
                />
            )}
        </>
    );
};

export default HomeDonationCard;