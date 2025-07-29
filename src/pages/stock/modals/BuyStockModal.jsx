// src/pages/stock/components/modals/BuyStockModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, InputField, Alert } from '../../../components/ui'; // 공통 UI 컴포넌트 경로 확인
import { DollarSign, Minus, Plus, XCircle } from 'lucide-react';

const BuyStockModal = ({
    isOpen,
    onClose,
    symbol,
    companyName,
    currentPriceUSD,
    balanceUSD,         // 사용자의 현재 USD 잔고
    tradeFeeRate,       // 거래 수수료율 (예: 0.002)
    onSubmitBuyOrder,   // (quantityToBuy) => Promise<{success, message}> 형태의 매수 실행 함수
    currencyUnit = "빌" // 학급 화폐 단위 (현재는 USD 거래이므로 직접 사용은 X)
}) => {
    const [quantity, setQuantity] = useState(1);
    const [errorMessage, setErrorMessage] = useState('');

    // 모달이 열리거나 심볼이 바뀔 때 수량 초기화 및 에러 메시지 초기화
    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setErrorMessage('');
        }
    }, [isOpen, symbol]);

    const { itemCostUSD, feeUSD, totalCostUSDWithFee } = useMemo(() => {
        if (typeof currentPriceUSD !== 'number' || currentPriceUSD <= 0 || quantity <= 0) {
            return { itemCostUSD: 0, feeUSD: 0, totalCostUSDWithFee: 0 };
        }
        const cost = currentPriceUSD * quantity;
        const fee = cost * tradeFeeRate;
        return {
            itemCostUSD: cost,
            feeUSD: fee,
            totalCostUSDWithFee: cost + fee,
        };
    }, [currentPriceUSD, quantity, tradeFeeRate]);

    const canAfford = balanceUSD !== null && balanceUSD >= totalCostUSDWithFee;

    const handleQuantityChange = (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) {
            val = 1;
        }
        setQuantity(val);
        setErrorMessage(''); // 수량 변경 시 에러 메시지 초기화
    };

    const incrementQuantity = () => setQuantity(prev => Math.max(1, prev + 1));
    const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

    const handleSubmit = async () => {
        if (!canAfford) {
            setErrorMessage("USD 잔액이 부족합니다.");
            return;
        }
        if (quantity <= 0) {
            setErrorMessage("매수 수량은 1 이상이어야 합니다.");
            return;
        }
        setErrorMessage(''); // 이전 에러 메시지 초기화

        await onSubmitBuyOrder(quantity);        // StockPage의 onSubmitBuyOrder 함수 내부에서 성공/실패 피드백 및 모달 닫기 처리
    };

    if (!isOpen || !symbol) return null;

    return (
        <Modal isOpen={isOpen} title={`${symbol} (${companyName || symbol}) 주식 매수`} onClose={onClose} size="md">
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    현재가: <span className="font-semibold text-slate-800">{currentPriceUSD.toFixed(2)} USD</span>
                </p>
                <p className="text-sm text-slate-600">
                    보유 USD: <span className={`font-semibold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                        ${balanceUSD !== null ? balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                    </span>
                </p>

                <div>
                    <label htmlFor="buyQuantity" className="block text-sm font-medium text-slate-700 mb-1">매수 수량</label>
                    <div className="flex items-center gap-2">
                        <Button onClick={decrementQuantity} variant="outline" size="sm" icon={Minus} disabled={quantity <= 1} aria-label="수량 감소" />
                        <InputField
                            id="buyQuantity"
                            type="number"
                            value={quantity.toString()}
                            onChange={handleQuantityChange}
                            min="1"
                            className="text-center w-20"
                        />
                        <Button onClick={incrementQuantity} variant="outline" size="sm" icon={Plus} aria-label="수량 증가" />
                    </div>
                </div>

                {quantity > 0 && currentPriceUSD > 0 && (
                    <div className="p-3 bg-slate-50 rounded-md text-sm space-y-1 border border-slate-200">
                        <div className="flex justify-between"><span>예상 주식 비용 (USD):</span> <span className="font-medium">{itemCostUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span></div>
                        <div className="flex justify-between"><span>예상 수수료 ({(tradeFeeRate * 100).toFixed(2)}%):</span> <span className="font-medium text-red-500">{feeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span></div>
                        <hr className="my-1.5 border-slate-300" />
                        <div className="flex justify-between text-base"><strong>총 예상 비용 (USD):</strong> <strong className="text-indigo-700">{totalCostUSDWithFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></div>
                    </div>
                )}

                {errorMessage && <Alert type="error" message={errorMessage} />}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-6">
                    <Button onClick={onClose} variant="secondary" color="gray">취소</Button>
                    <Button
                        onClick={handleSubmit}
                        color="indigo"
                        icon={DollarSign}
                        disabled={quantity <= 0 || !canAfford || totalCostUSDWithFee <= 0}
                    >
                        {quantity}주 매수 확인 (USD)
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default BuyStockModal;