// src/pages/dashboard/modals/TaxBillModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Spinner, Button } from '../../../components/ui';
import { db } from '../../../firebase';
import {
    collection,
    query,
    orderBy,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp,
    runTransaction,
    increment,
} from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { logTaxPayment } from '../../../utils/logUtils';
import dayjs from 'dayjs';

const TaxBillModal = ({ isOpen, onClose }) => {
    const { classId, userData, classData } = useUser();
    const { showFeedback } = useFeedback();

    const [taxBills, setTaxBills] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

    /* --------------------- 고지서 불러오기 --------------------- */
    const loadTaxBills = async () => {
        if (!classId || !userData?.uid) return;

        setIsLoading(true);
        try {
            const billsQuery = query(
                collection(db, `classes/${classId}/students/${userData.uid}/taxBills`),
                orderBy('dueDate', 'asc')
            );

            const snap = await getDocs(billsQuery);

            const now = dayjs();
            const twoWeeksAgo = now.subtract(14, 'day');

            const parsed = snap.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .filter((b) => {
                    if (!b.isPaid) return true; // 미납 => 항상 표시
                    if (!b.paidAt) return false;
                    return dayjs(b.paidAt.toDate()).isAfter(twoWeeksAgo);
                });

            setTaxBills(parsed);
        } catch (err) {
            console.error('[TaxBillModal] loadTaxBills error:', err);
            showFeedback('세금 고지서를 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) loadTaxBills();
    }, [isOpen, classId, userData?.uid]);

    /* --------------------- 납부 처리 --------------------- */
    const handlePayBill = async (billId, amount, billName) => {
        if (!classId || !userData?.uid || isPaying) return;

        setIsPaying(true);

        const studentRef = doc(db, `classes/${classId}/students/${userData.uid}`);
        const billRef = doc(db, `classes/${classId}/students/${userData.uid}/taxBills/${billId}`);

        try {
            await runTransaction(db, async (tx) => {
                const stuSnap = await tx.get(studentRef);
                if (!stuSnap.exists()) throw new Error('학생 정보를 찾을 수 없습니다.');

                const cash = stuSnap.data().assets?.cash ?? 0;
                if (cash < amount) throw new Error('잔액이 부족합니다.');

                tx.update(studentRef, { 'assets.cash': increment(-amount) });
                tx.update(billRef, {
                    isPaid: true,
                    paidAt: serverTimestamp(),
                    amountPaid: amount,
                });
            });

            await logTaxPayment({
                classId,
                studentUid: userData.uid,
                actorUid: userData.uid,
                taxAmount: amount,
                currency: classData?.currencyUnit || '단위',
                taxTypeDescription: billName,
                relatedDocId: billId,
            });

            showFeedback(`${billName} 세금 ${amount.toLocaleString()}${classData?.currencyUnit || '단위'} 납부 완료`, 'success');
            loadTaxBills();
        } catch (err) {
            console.error('[TaxBillModal] pay error:', err);
            showFeedback(`세금 납부 실패: ${err.message}`, 'error');
        } finally {
            setIsPaying(false);
        }
    };

    /* --------------------- 렌더 --------------------- */
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📜 세금 고지서 목록" size="lg">
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Spinner />
                </div>
            ) : taxBills.length === 0 ? (
                <p className="text-center text-gray-500 py-6">📭 발급된 세금 고지서가 없습니다.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {taxBills.map((bill) => (
                        <div key={bill.id} className="border rounded-lg p-4 shadow bg-white space-y-2">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold flex items-center gap-2">🧾 {bill.name || '세금 고지서'}</h3>
                            </div>

                            <div className="text-sm text-gray-700 space-y-1">
                                <p>
                                    💰 금액:{' '}
                                    <span className="font-semibold text-lg">
                                        {bill.amount.toLocaleString()} {classData?.currencyUnit || '단위'}
                                    </span>
                                </p>
                                <p>📅 납부 기한: {bill.dueDate?.toDate().toLocaleDateString()}</p>
                                <p>🗓️ 발행일: {bill.issuedAt?.toDate().toLocaleDateString()}</p>
                                <p>👩‍🏫 발행자: 교사</p>
                                {bill.isPaid && bill.paidAt && (
                                    <p className="text-green-700 text-xs">
                                        ✅ 납부일: {bill.paidAt.toDate().toLocaleDateString()}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2 border-t mt-2 text-right">
                                {bill.isPaid ? (
                                    <span className="text-green-600 font-bold text-base">✅ 납부 완료</span>
                                ) : (
                                    <Button
                                        color="blue"
                                        onClick={() => handlePayBill(bill.id, bill.amount, bill.name)}
                                        disabled={isPaying}
                                    >
                                        💸 납부하기
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};

export default TaxBillModal;
