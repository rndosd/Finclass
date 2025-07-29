import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Spinner, Button, Alert } from '../../../components/ui';
import { db } from '../../../firebase';
import {
    collectionGroup,
    query,
    where,
    orderBy,
    getDocs,
    deleteDoc,
    doc,
    writeBatch,
} from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import dayjs from 'dayjs';

/* -------------------------------------------------------------------------- */

const TaxBillHistoryModal = ({ isOpen, onClose, classId }) => {
    const { classData } = useUser();
    const { showFeedback } = useFeedback();
    const currencyUnit = classData?.currencyUnit || '단위';

    const [bills, setBills] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [error, setError] = useState('');

    /* ───────── 세금 고지서 전체 로드 ───────── */
    const fetchBills = useCallback(async () => {
        if (!classId) return;
        setIsLoading(true);
        setError('');
        try {
            const q = query(
                collectionGroup(db, 'taxBills'),
                where('classId', '==', classId), // 🔥 classId 필터 추가
                orderBy('issuedAt', 'desc')
            );

            const snap = await getDocs(q);
            const parsed = snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
            setBills(parsed);
        } catch (err) {
            console.error('[TaxBillHistory] fetch error:', err);
            setError('고지서 내역을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        if (isOpen) fetchBills();
    }, [isOpen, fetchBills]);

    /* ───────── 고지서 취소(삭제) ───────── */
    const cancelBill = async (bill) => {
        if (!bill || bill.isPaid || isCanceling) return;

        if (!window.confirm(`'${bill.name}' 고지서를 삭제(취소)하시겠습니까?`)) return;

        setIsCanceling(true);
        try {
            // 단일 문서 삭제지만, 다수 선택 삭제 로직으로 확장하기 좋게 batch 사용
            const batch = writeBatch(db);
            batch.delete(bill.ref);
            await batch.commit();

            showFeedback('고지서가 취소(삭제)되었습니다.', 'success');
            // UI 갱신
            setBills((prev) => prev.filter((b) => b.id !== bill.id));
        } catch (err) {
            console.error('[TaxBillHistory] cancel error:', err);
            showFeedback('고지서 취소 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsCanceling(false);
        }
    };

    /* ───────── 렌더 ───────── */
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="세금 고지서 발급 내역" size="lg">
            {isLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
            ) : error ? (
                <Alert type="error" message={error} />
            ) : bills.length === 0 ? (
                <p className="text-center py-6 text-gray-500">발급된 고지서가 없습니다.</p>
            ) : (
                <div className="overflow-x-auto max-h-[60vh]">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-100 sticky top-0">
                            <tr>
                                <th className="p-2">학생 UID</th>
                                <th className="p-2">고지서 이름</th>
                                <th className="p-2 text-right">금액 ({currencyUnit})</th>
                                <th className="p-2">납부 기한</th>
                                <th className="p-2">상태</th>
                                <th className="p-2">조치</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.map((b) => (
                                <tr key={b.id} className="border-b last:border-0">
                                    <td className="p-2 font-mono text-xs">{b.studentUid}</td>
                                    <td className="p-2">{b.name}</td>
                                    <td className="p-2 text-right">{b.amount.toLocaleString()}</td>
                                    <td className="p-2">
                                        {b.dueDate?.toDate ? dayjs(b.dueDate.toDate()).format('YYYY-MM-DD') : '-'}
                                    </td>
                                    <td className="p-2">
                                        {b.isPaid ? (
                                            <span className="text-green-600 font-semibold">납부완료</span>
                                        ) : (
                                            <span className="text-red-600 font-semibold">미납</span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        {!b.isPaid ? (
                                            <Button
                                                size="xs"
                                                color="red"
                                                onClick={() => cancelBill(b)}
                                                disabled={isCanceling}
                                            >
                                                취소
                                            </Button>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Modal>
    );
};

export default TaxBillHistoryModal;
