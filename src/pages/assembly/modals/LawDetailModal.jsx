import React from 'react';
import { Modal, Button, Badge } from '../../../components/ui';
import { Check, X, ShieldCheck, Coins, ShieldHalf, Gavel } from 'lucide-react';

const LawDetailModal = ({
    bill, isOpen, onClose, onVote, onApplyPolicy,
    onCloseVoting, myVote, isProcessing, hasPermission
}) => {
    if (!bill) return null;

    const isVoted = !!myVote;
    const canManageAssembly = hasPermission('assembly_admin'); // 예시 권한

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={bill.title} size="2xl">
            <div className="space-y-6">
                {/* --- 1. 제안자 및 상세 내용 --- */}
                <div>
                    <p className="text-sm text-slate-500 mb-2">제안자: {bill.proposerName}</p>
                    <div className="whitespace-pre-wrap text-slate-800 bg-slate-50 p-4 rounded-lg border text-base max-h-48 overflow-y-auto">
                        {bill.content}
                    </div>
                </div>

                {/* --- 2. 적용 규칙 정보 --- */}
                {(bill.policeRuleData?.fineAmount !== 0 || bill.policeRuleData?.creditChange !== 0) && (
                    <div className="border rounded-lg p-4 bg-white space-y-3">
                        <p className="text-sm font-semibold text-slate-700">가결 시 적용 규칙</p>
                        <div className="text-sm space-y-2 pl-2">
                            {bill.policeRuleData.fineAmount !== 0 && (
                                <p className="flex items-center">
                                    <Coins className="h-5 w-5 mr-2 text-amber-500" />
                                    <span>벌금/상금:</span>
                                    <span className="font-bold ml-2">{bill.policeRuleData.fineAmount.toLocaleString()}</span>
                                </p>
                            )}
                            {bill.policeRuleData.creditChange !== 0 && (
                                <p className="flex items-center">
                                    <ShieldHalf className="h-5 w-5 mr-2 text-sky-500" />
                                    <span>신용점수 변동:</span>
                                    <span className="font-bold ml-2">{bill.policeRuleData.creditChange > 0 ? '+' : ''}{bill.policeRuleData.creditChange}</span>
                                </p>
                            )}
                            {bill.policeRuleData.notes && (
                                <p className="text-xs text-slate-500 pt-2 mt-2 border-t">참고: {bill.policeRuleData.notes}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* --- 3. 액션 버튼 영역 --- */}
                <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-slate-600">이 법안에 대해 어떻게 생각하시나요?</p>
                        <div className="text-sm text-slate-500">
                            찬성 <span className="text-blue-600 font-bold">{bill.votes?.agree || 0}</span> ·
                            반대 <span className="text-red-600 font-bold ml-1">{bill.votes?.disagree || 0}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        {/* 투표가 진행 중이고, 내가 아직 투표 안했을 때 */}
                        {bill.status === 'voting' && !isVoted && (
                            <>
                                <Button color="blue" icon={Check} onClick={() => onVote(bill.id, 'agree')} isLoading={isProcessing === `vote-${bill.id}-agree`} disabled={!!isProcessing} className="flex-1 py-3 text-base">찬성</Button>
                                <Button color="red" variant="outline" icon={X} onClick={() => onVote(bill.id, 'disagree')} isLoading={isProcessing === `vote-${bill.id}-disagree`} disabled={!!isProcessing} className="flex-1 py-3 text-base">반대</Button>
                            </>
                        )}
                        {/* 이미 투표했을 때 */}
                        {isVoted && (
                            <div className="w-full text-center">
                                <Badge color={myVote === 'agree' ? 'blue' : 'red'} size="lg">{myVote === 'agree' ? '찬성' : '반대'}에 투표했습니다.</Badge>
                            </div>
                        )}
                        {/* 교사용 '정책 반영' 버튼 */}
                        {bill.status === 'passed' && canManageAssembly && (
                            bill.isPolicyApplied
                                ? <Badge color="green" icon={ShieldCheck}>정책 반영 완료</Badge>
                                : <Button size="sm" color="indigo" onClick={() => onApplyPolicy(bill.id)} isLoading={isProcessing === `apply-${bill.id}`} disabled={!!isProcessing}>정책으로 반영하기</Button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default LawDetailModal;