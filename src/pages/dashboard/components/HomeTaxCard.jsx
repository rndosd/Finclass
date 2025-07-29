// src/pages/dashboard/components/HomeTaxCard.jsx

import React, { useEffect, useState } from 'react';
import { Card, Spinner, Button } from '../../../components/ui';
import { db } from '../../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';

// 🆕 학생용 세금 관련 모달 컴포넌트
import ExpenseHistoryModal from '../modals/ExpenseHistoryModal';
import TaxBillModal from '../modals/TaxBillModal';

const HomeTaxCard = () => {
    /* ─────────────────────────────── 기본 컨텍스트 / 상태 */
    const { classId, classData } = useUser();
    const currencyUnit = classData?.currencyUnit || '단위';

    const [taxSummary, setTaxSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    /* 모달 열림 여부 상태 */
    const [modalState, setModalState] = useState({
        expenseHistory: false,
        taxBill: false,
    });

    const openModal = (name) => setModalState((prev) => ({ ...prev, [name]: true }));
    const closeModal = (name) => setModalState((prev) => ({ ...prev, [name]: false }));

    /* ─────────────────────────────── 실시간 세금 현황 구독 */
    useEffect(() => {
        if (!classId) {
            setIsLoading(false);
            setTaxSummary(null);
            return;
        }

        setIsLoading(true);
        const summaryDocRef = doc(db, `classes/${classId}/dashboardSummary/taxSummary`);
        const unsubscribe = onSnapshot(
            summaryDocRef,
            (snap) => {
                setTaxSummary(snap.exists() ? snap.data() : null);
                setIsLoading(false);
            },
            (err) => {
                console.error('Error listening to tax summary:', err);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [classId]);

    /* 잔액 계산 */
    const totalIncome = taxSummary?.totalIncome || 0;
    const totalExpense = taxSummary?.totalExpense || 0;
    const balance = totalIncome - totalExpense;

    /* ─────────────────────────────── JSX */
    return (
        <>
            <Card>
                {/* 헤더 */}
                <Card.Header>
                    <Card.Title className="text-lg">💰 우리반 세금 현황</Card.Title>
                </Card.Header>

                {/* 본문 */}
                <Card.Content className="space-y-2 text-base">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Spinner />
                        </div>
                    ) : taxSummary ? (
                        <>
                            <div className="flex justify-between">
                                <span className="text-slate-600">총 수입:</span>
                                <span className="font-semibold">{totalIncome.toLocaleString()} {currencyUnit}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">총 지출:</span>
                                <span className="font-semibold">{totalExpense.toLocaleString()} {currencyUnit}</span>
                            </div>
                            <div className="flex justify-between text-lg pt-2 border-t mt-2">
                                <span className="font-bold">현재 잔액:</span>
                                <span className="font-bold text-indigo-600">{balance.toLocaleString()} {currencyUnit}</span>
                            </div>
                        </>
                    ) : (
                        <p className="text-center py-8 text-gray-500">세금 현황 데이터가 없습니다.</p>
                    )}
                </Card.Content>

                {/* 푸터 - 버튼 두 개 */}
                <Card.Footer className="p-4">
                    <div className="grid grid-cols-2 gap-2 w-full">
                        <Button
                            onClick={() => openModal('expenseHistory')}
                            className="w-full"
                            variant="outline"
                        >
                            우리반 세금 지출 내역
                        </Button>
                        <Button
                            onClick={() => openModal('taxBill')}
                            className="w-full"
                            color="indigo"
                            variant="outline"
                        >
                            세금 고지서 보기
                        </Button>
                    </div>
                </Card.Footer>
            </Card>

            {/* ────────────────── 모달 렌더링 */}
            {modalState.expenseHistory && (
                <ExpenseHistoryModal
                    isOpen={modalState.expenseHistory}
                    onClose={() => closeModal('expenseHistory')}
                    classId={classId}
                />
            )}
            {modalState.taxBill && (
                <TaxBillModal
                    isOpen={modalState.taxBill}
                    onClose={() => closeModal('taxBill')}
                />
            )}
        </>
    );
};

export default HomeTaxCard;
