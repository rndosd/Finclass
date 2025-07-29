// src/pages/dashboard/modals/SetDonationGoalModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, InputField, Spinner } from '../../../components/ui';
import { setDonationGoal } from '../services/donationService';

const SetDonationGoalModal = ({ isOpen, onClose, classId, currentGoal }) => {
    const [newGoal, setNewGoal] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNewGoal(currentGoal.toString());
            setError('');
        }
    }, [isOpen, currentGoal]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("--- '목표 저장' handleSubmit 함수 시작 ---");

        const goalAmount = parseFloat(newGoal);
        console.log("입력된 목표 금액:", newGoal, "-> 변환된 숫자:", goalAmount);

        // 1. 유효성 검사 확인
        if (isNaN(goalAmount) || goalAmount < 0) {
            console.error("오류: 유효하지 않은 숫자입니다.");
            setError("유효한 숫자를 입력해주세요.");
            return;
        }

        setIsSubmitting(true);
        setError('');
        console.log(`setDonationGoal 서비스 함수 호출 시작... classId: ${classId}, newGoal: ${goalAmount}`);

        // 2. 서비스 함수 호출 및 결과 확인
        const result = await setDonationGoal({
            classId: classId,
            newGoal: goalAmount
        });

        console.log("setDonationGoal 서비스 함수 결과:", result);

        if (result.success) {
            alert(result.message);
            onClose();
        } else {
            setError(result.message);
        }
        setIsSubmitting(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🎁 기부 목표 설정">
            {/* ⭐ 1. form 태그로 감싸고 onSubmit 핸들러를 연결합니다. */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField
                    label="새로운 목표 금액"
                    type="number"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="예: 20000"
                    min="0"
                    required
                />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end gap-3 pt-3 border-t mt-4">
                    {/* ⭐ 2. '취소' 버튼에는 type="button"을 명시하여 form 제출을 방지합니다. */}
                    <Button type="button" onClick={onClose} variant="secondary">
                        취소
                    </Button>

                    {/* ⭐ 3. '목표 저장' 버튼에 type="submit"을 지정하여 이 버튼이 form을 제출하도록 합니다. */}
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Spinner size="xs" className="mr-2" /> 저장 중...
                            </>
                        ) : (
                            '목표 저장'
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default SetDonationGoalModal;