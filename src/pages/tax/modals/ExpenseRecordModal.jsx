// src/pages/dashboard/modals/ExpenseRecordModal.jsx
import React, { useState } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { Modal, Button, InputField, Textarea } from '../../../components/ui';
import { recordTaxExpense } from '../services/dashboardTaxService'; // 방금 만든 서비스 함수

const ExpenseRecordModal = ({ isOpen, onClose, classId }) => {
    const { userData } = useUser();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !reason) {
            setError("금액과 사유를 모두 입력해주세요.");
            return;
        }
        setIsSubmitting(true);
        setError('');

        const result = await recordTaxExpense({
            classId: classId,
            amountUsed: parseFloat(amount),
            reason: reason,
            actorUid: userData.uid,
        });

        if (result.success) {
            alert(result.message); // 또는 다른 피드백 방식 사용
            onClose(); // 성공 시 모달 닫기
        } else {
            setError(result.message);
        }
        setIsSubmitting(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="세금 지출 내역 기록">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="expense-amount" className="block text-sm font-medium text-slate-700">지출 금액</label>
                    <InputField
                        id="expense-amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="예: 5000"
                        min="1"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="expense-reason" className="block text-sm font-medium text-slate-700">지출 사유</label>
                    <Textarea
                        id="expense-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="예: 학급 간식 구매"
                        rows={3}
                        required
                    />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" onClick={onClose} variant="secondary">취소</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? '저장 중...' : '저장하기'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ExpenseRecordModal;