import React, { useState, useEffect } from 'react';
import { useLawboard } from './hooks/useLawboard';
import AppLayout from '../../components/layout/AppLayout';
import { Button, Spinner, Alert } from '../../components/ui';
import { PlusCircle, ChevronDown } from 'lucide-react';

import BillCard from './components/BillCard';
import ProposeBillModal from './modals/ProposeBillModal';
import LawDetailModal from './modals/LawDetailModal';
import SetThresholdModal from './modals/SetThresholdModal'; // ✅ 가결 기준 설정 모달

const ITEMS_PER_PAGE = 8;

const Lawboard = () => {
    const {
        classId, isLoading, isProcessing, activeTab, setActiveTab,
        votingBills, finishedBills, votedBills,
        handleApplyPolicy, handleVote, handleCloseVoting,
        isProposeModalOpen, setIsProposeModalOpen, handleProposalSuccess,
        hasPermission, loadMoreFinishedBills
    } = useLawboard();

    const [selectedBill, setSelectedBill] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false); // ✅ 상태 추가

    const TABS = [
        { id: 'voting', label: '투표 진행 중' },
        { id: 'finished', label: '종료된 법안' }
    ];

    // 탭 변경 시 페이지 리셋
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const fullBillList = activeTab === 'voting'
        ? [...votingBills].sort((a, b) => {
            const aTotal = (a.votes?.agree || 0) + (a.votes?.disagree || 0);
            const bTotal = (b.votes?.agree || 0) + (b.votes?.disagree || 0);
            return bTotal - aTotal; // 총 투표 수가 많은 순
        })
        : [...finishedBills].sort((a, b) => {
            // 1. 가결 우선
            if (a.status !== b.status) {
                return a.status === 'passed' ? -1 : 1;
            }
            // 2. 같은 상태 내에서 투표 수 높은 순
            const aTotal = (a.votes?.agree || 0) + (a.votes?.disagree || 0);
            const bTotal = (b.votes?.agree || 0) + (b.votes?.disagree || 0);
            return bTotal - aTotal;
        });

    const visibleBills = activeTab === 'voting'
        ? fullBillList.slice(0, currentPage * ITEMS_PER_PAGE)
        : fullBillList;

    const hasMore = activeTab === 'voting'
        ? visibleBills.length < fullBillList.length
        : true; // 종료된 법안은 항상 '더 보기' 가능

    return (
        <AppLayout>
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">법안 게시판</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            제안된 모든 법안을 확인하고 투표에 참여할 수 있습니다.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button color="indigo" onClick={() => setIsProposeModalOpen(true)} icon={PlusCircle}>
                            새로운 법안 제안하기
                        </Button>
                        {hasPermission('assembly_admin') && (
                            <Button
                                variant="outline"
                                color="gray"
                                onClick={() => setIsThresholdModalOpen(true)}
                            >
                                가결 기준 설정
                            </Button>
                        )}
                    </div>
                </header>

                <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex space-x-6">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {isLoading ? (
                    <div className="text-center py-20"><Spinner /></div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {visibleBills.length > 0 ? (
                                visibleBills.map(bill => (
                                    <BillCard
                                        key={bill.id}
                                        bill={bill}
                                        myVote={votedBills[bill.id]}
                                        canManage={hasPermission('assembly_admin')}
                                        isProcessing={isProcessing}
                                        onCardClick={() => setSelectedBill(bill)}
                                        onCloseVoting={handleCloseVoting}
                                    />
                                ))
                            ) : (
                                <div className="md:col-span-2">
                                    <Alert message="해당 상태의 법안이 없습니다." />
                                </div>
                            )}
                        </div>

                        {hasMore && (
                            <div className="text-center mt-6">
                                <Button
                                    variant="outline"
                                    color="gray"
                                    onClick={() => {
                                        if (activeTab === 'voting') {
                                            setCurrentPage(p => p + 1);
                                        } else {
                                            loadMoreFinishedBills();
                                        }
                                    }}
                                    isLoading={isProcessing === 'load-more'}
                                    disabled={!!isProcessing}
                                    icon={ChevronDown}
                                >
                                    더 보기
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ✅ 법안 제안 모달 */}
            {isProposeModalOpen && (
                <ProposeBillModal
                    isOpen={isProposeModalOpen}
                    onClose={() => setIsProposeModalOpen(false)}
                    classId={classId}
                    onSuccess={handleProposalSuccess}
                />
            )}

            {/* ✅ 법안 상세 모달 */}
            {selectedBill && (
                <LawDetailModal
                    bill={selectedBill}
                    isOpen={!!selectedBill}
                    onClose={() => setSelectedBill(null)}
                    onVote={handleVote}
                    onApplyPolicy={handleApplyPolicy}
                    onCloseVoting={handleCloseVoting}
                    myVote={votedBills[selectedBill.id]}
                    isProcessing={isProcessing}
                    hasPermission={hasPermission}
                />
            )}

            {/* ✅ 가결 기준 설정 모달 */}
            {isThresholdModalOpen && (
                <SetThresholdModal
                    isOpen={isThresholdModalOpen}
                    onClose={() => setIsThresholdModalOpen(false)}
                    classId={classId}
                />
            )}
        </AppLayout>
    );
};

export default Lawboard;
