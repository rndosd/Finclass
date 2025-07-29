// src/pages/tax/tabs/TaxFinanceTab.jsx
import React, { useState, useEffect } from 'react';
import { Card, Spinner, Button } from '../../../components/ui';
import { db } from '../../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { RefreshCw } from 'lucide-react';

import { triggerTaxIncomeUpdate, triggerTaxExpenseUpdate } from '../services/dashboardTaxService';
import TaxBillIssuerModal from '../modals/TaxBillIssuerModal';
import ExpenseRecordModal from '../modals/ExpenseRecordModal';
import TaxBillHistoryModal from '../modals/TaxBillHistoryModal';           // ⭐ NEW
import { useFeedback } from '../../../contexts/FeedbackContext';

const TaxFinanceTab = ({ classId, currencyUnit }) => {
    /* ───────── state ───────── */
    const [taxSummary, setTaxSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState({ income: false, expense: false });
    const [modalState, setModalState] = useState({
        taxBill: false,
        expenseRecord: false,
        taxBillHistory: false,               // ⭐ NEW
    });

    const { showFeedback } = useFeedback();

    /* ───────── 실시간 합계 구독 ───────── */
    useEffect(() => {
        if (!classId) {
            setIsLoading(false);
            setTaxSummary(null);
            return;
        }

        setIsLoading(true);
        const ref = doc(db, `classes/${classId}/dashboardSummary/taxSummary`);
        const unsub = onSnapshot(
            ref,
            (snap) => {
                setTaxSummary(snap.exists() ? snap.data() : null);
                setIsLoading(false);
            },
            (err) => {
                console.error('[TaxFinanceTab] summary error:', err);
                showFeedback('세금 현황을 불러오는 중 오류가 발생했습니다.', 'error');
                setIsLoading(false);
            }
        );
        return () => unsub();
    }, [classId, showFeedback]);

    /* ───────── 합계 계산 ───────── */
    const totalIncome = taxSummary?.totalIncome || 0;
    const totalExpense = taxSummary?.totalExpense || 0;
    const balance = totalIncome - totalExpense;

    /* ───────── 집계 버튼 처리 ───────── */
    const handleUpdate = async (type) => {
        if (!classId || isUpdating.income || isUpdating.expense) return;

        const fn = type === 'income' ? triggerTaxIncomeUpdate : triggerTaxExpenseUpdate;
        const label = type === 'income' ? '수입' : '지출';

        setIsUpdating((p) => ({ ...p, [type]: true }));
        showFeedback(`${label} 집계 중…`, 'info');

        const res = await fn(classId);
        showFeedback(res.message, res.success ? 'success' : 'error');

        setIsUpdating((p) => ({ ...p, [type]: false }));
    };

    /* ───────── 모달 열고 닫기 ───────── */
    const openModal = (name) => setModalState((p) => ({ ...p, [name]: true }));
    const closeModal = (name) => setModalState((p) => ({ ...p, [name]: false }));

    /* ───────── JSX ───────── */
    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ▸ 우리반 세금 현황 카드 */}
                <Card>
                    <Card.Header className="flex justify-between items-center">
                        <Card.Title className="text-base font-bold">💰 우리반 세금 현황</Card.Title>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => handleUpdate('income')}
                                disabled={isUpdating.income || isUpdating.expense}
                                size="xs"
                                variant="ghost"
                            >
                                {isUpdating.income ? <Spinner size="xs" /> : <RefreshCw className="h-3 w-3" />}
                                <span className="ml-1">{isUpdating.income ? '집계중' : '수입'}</span>
                            </Button>
                            <Button
                                onClick={() => handleUpdate('expense')}
                                disabled={isUpdating.income || isUpdating.expense}
                                size="xs"
                                variant="ghost"
                            >
                                {isUpdating.expense ? <Spinner size="xs" /> : <RefreshCw className="h-3 w-3" />}
                                <span className="ml-1">{isUpdating.expense ? '집계중' : '지출'}</span>
                            </Button>
                        </div>
                    </Card.Header>

                    <Card.Content className="space-y-3 text-sm">
                        {isLoading ? (
                            <div className="text-center py-6"><Spinner /></div>
                        ) : taxSummary ? (
                            <>
                                <p>총 수입: {totalIncome.toLocaleString()} {currencyUnit}</p>
                                <p>총 지출: {totalExpense.toLocaleString()} {currencyUnit}</p>
                                <p className="font-semibold text-base">
                                    현재 잔액:{' '}
                                    <span className="text-indigo-600">
                                        {balance.toLocaleString()} {currencyUnit}
                                    </span>
                                </p>
                            </>
                        ) : (
                            <p className="text-center py-6 text-gray-500">
                                세금 현황 데이터가 없습니다. 집계 버튼을 눌러주세요.
                            </p>
                        )}
                    </Card.Content>
                </Card>

                {/* ▸ 세금 관리 카드 */}
                <Card>
                    <Card.Header>
                        <Card.Title className="text-base font-bold">세금 관리</Card.Title>
                    </Card.Header>
                    <Card.Content className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Button onClick={() => openModal('expenseRecord')}>지출 기록</Button>
                        <Button onClick={() => openModal('taxBill')} variant="outline">
                            세금 고지서 발급
                        </Button>
                        <Button onClick={() => openModal('taxBillHistory')} variant="outline"> {/* ⭐ NEW */}
                            발급 내역
                        </Button>
                    </Card.Content>
                </Card>
            </div>

            {/* ───────── 모달 영역 ───────── */}
            {modalState.taxBill && (
                <TaxBillIssuerModal
                    isOpen={modalState.taxBill}
                    onClose={() => closeModal('taxBill')}
                />
            )}

            {modalState.expenseRecord && (
                <ExpenseRecordModal
                    isOpen={modalState.expenseRecord}
                    onClose={() => closeModal('expenseRecord')}
                    classId={classId}
                />
            )}

            {modalState.taxBillHistory && (                                   /* ⭐ NEW */
                <TaxBillHistoryModal
                    isOpen={modalState.taxBillHistory}
                    onClose={() => closeModal('taxBillHistory')}
                    classId={classId}
                />
            )}
        </>
    );
};

export default TaxFinanceTab;
