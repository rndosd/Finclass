// src/pages/stock/modals/ExchangeModal.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, InputField, Alert, TabButton as OriginalTabButton } from '../../../components/ui';
import { ArrowRightLeft } from 'lucide-react';

// 🚀 상수 import (중앙 관리)
import {
    TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD,
    TRANSACTION_TYPE_EXCHANGE_USD_TO_BIL
} from '../constants/transactionTypes';

const TabButton = OriginalTabButton; // 공용 TabButton 사용

const ExchangeModal = ({
    isOpen,
    onClose,
    balanceBIL,
    balanceUSD,
    conversionRate,
    exchangeFeeRate,
    onSubmitExchange,
    currencyUnit = "빌"
}) => {
    // 🚀 direction 상수 기반 초기화
    const [direction, setDirection] = useState(TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD);
    const [amountInput, setAmountInput] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // 🚀 방향 리스트
    const exchangeDirections = [
        {
            key: TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD,
            label: `${currencyUnit} → USD`
        },
        {
            key: TRANSACTION_TYPE_EXCHANGE_USD_TO_BIL,
            label: `USD → ${currencyUnit}`
        }
    ];

    // 모달 열릴 때 초기화
    useEffect(() => {
        if (isOpen) {
            setAmountInput('');
            setErrorMessage('');
            // setDirection(TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD); // 필요 시 초기 방향 설정
        }
    }, [isOpen]);

    // 계산된 결과 메모이제이션
    const calculatedResult = useMemo(() => {
        const amount = parseFloat(amountInput);
        if (isNaN(amount) || amount <= 0 || conversionRate <= 0) {
            return { canExchange: false, errorMsg: "유효한 환전 금액을 입력해주세요." };
        }

        let sourceBalance, sourceCurr, targetCurr, fee, netAmount, finalAmount;

        if (direction === TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD) {
            sourceBalance = balanceBIL;
            sourceCurr = currencyUnit;
            targetCurr = 'USD';
            if (amount > sourceBalance) return { canExchange: false, errorMsg: `${currencyUnit} 잔액이 부족합니다.` };
            fee = amount * exchangeFeeRate;
            netAmount = amount - fee;
            finalAmount = netAmount / conversionRate;
        } else {
            sourceBalance = balanceUSD;
            sourceCurr = 'USD';
            targetCurr = currencyUnit;
            if (amount > sourceBalance) return { canExchange: false, errorMsg: "USD 잔액이 부족합니다." };
            fee = amount * exchangeFeeRate;
            netAmount = amount - fee;
            finalAmount = netAmount * conversionRate;
        }

        return {
            canExchange: true, errorMsg: '',
            inputAmount: amount,
            feeAmount: fee,
            netAmountToConvert: netAmount,
            finalReceivedAmount: finalAmount,
            sourceCurrency: sourceCurr,
            targetCurrency: targetCurr
        };
    }, [amountInput, direction, balanceBIL, balanceUSD, conversionRate, exchangeFeeRate, currencyUnit]);

    // 🚀 환전 실행
    const handleSubmit = async () => {
        if (!calculatedResult.canExchange) {
            setErrorMessage(calculatedResult.errorMsg || "환전할 수 없습니다.");
            return;
        }

        setErrorMessage('');

        // 디버그용 확인
        console.log("[ExchangeModal] handleSubmit direction:", direction);

        const result = await onSubmitExchange(
            direction,
            calculatedResult.inputAmount,
            calculatedResult.sourceCurrency,
            calculatedResult.targetCurrency,
            calculatedResult,
            conversionRate
        );

        // 결과에 따른 후처리 (필요 시)
        if (!result?.success && result?.message) {
            setErrorMessage(result.message);
        } else {
            onClose(); // 성공 시 모달 닫기
        }
    };

    if (!isOpen) return null;

    const sourceBalanceDisplay = direction === TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD
        ? `${(balanceBIL ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currencyUnit}`
        : `$${(balanceUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <Modal isOpen={isOpen} title="💰 화폐 환전" onClose={onClose} size="lg">
            <div className="space-y-5">

                {/* 🚀 TabButton map 패턴 */}
                <div className="flex border-b border-slate-200">
                    {exchangeDirections.map((dir) => (
                        <TabButton
                            key={dir.key}
                            isActive={direction === dir.key}
                            onClick={() => {
                                setDirection(dir.key);
                                setAmountInput('');
                            }}
                        >
                            {dir.label}
                        </TabButton>
                    ))}
                </div>

                {/* 입력 필드 */}
                <div>
                    <InputField
                        id="exchangeAmountInput"
                        label={`환전할 금액 (보유: ${sourceBalanceDisplay})`}
                        type="number"
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        placeholder={`${direction === TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD ? currencyUnit : 'USD'} 금액 입력`}
                        min="0"
                        className="text-lg"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        현재 환율: 1 {currencyUnit} = {conversionRate.toFixed(4)} USD | 1 USD = {(1 / conversionRate).toFixed(2)} {currencyUnit}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                        환전 수수료: {(exchangeFeeRate * 100).toFixed(2)}% (입력 금액 기준)
                    </p>
                </div>

                {/* 결과 표시 */}
                {parseFloat(amountInput) > 0 && calculatedResult && (
                    <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                        <h4 className="text-md font-semibold text-slate-700 mb-2">환전 예상 결과</h4>
                        <div className="flex justify-between"><span>입력 금액:</span> <span className="font-medium">{calculatedResult.inputAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {calculatedResult.sourceCurrency}</span></div>
                        <div className="flex justify-between"><span>수수료 ({(exchangeFeeRate * 100).toFixed(2)}%):</span> <span className="font-medium text-red-500">- {calculatedResult.feeAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {calculatedResult.sourceCurrency}</span></div>
                        <hr className="my-1.5 border-slate-300" />
                        <div className="flex justify-between"><span>실제 환전 적용 금액:</span> <span className="font-medium">{calculatedResult.netAmountToConvert?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {calculatedResult.sourceCurrency}</span></div>
                        <div className="flex justify-between text-base mt-1"><strong>최종 수령액 ({calculatedResult.targetCurrency}):</strong> <strong className={direction === TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD ? 'text-green-600' : 'text-indigo-700'}>{calculatedResult.finalReceivedAmount?.toLocaleString(undefined, { maximumFractionDigits: 2 })} {calculatedResult.targetCurrency}</strong></div>
                        {calculatedResult.errorMsg && !calculatedResult.canExchange && <p className="text-xs text-red-500 mt-2 text-center">{calculatedResult.errorMsg}</p>}
                    </div>
                )}

                {/* 에러 메시지 */}
                {errorMessage && <Alert type="error" message={errorMessage} className="mt-2" />}

                {/* 버튼 */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-slate-200 mt-6">
                    <Button onClick={onClose} variant="secondary" color="gray" className="w-full sm:w-auto">취소</Button>
                    <Button
                        onClick={handleSubmit}
                        color="blue"
                        icon={ArrowRightLeft}
                        className="w-full sm:w-auto"
                        disabled={!calculatedResult.canExchange || parseFloat(amountInput) <= 0}
                    >
                        환전 실행
                    </Button>
                </div>

            </div>
        </Modal>
    );
};

export default ExchangeModal;
