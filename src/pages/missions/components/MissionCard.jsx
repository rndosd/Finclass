// src/pages/missions/components/MissionCard.jsx

import React, { useState, useEffect } from 'react';
import { Button, Badge } from '../../../components/ui';
import { useUser } from '../../../contexts/UserContext';
import { submitMissionCompletion, cancelMissionSubmission, deleteMission } from '../services/missionService';
import { getMissionPeriodLabel } from '../utils/missionUtils';
import {
    Coins, Shield, Pin, Repeat, Calendar, CheckSquare, Users, Send, Hourglass, CheckCircle
} from 'lucide-react';
import { useFeedback } from '../../../contexts/FeedbackContext';
import dayjs from 'dayjs';

// [새로운 컴포넌트] 보상 정보를 표시하기 위한 뱃지
const RewardBadge = ({ icon: Icon, children, colorClass }) => (
    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        <Icon className="w-3.5 h-3.5 mr-1.5" />
        {children}
    </div>
);

const MissionCard = ({ mission, onManage, onUpdate }) => {
    const { userData, classId, classData, hasPermission } = useUser();
    const { showFeedback } = useFeedback();

    const isTeacher = hasPermission('mission_admin');
    const studentUid = userData?.uid;

    const [myStatus, setMyStatus] = useState(() => {
        if (!isTeacher && mission.completions && studentUid) {
            return mission.completions[studentUid]?.status || null;
        }
        return null;
    });

    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (isTeacher || !mission.completions || !studentUid) return;
        const completionStatus = mission.completions[studentUid]?.status || null;
        if (myStatus !== 'pending' || completionStatus === 'approved') {
            setMyStatus(completionStatus);
        }
    }, [mission.completions, studentUid, isTeacher, myStatus]);

    // --- [새로운 로직] UI에 필요한 데이터 가공 ---
    const isRepeating = mission.repeatSchedule && Object.keys(mission.repeatSchedule).length > 0;

    // 반복 과제에서 생성된 개별 카드는 '수행일'을, 아니면 기존 기간 라벨을 표시
    const periodLabel = isRepeating
        ? dayjs(mission.startDate.toDate()).format('YYYY-MM-DD (dd)')
        : getMissionPeriodLabel(mission);

    const currencyReward = mission.rewards?.currency || 0;
    const creditReward = mission.rewards?.credit || 0;

    // 교사용 진행률 계산
    const completionCount = mission.completions ? Object.keys(mission.completions).length : 0;
    const totalStudents = classData?.students?.length || 0;

    // 제출 가능 여부 검사 (기존 로직과 동일)
    const isSubmittable = (() => {
        const now = new Date();
        const start = mission.startDate?.toDate?.();
        const end = mission.endDate?.toDate?.();

        const isInDateRange = (!start || now >= start) && (!end || now <= end);
        if (!isInDateRange) return false;

        if (isRepeating) {
            const dayKor = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
            const todaySchedule = mission.repeatSchedule[dayKor];
            if (!todaySchedule) return false;

            const nowMin = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = todaySchedule.start.split(':').map(Number);
            const [endH, endM] = todaySchedule.end.split(':').map(Number);
            const startMin = startH * 60 + startM;
            const endMin = endH * 60 + endM;
            return nowMin >= startMin && nowMin <= endMin;
        }
        return true;
    })();

    const handleSubmit = async () => {
        console.log("1. handleSubmit 시작. 처리 중 상태로 변경합니다.");
        setIsProcessing(true);

        try {
            console.log("2. 'submitMissionCompletion' 서비스 함수를 호출합니다.");
            await submitMissionCompletion({ classId, missionId: mission.id, studentUid });
            console.log("3. 서비스 함수 호출 성공. UI 상태를 변경합니다.");

            // 미션 타입에 따라 상태를 결정
            if (mission.autoApprove) {
                setMyStatus("approved");
                console.log("4. myStatus를 'approved'로 변경했습니다.");
                showFeedback("도전과제가 승인되고 보상이 지급되었습니다!", "success");
            } else {
                setMyStatus("pending");
                console.log("4. myStatus를 'pending'으로 변경했습니다.");
                showFeedback("과제를 제출했습니다. 승인을 기다려주세요.", "success");
            }

            console.log("5. 목록 새로고침을 요청합니다.");
            onUpdate?.();

        } catch (error) {
            console.error("💥 제출 중 오류 발생!", error);
            showFeedback(`제출 중 오류: ${error.message}`, "error");
        } finally {
            console.log("6. handleSubmit 종료. 처리 중 상태를 해제합니다.");
            setIsProcessing(false);
        }
    };

    const handleCancel = async () => {
        setIsProcessing(true);
        try {
            await cancelMissionSubmission({ classId, missionId: mission.id, studentUid });
            setMyStatus(null); // 즉시 반영!
            showFeedback("제출을 취소했습니다.", "info");
            onUpdate?.();
        } catch (error) {
            showFeedback(`취소 중 오류: ${error.message}`, "error");
        }
        setIsProcessing(false);
    };

    const handleDelete = async () => {
        // 사용자에게 삭제 여부를 다시 한번 확인
        if (window.confirm(`'${mission.title}' 도전과제를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            setIsProcessing(true); // 처리 중 상태로 변경
            try {
                // 서비스 함수 호출
                await deleteMission({ classId, missionId: mission.id });

                // 성공 피드백
                showFeedback("도전과제가 삭제되었습니다.", "success");

                // 부모 컴포넌트에 업데이트 알림
                onUpdate?.();

            } catch (err) {
                // 실패 피드백
                showFeedback(`삭제 중 오류가 발생했습니다: ${err.message}`, "error");
                console.error("Mission deletion error:", err);
            } finally {
                setIsProcessing(false); // 처리 중 상태 해제
            }
        }
    };

    // --- [UI] 학생 상태에 따른 뱃지 렌더링 ---
    const StatusBadge = () => {
        if (myStatus === 'approved') {
            return <Badge color="green" icon={CheckCircle}>승인 완료</Badge>;
        }
        if (myStatus === 'pending') {
            return <Badge color="yellow" icon={Hourglass}>승인 대기 중</Badge>;
        }
        return <span className="text-slate-500">미제출</span>;
    };


    return (
        <div className="border rounded-lg bg-white shadow-sm flex flex-col transition-all hover:shadow-md">
            {/* --- 1. 헤더 영역: 제목, 타입 --- */}
            <div className="p-4 border-b rounded-t-lg">
                <div className="flex justify-between items-center gap-2">
                    <h2 className="text-base font-bold text-slate-800 flex items-center">
                        <Pin className="w-4 h-4 mr-2 text-slate-500" />
                        {mission.title}
                    </h2>
                    {isRepeating ? (
                        <Badge color="cyan" icon={Repeat} size="sm">반복</Badge>
                    ) : (
                        <Badge color="gray" size="sm">일반</Badge>
                    )}
                </div>
            </div>

            {/* --- 2. 본문 영역: 설명, 핵심 정보 --- */}
            <div className="p-4 flex-grow space-y-4">
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{mission.description}</p>

                {/* --- 구분선 --- */}
                <hr />

                {/* --- 요약 정보 리스트 --- */}
                <div className="space-y-2 text-sm">
                    <div className="flex items-center text-slate-700">
                        <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                        <span className="font-semibold mr-1">{isRepeating ? "수행일:" : "기간:"}</span>
                        {periodLabel}
                    </div>

                    {isTeacher ? (
                        <div className="flex items-center text-slate-700">
                            <Users className="w-4 h-4 mr-2 text-slate-400" />
                            <span className="font-semibold mr-1">진행률:</span>
                            {completionCount} / {totalStudents} 명 제출
                        </div>
                    ) : (
                        <div className="flex items-center text-slate-700">
                            <CheckSquare className="w-4 h-4 mr-2 text-slate-400" />
                            <span className="font-semibold mr-1">내 상태:</span>
                            <StatusBadge />
                        </div>
                    )}
                </div>

                {/* --- 보상 정보 --- */}
                {(currencyReward > 0 || creditReward > 0) && (
                    <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">획득 가능 보상</p>
                        <div className="flex items-center gap-2">
                            {currencyReward > 0 && (
                                <RewardBadge icon={Coins} colorClass="bg-amber-100 text-amber-800">
                                    {currencyReward} {classData?.currencyUnit || ''}
                                </RewardBadge>
                            )}
                            {creditReward > 0 && (
                                <RewardBadge icon={Shield} colorClass="bg-sky-100 text-sky-800">
                                    {creditReward} 점
                                </RewardBadge>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- 3. 푸터 영역: 액션 버튼 --- */}
            <div className="bg-slate-50/80 px-4 py-3 border-t flex justify-end items-center gap-2 min-h-[58px]">

                {/* 1. 학생으로서의 액션 버튼 (언제나 렌더링 여부 체크) */}
                {(() => {
                    if (myStatus === 'approved') {
                        return null;
                    }
                    if (myStatus === 'pending') {
                        return (
                            <Button size="sm" variant="ghost" onClick={handleCancel} isLoading={isProcessing}>
                                제출 취소
                            </Button>
                        );
                    }
                    return (
                        <Button
                            size="sm"
                            color="indigo"
                            onClick={handleSubmit}
                            isLoading={isProcessing}
                            disabled={!isSubmittable}
                            icon={Send}
                        >
                            {isSubmittable ? '도전 완료 제출' : '제출 불가능'}
                        </Button>
                    );
                })()}

                {/* 2. 교사(mission_admin) 권한이 있을 경우, 관리자용 버튼을 '추가로' 표시 */}
                {isTeacher && (
                    <>
                        {/* 관리자 버튼과 학생 버튼이 둘 다 보일 경우를 대비한 구분선 */}
                        {myStatus !== 'approved' && <div className="w-px h-6 bg-slate-300 mx-1"></div>}

                        <Button size="sm" variant="secondary" onClick={onManage} icon={Users} disabled={isProcessing}>
                            제출 현황
                        </Button>
                        <Button size="sm" variant="destructive-outline" onClick={handleDelete} disabled={isProcessing}>
                            삭제
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default MissionCard;