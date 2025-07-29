// src/pages/stock/components/modals/ConversionRateModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, InputField, Alert } from '../../../components/ui'; // UI 컴포넌트 경로 확인
import { Edit2, XCircle } from 'lucide-react'; // 아이콘

const ConversionRateModal = ({
    isOpen,
    onClose,
    currentRate,      // 현재 환율 (useStockSettings에서 가져온 값)
    onSubmit,         // (newRateString) => Promise<{success, message}> 형태의 업데이트 실행 함수
    isSubmitting      // (선택적) 제출 중 로딩 상태 표시용
}) => {
    const [newRateInput, setNewRateInput] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNewRateInput(currentRate ? currentRate.toString() : '');
            setErrorMessage('');
        }
    }, [isOpen, currentRate]);

    const handleInputChange = (e) => {
        setNewRateInput(e.target.value);
        setErrorMessage(''); // 입력 시 에러 메시지 초기화
    };

    const handleSubmit = async () => {
        const newRate = parseFloat(newRateInput);
        if (isNaN(newRate) || newRate <= 0) {
            setErrorMessage("유효한 환율 값을 입력해주세요 (0보다 큰 숫자).");
            return;
        }
        setErrorMessage('');

        // onSubmit은 StockPage에서 전달받은,
        // useStockSettings의 updateConversionRateInFirestore 또는
        // stockAdminService의 함수를 호출하는 핸들러
        await onSubmit(newRateInput);
        // 성공/실패 피드백 및 모달 닫기는 onSubmit 함수 또는 호출한 StockPage에서 처리
    };

    if (!isOpen) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} title="💲 환율 변경 (관리자)" onClose={onClose} size="sm">
            <div className="space-y-4">
                <p className="text-xs text-slate-500 mt-1">
                    현재 환율: 1 USD = {conversionRate.toFixed(2)} {currencyUnit} | 1 {currencyUnit} ≈ {(1 / conversionRate).toFixed(4)} USD
                </p>
                <InputField
                    id="newConversionRateInput"
                    label="새 환율 (1 USD 당 학급화폐 수)"
                    type="number"
                    value={newRateInput}
                    onChange={handleInputChange}
                    placeholder="예: 25"
                    step="0.0001"
                />
                {errorMessage && <Alert type="error" message={errorMessage} />}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-5">
                    <Button onClick={onClose} variant="secondary" color="gray">
                        취소
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        color="indigo"
                        icon={Edit2}
                        disabled={isSubmitting || !newRateInput || parseFloat(newRateInput) <= 0}
                    >
                        {isSubmitting ? '저장 중...' : '환율 저장'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ConversionRateModal;