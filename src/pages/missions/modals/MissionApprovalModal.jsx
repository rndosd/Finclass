import React, { useMemo, useState } from 'react';
import { Modal, Button, Badge, Spinner } from '../../../components/ui';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { useUser } from '../../../contexts/UserContext'; // 🔹 추가
import {
    approveMissionCompletion,
    cancelMissionApproval,
} from '../services/missionService';
import dayjs from 'dayjs';

const COMPLETION_STATUS_CONFIG = {
    pending: { label: '승인 대기', color: 'yellow' },
    approved: { label: '승인 완료', color: 'green' },
    cancelled: { label: '취소됨', color: 'gray' },
};

export default function MissionApprovalModal({
    isOpen,
    onClose,
    mission,
    classId,
    onUpdate,
}) {
    const { showFeedback } = useFeedback();
    const { hasPermission } = useUser(); // 🔹 권한 사용
    const isAuthorized = hasPermission('mission_admin');
    const [isProcessing, setIsProcessing] = useState(null);

    const completions = mission?.completions || {};

    const sortedCompletions = useMemo(() => {
        return Object.entries(completions).sort(([, a], [, b]) => {
            const numA = parseInt(a.studentNumber ?? '999');
            const numB = parseInt(b.studentNumber ?? '999');
            return numA - numB;
        });
    }, [completions]);

    const handleApprove = async (studentUid) => {
        setIsProcessing(studentUid);
        try {
            await approveMissionCompletion({ classId, missionId: mission.id, studentUid });
            showFeedback('승인 및 보상 지급이 완료되었습니다.', 'success');
            onUpdate?.();
        } catch (error) {
            showFeedback(`승인 처리 중 오류: ${error.message}`, 'error');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleCancel = async (studentUid) => {
        const confirm = window.confirm('정말 승인 취소하시겠습니까?\n보상이 회수됩니다.');
        if (!confirm) return;
        setIsProcessing(studentUid);
        try {
            await cancelMissionApproval({ classId, missionId: mission.id, studentUid });
            showFeedback('승인이 취소되고 보상이 회수되었습니다.', 'success');
            onUpdate?.();
        } catch (error) {
            showFeedback(`취소 처리 중 오류: ${error.message}`, 'error');
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`'${mission?.title || ''}' 제출 현황`}
            size="2xl"
        >
            <div className="space-y-4">
                <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2">
                    {!mission ? (
                        <div className="py-10 text-center"><Spinner /></div>
                    ) : !isAuthorized ? (
                        <div className="py-10 text-center text-slate-500 text-sm">
                            이 기능에 접근할 권한이 없습니다.
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white">
                                <tr className="border-b">
                                    <th className="p-2 text-left font-semibold text-slate-600">학생</th>
                                    <th className="p-2 text-left font-semibold text-slate-600">제출 시간</th>
                                    <th className="p-2 text-left font-semibold text-slate-600">상태</th>
                                    <th className="p-2 text-center font-semibold text-slate-600">처리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedCompletions.length > 0 ? (
                                    sortedCompletions.map(([uid, completion]) => {
                                        const status = completion.status;
                                        const statusInfo = COMPLETION_STATUS_CONFIG[status] || {
                                            label: status,
                                            color: 'gray',
                                        };
                                        const rowClass = status === 'cancelled'
                                            ? 'opacity-60 line-through text-slate-400'
                                            : 'text-slate-800';

                                        return (
                                            <tr key={uid} className={status === 'cancelled' ? 'bg-slate-50' : ''}>
                                                <td className={`p-2 font-medium ${rowClass}`}>{completion.name}</td>
                                                <td className={`p-2 ${rowClass}`}>
                                                    {completion.submittedAt
                                                        ? (completion.submittedAt.toDate
                                                            ? dayjs(completion.submittedAt.toDate()).format('YYYY.MM.DD HH:mm')
                                                            : dayjs(completion.submittedAt).format('YYYY.MM.DD HH:mm'))
                                                        : '-'}
                                                </td>
                                                <td className={`p-2 ${rowClass}`}>
                                                    <Badge color={statusInfo.color}>{statusInfo.label}</Badge>
                                                </td>
                                                <td className="p-2 text-center space-x-2">
                                                    {isAuthorized && status === 'pending' && (
                                                        <Button
                                                            size="xs"
                                                            onClick={() => handleApprove(uid)}
                                                            isLoading={isProcessing === uid}
                                                            disabled={!!isProcessing}
                                                        >
                                                            승인
                                                        </Button>
                                                    )}
                                                    {isAuthorized && status === 'approved' && (
                                                        <Button
                                                            size="xs"
                                                            variant="destructive"
                                                            onClick={() => handleCancel(uid)}
                                                            isLoading={isProcessing === uid}
                                                            disabled={!!isProcessing}
                                                        >
                                                            승인 취소
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-slate-500">
                                            아직 제출한 학생이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button variant="secondary" onClick={onClose}>
                        닫기
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
