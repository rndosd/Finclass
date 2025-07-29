// src/pages/stock/components/modals/SellStockModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, InputField, Alert } from '../../../components/ui'; // 공통 UI 컴포넌트 경로 확인
import { DollarSign, Minus, Plus, CornerUpLeft } from 'lucide-react'; // CornerUpLeft는 매도 아이콘 예시

const SellStockModal = ({
    isOpen,
    onClose,
    symbol,
    companyName,
    currentPriceUSD,    // 현재 주가 (매도 단가)
    quantityOwned,      // 현재 보유 수량
    tradeFeeRate,       // 거래 수수료율
    onSubmitSellOrder,  // (symbol, quantityToSell, currentPriceUSD, companyName, totalProceedsUSDAfterFee) => Promise<{success, message}>

}) => {
    const [quantityToSell, setQuantityToSell] = useState(1);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setQuantityToSell(quantityOwned > 0 ? 1 : 0); // 보유 수량이 있으면 1주부터, 없으면 0
            setErrorMessage('');
        }
    }, [isOpen, symbol, quantityOwned]);

    const { itemValueUSD, feeUSD, totalProceedsUSDAfterFee } = useMemo(() => {
        if (typeof currentPriceUSD !== 'number' || currentPriceUSD <= 0 || quantityToSell <= 0) {
            return { itemValueUSD: 0, feeUSD: 0, totalProceedsUSDAfterFee: 0 };
        }
        const value = currentPriceUSD * quantityToSell;
        const fee = value * tradeFeeRate;
        return {
            itemValueUSD: value,
            feeUSD: fee,
            totalProceedsUSDAfterFee: value - fee,
        };
    }, [currentPriceUSD, quantityToSell, tradeFeeRate]);

    const canSell = quantityOwned > 0 && quantityToSell > 0 && quantityToSell <= quantityOwned;

    const handleQuantityChange = (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) {
            val = 1;
        }
        if (val > quantityOwned) {
            val = quantityOwned;
        }
        setQuantityToSell(val);
        setErrorMessage('');
    };

    const incrementQuantity = () => setQuantityToSell(prev => Math.min(quantityOwned, prev + 1));
    const decrementQuantity = () => setQuantityToSell(prev => Math.max(1, prev - 1));
    const setMaxQuantity = () => setQuantityToSell(quantityOwned);


    const handleSubmit = async () => {
        if (!canSell) {
            setErrorMessage("매도 수량이 유효하지 않거나 보유 수량을 초과했습니다.");
            return;
        }
        setErrorMessage('');

        // onSubmitSellOrder는 StockPage에서 전달받은, executeSellStock을 호출하는 함수
        await onSubmitSellOrder(quantityToSell);
    };

    if (!isOpen || !symbol) return null;

    return (
        <Modal isOpen={isOpen} title={`${symbol} (${companyName || symbol}) 주식 매도`} onClose={onClose} size="md">
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    현재가: <span className="font-semibold text-slate-800">{currentPriceUSD.toFixed(2)} USD</span>
                </p>
                <p className="text-sm text-slate-600">
                    보유 수량: <span className="font-semibold text-indigo-700">{quantityOwned} 주</span>
                </p>

                <div>
                    <label htmlFor="sellQuantity" className="block text-sm font-medium text-slate-700 mb-1">매도 수량</label>
                    <div className="flex items-center gap-2">
                        <Button onClick={decrementQuantity} variant="outline" size="sm" icon={Minus} disabled={quantityToSell <= 1 || quantityOwned === 0} aria-label="수량 감소" />
                        <InputField
                            id="sellQuantity"
                            type="number"
                            value={quantityToSell.toString()}
                            onChange={handleQuantityChange}
                            min="1"
                            max={quantityOwned.toString()}
                            className="text-center w-20"
                            disabled={quantityOwned === 0}
                        />
                        <Button onClick={incrementQuantity} variant="outline" size="sm" icon={Plus} disabled={quantityToSell >= quantityOwned || quantityOwned === 0} aria-label="수량 증가" />
                        <Button onClick={setMaxQuantity} variant="outline" size="sm" disabled={quantityOwned === 0}>최대</Button>
                    </div>
                </div>

                {quantityToSell > 0 && currentPriceUSD > 0 && (
                    <div className="p-3 bg-slate-50 rounded-md text-sm space-y-1 border border-slate-200">
                        <div className="flex justify-between"><span>예상 주식 매도 금액 (USD):</span> <span className="font-medium">{itemValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span></div>
                        <div className="flex justify-between"><span>예상 수수료 ({(tradeFeeRate * 100).toFixed(2)}%):</span> <span className="font-medium text-red-500">{feeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span></div>
                        <hr className="my-1.5 border-slate-300" />
                        <div className="flex justify-between text-base"><strong>총 예상 수령액 (USD):</strong> <strong className="text-green-600">{totalProceedsUSDAfterFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong></div>
                    </div>
                )}

                {errorMessage && <Alert type="error" message={errorMessage} />}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-6">
                    <Button onClick={onClose} variant="secondary" color="gray">취소</Button>
                    <Button
                        onClick={handleSubmit} // ⭐ 수정된 handleSubmit 호출
                        color="red"
                        icon={CornerUpLeft}
                        disabled={!canSell} // disabled 조건 단순화
                    >
                        {quantityToSell}주 매도 확인
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default SellStockModal;