// src/pages/dashboard/modals/DonationModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, InputField, Alert, Spinner } from '../../../components/ui';
import { makeDonation } from '../services/donationService';
import { useUser } from '../../../contexts/UserContext';
import { db } from '../../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const DonationModal = ({ isOpen, onClose, classId }) => {
    const { userData, classData } = useUser();
    const currencyUnit = classData?.currencyUnit || '단위';

    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [currentCash, setCurrentCash] = useState(0);
    const [isCashLoading, setIsCashLoading] = useState(true);

    // 보유 현금 실시간 구독
    useEffect(() => {
        if (!isOpen) return;

        setAmount('');
        setError('');
        setSuccessMessage('');
        setIsCashLoading(true);

        if (!classId || !userData?.uid) {
            setIsCashLoading(false);
            return;
        }

        const studentDocRef = doc(db, `classes/${classId}/students/${userData.uid}`);
        const unsubscribe = onSnapshot(studentDocRef, (docSnap) => {
            const cash = docSnap.data()?.assets?.cash ?? 0;
            setCurrentCash(cash);
            setIsCashLoading(false);
        }, (err) => {
            console.error("Error listening to student cash:", err);
            setError("보유 현금 정보를 불러오는 데 실패했습니다.");
            setIsCashLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, classId, userData?.uid]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const donationAmount = Number(amount);

        if (donationAmount <= 0) {
            setError("기부 금액은 0보다 커야 합니다.");
            return;
        }
        if (donationAmount > currentCash) {
            setError(`보유 현금(${currentCash.toLocaleString()} ${currencyUnit})보다 많은 금액은 기부할 수 없습니다.`);
            return;
        }

        console.log('[DonationModal] handleSubmit called', donationAmount);

        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');

        try {
            const result = await makeDonation({
                classId: classId,
                userId: userData.uid,
                userName: userData.name || userData.displayName,
                amount: donationAmount
            });

            console.log('[DonationModal] makeDonation result:', result);

            if (result?.success) {
                setSuccessMessage(result.message);
                // UX → 1.5초 후 모달 자동 닫기
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                setError(result?.message || '기부 처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('[DonationModal] makeDonation error:', error);
            setError('기부 처리 중 오류가 발생했습니다.');
        }

        setIsSubmitting(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🎁 기부하기">
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-600">
                    따뜻한 마음을 나눠주셔서 감사합니다! 기부금은 학급 공동 자산으로 사용됩니다.
                </p>

                <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500">현재 보유 현금</p>
                    {isCashLoading ? (
                        <Spinner size="sm" />
                    ) : (
                        <p className="text-xl font-bold text-slate-700">
                            {currentCash.toLocaleString()} {currencyUnit}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="donation-amount" className="block text-sm font-medium text-slate-700">
                        기부할 금액
                    </label>
                    <InputField
                        id="donation-amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="금액을 입력하세요"
                        min="1"
                        required
                        className="mt-1"
                    />
                </div>

                {/* ⭐ 성공/오류 메시지 표시 */}
                {successMessage && <Alert type="success" message={successMessage} />}
                {error && <Alert type="error" message={error} />}

                <div className="flex justify-end gap-3 pt-3 border-t mt-4">
                    <Button type="button" onClick={onClose} variant="secondary">
                        취소
                    </Button>
                    <Button type="submit" disabled={isSubmitting || isCashLoading}>
                        {isSubmitting ? (
                            <>
                                <Spinner size="xs" className="mr-2" /> 기부 중...
                            </>
                        ) : (
                            '기부하기'
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default DonationModal;
