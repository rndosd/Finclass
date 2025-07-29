import React, { useState, useEffect, useMemo } from 'react';
import { Modal as GenericModal, Button, InputField } from '../../../components/ui';
import { ReceiptRefundIcon } from '@heroicons/react/24/outline';

export default function RepayModal({
    isOpen,
    onClose,
    loanId,
    loan, // 최신 loans 배열
    studentCashBalance,
    onRepay,
    currencyUnit,
    calculateEarlyRepaymentInterest,
}) {
    const [repayAmountStr, setRepayAmountStr] = useState("");



    useEffect(() => {
        if (isOpen) {
            setRepayAmountStr("");
        }
    }, [isOpen]);

    if (!isOpen || !loan) return null;

    const principalLeft = loan.amountLeft ?? loan.amount ?? 0;

    // ⭐️ 중도상환 이자 재계산 적용 ⭐️
    const interestLeftCurrent = calculateEarlyRepaymentInterest
        ? calculateEarlyRepaymentInterest(loan)
        : (loan.interestLeft ?? loan.interestCalculatedOnRequest ?? 0);

    const totalOwedForThisLoan = principalLeft + interestLeftCurrent;
    const currentCash = studentCashBalance ?? 0;
    const repayAmountNum = Number(repayAmountStr);

    let validationMessage = "";
    let isValidAmount = false;

    if (!repayAmountStr.trim()) {
        // 비어있을 때는 메시지 없음
    } else if (isNaN(repayAmountNum) || repayAmountNum <= 0) {
        validationMessage = "❗ 상환 금액은 0보다 큰 숫자여야 합니다.";
    } else if (repayAmountNum > currentCash) {
        validationMessage = "❗ 현재 현금 잔액보다 많이 상환할 수 없습니다.";
    } else if (repayAmountNum > totalOwedForThisLoan + 0.001) {
        validationMessage = `❗ 입력 금액이 총 상환 필요액(${totalOwedForThisLoan.toLocaleString()} ${currencyUnit})을 초과했습니다.`;
    } else {
        isValidAmount = true;
    }

    const handleRepaySubmit = () => {
        if (!repayAmountStr.trim()) {
            console.warn("RepayModal: 입력 금액이 비어 있음");
            return;
        }

        if (isValidAmount) {
            console.log("RepayModal: onRepay 호출", { loanId: loan.id, amount: repayAmountNum });
            onRepay(loan, repayAmountNum);
        }
    };

    const simulateRepayment = () => {
        if (!repayAmountStr.trim() || isNaN(repayAmountNum) || repayAmountNum <= 0) return null;

        let tempRepayAmount = repayAmountNum;
        let interestToPaySim = interestLeftCurrent;
        let principalToPaySim = principalLeft;

        let paidInterestThisTimeSim = 0;
        let paidPrincipalThisTimeSim = 0;

        if (tempRepayAmount > 0 && interestToPaySim > 0) {
            const paymentForInterest = Math.min(tempRepayAmount, interestToPaySim);
            paidInterestThisTimeSim = paymentForInterest;
            interestToPaySim -= paymentForInterest;
            tempRepayAmount -= paymentForInterest;
        }

        if (tempRepayAmount > 0 && principalToPaySim > 0) {
            const paymentForPrincipal = Math.min(tempRepayAmount, principalToPaySim);
            paidPrincipalThisTimeSim = paymentForPrincipal;
            principalToPaySim -= paymentForPrincipal;
        }

        return (
            <div className="text-xs text-gray-700 space-y-1 mt-3 border-t border-gray-200 pt-3">
                <p className="font-medium">예상 상환 내역 (입력 금액: {repayAmountNum.toLocaleString()} {currencyUnit}):</p>
                <p>→ 이자 상환: <strong className="text-red-600">{paidInterestThisTimeSim.toLocaleString()}</strong> {currencyUnit} (처리 후 남은 이자: {interestToPaySim.toLocaleString()} {currencyUnit})</p>
                <p>→ 원금 상환: <strong className="text-blue-600">{paidPrincipalThisTimeSim.toLocaleString()}</strong> {currencyUnit} (처리 후 남은 원금: {principalToPaySim.toLocaleString()} {currencyUnit})</p>
            </div>
        );
    };

    return (
        <GenericModal onClose={onClose} title={`💸 대출 상환 (${loan.productLabel || `${loan.days}일`})`}>            <div className="mb-4 text-sm bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-1">
            <p>남은 원금: <strong className="text-blue-800">{principalLeft.toLocaleString()}</strong> {currencyUnit}</p>
            <p>남은 이자: <strong className="text-red-700">{interestLeftCurrent.toLocaleString()}</strong> {currencyUnit}</p>
            <p className="font-semibold">총 상환 필요액: <strong>{totalOwedForThisLoan.toLocaleString()}</strong> {currencyUnit}</p>
            <hr className="my-2 border-blue-100" />
            <p>내 현재 현금: <strong>{currentCash.toLocaleString()}</strong> {currencyUnit}</p>
            {repayAmountStr.trim() && !isNaN(repayAmountNum) && repayAmountNum > 0 && simulateRepayment()}
        </div>
            <InputField
                id="repayAmountInputModal"
                label={`상환할 금액 (${currencyUnit})`}
                type="number"
                value={repayAmountStr}
                onChange={e => setRepayAmountStr(e.target.value)}
                placeholder="예: 100"
                min="1"
                className="mb-1"
            />
            {validationMessage && (<p className="text-xs text-red-500 text-center mb-3 h-4">{validationMessage}</p>)}

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <Button onClick={onClose} variant="secondary" color="gray" className="w-full sm:w-auto order-2 sm:order-1">취소</Button>
                <Button
                    onClick={handleRepaySubmit}
                    color="blue"
                    disabled={!isValidAmount || isNaN(repayAmountNum) || repayAmountNum <= 0}
                    className="w-full sm:w-auto flex-grow order-1 sm:order-2"
                    icon={ReceiptRefundIcon}
                >
                    {repayAmountNum > 0 ? `${repayAmountNum.toLocaleString()} ${currencyUnit} 상환 실행` : "상환 실행"}
                </Button>
            </div>
        </GenericModal>
    );
}
