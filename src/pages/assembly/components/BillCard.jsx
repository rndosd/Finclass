import React from 'react';
import { Card, Badge, Button } from '../../../components/ui';
import { FileText, Hourglass, CheckCircle, XCircle, Gavel } from 'lucide-react';
import dayjs from 'dayjs';

const BILL_STATUS_CONFIG = {
    voting: { label: '투표 진행 중', color: 'blue', icon: Hourglass },
    passed: { label: '가결', color: 'green', icon: CheckCircle },
    rejected: { label: '부결', color: 'red', icon: XCircle },
};

const BillCard = ({
    bill,
    myVote,
    canManage,
    isProcessing,
    onCardClick,
    onCloseVoting,
    onApplyPolicy, // ✅ 추가
}) => {
    const isVoted = !!myVote;
    const statusInfo = BILL_STATUS_CONFIG[bill.status] || {
        label: bill.status,
        color: 'gray',
        icon: FileText,
    };

    const handleCloseVoteClick = (e) => {
        e.stopPropagation();
        onCloseVoting(bill.id);
    };

    const handleApplyPolicyClick = (e) => {
        e.stopPropagation();
        onApplyPolicy?.(bill.id); // 옵셔널 체이닝
    };

    return (
        <Card
            onClick={onCardClick}
            className={`cursor-pointer transition-all duration-300 ${isVoted
                    ? 'bg-slate-50 opacity-70 hover:opacity-100'
                    : 'hover:shadow-lg hover:-translate-y-1'
                }`}
        >
            <Card.Content className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge color={statusInfo.color} size="sm" icon={statusInfo.icon}>
                            {statusInfo.label}
                        </Badge>

                        {isVoted && (
                            <Badge
                                color={myVote === 'agree' ? 'indigo' : 'pink'}
                                size="sm"
                                icon={CheckCircle}
                            >
                                {myVote === 'agree' ? '찬성 투표함' : '반대 투표함'}
                            </Badge>
                        )}
                    </div>
                    <h3 className="font-semibold text-lg text-slate-800" title={bill.title}>
                        {bill.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">제안자: {bill.proposerName}</p>
                </div>

                <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto mt-2 sm:mt-0">
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-center w-12">
                            <p className="text-2xl font-bold text-blue-600">{bill.votes?.agree || 0}</p>
                            <p className="text-xs text-blue-500">찬성</p>
                        </div>
                        <div className="text-center w-12">
                            <p className="text-2xl font-bold text-red-600">{bill.votes?.disagree || 0}</p>
                            <p className="text-xs text-red-500">반대</p>
                        </div>
                    </div>

                    {/* ✅ 투표 종료 버튼 (진행 중이고 관리자일 때만) */}
                    {canManage && bill.status === 'voting' && (
                        <Button
                            size="xs"
                            variant="outline"
                            color="gray"
                            className="mt-2"
                            onClick={handleCloseVoteClick}
                            isLoading={isProcessing === `close-${bill.id}`}
                            disabled={!!isProcessing}
                            icon={Gavel}
                        >
                            투표 종료
                        </Button>
                    )}

                    {/* ✅ 정책 반영 버튼 (가결 && 관리자 && 경찰 규칙 존재 && 미적용 상태일 때만) */}
                    {canManage &&
                        bill.status === 'passed' &&
                        bill.policeRuleData &&
                        !bill.isPolicyApplied && (
                            <Button
                                size="xs"
                                variant="solid"
                                color="indigo"
                                className="mt-2"
                                onClick={handleApplyPolicyClick}
                                isLoading={isProcessing === `apply-${bill.id}`}
                                disabled={!!isProcessing}
                            >
                                정책 반영
                            </Button>
                        )}
                </div>
            </Card.Content>
        </Card>
    );
};

export default BillCard;
