// src/pages/store/components/StorePendingRedemptions.jsx

import React, { useState, useMemo, useCallback } from 'react';
import { useUser } from '../../../contexts/UserContext';
import usePendingRedemptions from '../hooks/usePendingRedemptions';
import useAllStorePurchases from '../hooks/useAllStorePurchases';
import { markPurchaseAsRedeemed } from '../services/storeAdminService';
import { cancelStorePurchase } from '../services/storeService';
import { Button, Spinner, Alert, Card, Badge } from '../../../components/ui';
import dayjs from 'dayjs';
import CancelReasonModal from '../modals/CancelReasonModal';
import { ArrowLeft } from 'lucide-react';

const StorePendingRedemptions = ({ onBackToShop }) => {
    const { classId, userData: adminUserData } = useUser();
    const { pendingItems, isLoading: isLoadingPending, error: errorPending, refresh: refreshPending } = usePendingRedemptions();
    const { allPurchases, isLoading: isLoadingAll, error: errorAll, refresh: refreshAll } = useAllStorePurchases();

    const [processingId, setProcessingId] = useState(null);
    const [cancelTargetItem, setCancelTargetItem] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('pending');
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    const showAppFeedback = useCallback((message, type = 'info') => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: '', type: 'info' }), 5000);
    }, []);

    const handleAction = async (actionFn, item, params = {}) => {
        if (!adminUserData?.uid || processingId) return;
        setProcessingId(item.id);

        const result = await actionFn({
            classId,
            purchaseId: item.id,
            adminUid: adminUserData.uid,
            studentUid: item.studentUid,
            ...params,
        });

        if (result.success) {
            showAppFeedback(result.message || '정상적으로 처리되었습니다.', 'success');
        } else {
            showAppFeedback(result.message || '처리 중 오류가 발생했습니다.', 'error');
        }

        if (typeof refreshPending === 'function') refreshPending();
        if (typeof refreshAll === 'function') refreshAll();
        setProcessingId(null);
        setCancelTargetItem(null);
    };

    const confirmCancel = (reason) => {
        if (!cancelTargetItem) return;
        handleAction(cancelStorePurchase, cancelTargetItem, { reason: reason || '' });
    };

    const itemsToDisplay = useMemo(() => activeSubTab === 'pending' ? pendingItems : allPurchases, [activeSubTab, pendingItems, allPurchases]);
    const isLoading = activeSubTab === 'pending' ? isLoadingPending : isLoadingAll;
    const error = activeSubTab === 'pending' ? errorPending : errorAll;

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'redeemed': return <Badge color="green">지급완료</Badge>;
            case 'cancelled': return <Badge color="red">구매취소</Badge>;
            case 'pending': default: return <Badge color="yellow">미지급</Badge>;
        }
    };

    return (
        <>
            {feedback.message && (
                <div className="mb-4">
                    <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback({ message: '' })} />
                </div>
            )}
            <Card>
                <Card.Header className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div>
                        <Card.Title>🎁 상품 지급 관리</Card.Title>
                        <Card.Description>학생들이 구매한 상품의 지급을 처리하거나 전체 내역을 확인합니다.</Card.Description>
                    </div>
                    <Button variant="secondary" onClick={onBackToShop} className="w-full sm:w-auto flex-shrink-0">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        상점으로 돌아가기
                    </Button>
                </Card.Header>

                <div className="border-b border-slate-200 px-6">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveSubTab('pending')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeSubTab === 'pending' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            미지급 내역 <Badge color="yellow" size="sm" className="ml-2">{pendingItems.length}</Badge>
                        </button>
                        <button onClick={() => setActiveSubTab('allPurchases')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeSubTab === 'allPurchases' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            전체 구매 내역
                        </button>
                    </nav>
                </div>

                <Card.Content className="p-0">
                    <div className="overflow-x-auto">
                        {isLoading ? <div className="text-center py-20"><Spinner /></div>
                            : error ? <div className="p-4"><Alert type="error" message={error} /></div>
                                : itemsToDisplay.length === 0 ? <p className="text-center py-20 text-slate-500">해당 내역이 없습니다.</p>
                                    : (
                                        <table className="w-full text-sm">
                                            <thead className="text-left text-xs text-slate-500 bg-slate-50">
                                                <tr>
                                                    <th className="p-3 font-medium">구매일</th>
                                                    <th className="p-3 font-medium">학생</th>
                                                    <th className="p-3 font-medium">상품명 (수량)</th>
                                                    <th className="p-3 font-medium text-right">총액</th>
                                                    <th className="p-3 font-medium text-center">상태</th>
                                                    <th className="p-3 font-medium text-center">처리</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {itemsToDisplay.map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                                        <td className="p-3 whitespace-nowrap">{dayjs(item.requestDate.toDate()).format('YYYY.MM.DD HH:mm')}</td>
                                                        <td className="p-3 font-medium text-slate-800">{item.studentName}</td>
                                                        <td className="p-3">{item.itemName} ({item.quantity}개)</td>
                                                        <td className="p-3 text-right font-semibold whitespace-nowrap">{item.totalAmount.toLocaleString()} {item.currencyUnit}</td>
                                                        <td className="p-3 text-center">{renderStatusBadge(item.status)}</td>
                                                        <td className="p-3 text-center">
                                                            {item.status === 'pending' && (
                                                                <div className="flex justify-center items-center gap-2">
                                                                    <Button size="xs" variant="outline" color="red" onClick={() => setCancelTargetItem(item)} disabled={!!processingId}>취소</Button>
                                                                    <Button size="xs" color="green" onClick={() => handleAction(markPurchaseAsRedeemed, item)} disabled={!!processingId} isLoading={processingId === item.id}>지급</Button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                    </div>
                </Card.Content>
            </Card>

            <CancelReasonModal isOpen={!!cancelTargetItem} onClose={() => setCancelTargetItem(null)} onSubmit={confirmCancel} isSubmitting={!!processingId} />
        </>
    );
};

export default StorePendingRedemptions;