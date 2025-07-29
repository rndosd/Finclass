// src/pages/bank/tabs/BankLoanTab.jsx
import React, { useEffect } from 'react'; // useState는 이제 이 컴포넌트에서 직접 사용 안 할 수 있음
import LoanList from '../components/LoanList';
// LoanConfirmationModal은 Bank.jsx에서 렌더링하므로 여기서 import 필요 없음
// calculateLoanInterest도 useLoanActions.js에서 사용하므로 여기서 직접 import 필요 없음
import { Card, InputField, SelectField, Button } from '../../../components/ui';
import { PlusCircleIcon, ListBulletIcon } from '@heroicons/react/24/outline';

function BankLoanTab({
    isMyBankPage,
    bankSettings,
    loanAmount,                 // from loanActions state
    setLoanAmount,              // from loanActions state setter
    selectedLoanProductId,      // from loanActions state
    setSelectedLoanProductId,   // from loanActions state setter
    handleOpenLoanConfirmModal, // ✨ useLoanActions에서 오는 함수 (모달 열고 데이터 계산)
    setShowLoanHistoryModal,
    studentInfo,
    isTeacher,
    currencyUnit,
    // creditScore, currentRateModifiers, studentTierName 등은 
    // useLoanActions가 Bank.jsx로부터 직접 받으므로, BankLoanTab이 직접 계산에 사용하지 않는다면 필수는 아님.
    // 단, LoanList 등 자식 컴포넌트에 전달해야 한다면 받아야 함.
    currentRateModifiers,
    isSubmitting,           // from loanActions.isSubmittingLoan
}) {
    useEffect(() => {
        if (bankSettings) {
            console.log("[BankLoanTab] Received bankSettings in useEffect:", JSON.parse(JSON.stringify(bankSettings || null)));
        } else {
            console.log("[BankLoanTab] Received bankSettings in useEffect: null or undefined");
        }
        // console.log("[BankLoanTab] Received studentTierName in useEffect:", studentTierName); // Bank.jsx가 이 prop을 넘긴다면 로깅
    }, [bankSettings /*, studentTierName */]); // studentTierName도 받는다면 의존성 배열에 추가

    const activeLoanProducts = bankSettings?.loanProducts?.filter(p => p.active) || [];

    // selectedLoanProductId를 관리하는 useEffect는 useLoanActions.js로 이동했으므로 여기서 제거
    // 또는 useLoanActions에서 selectedLoanProductId 상태만 받아오고, 초기화 로직은 유지할 수도 있음
    // 여기서는 useLoanActions가 selectedLoanProductId와 그 setter를 모두 제공한다고 가정

    if (!isMyBankPage) {
        return (
            <div className="text-center text-slate-500 py-4 bg-white rounded-lg shadow p-6">
                <p>다른 사용자의 계좌에서 대출 신청을 할 수 없습니다.</p>
            </div>
        );
    }

    // handleOpenLoanConfirmModal 함수 내부의 복잡한 계산 로직은 이제 useLoanActions.js로 이동.
    // 이 컴포넌트는 단순히 props로 받은 함수를 호출.

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LoanList
                    loanProducts={activeLoanProducts}
                    currentRateModifiers={currentRateModifiers}
                    currencyUnit={currencyUnit}
                />
                <Card title="대출 상품 신청" icon={PlusCircleIcon} titleColor="text-red-700" className="bg-red-50/50 border-red-200">
                    <div className="space-y-4 flex-grow flex flex-col">
                        <InputField
                            id="loanAmount"
                            label={`대출액 (${currencyUnit})`}
                            type="number"
                            value={loanAmount}
                            onChange={e => {
                                const inputValue = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                                const selectedProduct = activeLoanProducts.find(p => p.id === selectedLoanProductId);
                                const maxAmount = selectedProduct?.maxLoanProductLimit ?? Infinity;
                                setLoanAmount(inputValue > maxAmount ? maxAmount : inputValue);
                            }}
                            min="1"
                            max={(() => {
                                const selectedProduct = activeLoanProducts.find(p => p.id === selectedLoanProductId);
                                return selectedProduct?.maxLoanProductLimit ?? undefined;
                            })()}
                            placeholder={`대출 신청할 금액 (${currencyUnit})`}
                            disabled={activeLoanProducts.length === 0}
                        />
                        <SelectField
                            id="loanProductSelect"
                            label="대출 상품 선택"
                            value={selectedLoanProductId}
                            onChange={e => setSelectedLoanProductId(e.target.value)}
                            disabled={activeLoanProducts.length === 0}
                        >
                            {activeLoanProducts.length === 0 ? (
                                <option value="">선택 가능한 상품이 없습니다.</option>
                            ) : (
                                <option value="">-- 상품 선택 --</option>
                            )}
                            {activeLoanProducts.map(p => (
                                <option key={p.id} value={p.id}>
                                    {`${p.label}`}
                                </option>
                            ))}
                        </SelectField>
                        <div className="mt-auto pt-4 space-y-3">
                            <Button
                                onClick={handleOpenLoanConfirmModal} // ✨ useLoanActions에서 온 함수 호출
                                disabled={!selectedLoanProductId || Number(loanAmount) <= 0 || activeLoanProducts.length === 0 || isSubmitting}
                                color="red"
                                className="w-full"
                                icon={PlusCircleIcon}
                                isLoading={isSubmitting}
                            >
                                대출 신청하기
                            </Button>
                            {(isMyBankPage || isTeacher) && (
                                <Button
                                    onClick={() => setShowLoanHistoryModal(true)}
                                    variant="tertiary"
                                    color="blue"
                                    size="sm"
                                    className="w-full mt-2"
                                    icon={ListBulletIcon}
                                >
                                    {isMyBankPage ? "나의" : `${studentInfo?.name || '학생'}님`} 대출 내역 보기
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
        // LoanConfirmationModal은 Bank.jsx에서 렌더링하므로 여기서 제거
    );
}

export default BankLoanTab;