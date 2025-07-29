// src/pages/bank/tabs/BankDepositTab.jsx
import React, { useEffect } from 'react';
import DepositList from '../components/DepositList';
import { Card, InputField, SelectField, Button } from '../../../components/ui';
import { PlusCircleIcon, ListBulletIcon } from '@heroicons/react/24/outline';

function BankDepositTab({
    isMyBankPage,
    bankSettings,
    depositAmount,
    setDepositAmount,
    selectedDepositProductId,
    setSelectedDepositProductId,
    handleOpenDepositConfirmModal, // from useDepositActions
    setShowDepositHistoryModal,
    studentInfo,
    isTeacher,
    currencyUnit,
    currentRateModifiers,   // DepositList 및 DepositConfirmationModal 표시에 사용
    studentTierName,        // useDepositActions가 내부적으로 사용 (Bank.jsx에서 전달)
    isSubmitting,           // 예금 신청 버튼 로딩 상태 (Bank.jsx에서 전달)
}) {
    useEffect(() => {
        if (bankSettings) {
            console.log("[BankDepositTab] Received bankSettings prop:", JSON.parse(JSON.stringify(bankSettings || null)));
            console.log("[BankDepositTab] bankSettings.depositProducts:", JSON.parse(JSON.stringify(bankSettings.depositProducts || null)));
            console.log("[BankDepositTab] bankSettings.bankTierRateAdjustments (for context):", JSON.parse(JSON.stringify(bankSettings.bankTierRateAdjustments || null)));
        } else {
            console.log("[BankDepositTab] Received bankSettings prop: null or undefined");
        }
        // studentTierName과 currentRateModifiers도 필요시 여기서 로깅하여 확인 가능
        console.log("[BankDepositTab] studentTierName:", studentTierName);
        console.log("[BankDepositTab] currentRateModifiers:", JSON.parse(JSON.stringify(currentRateModifiers || null)));

    }, [bankSettings, studentTierName, currentRateModifiers]);

    if (!isMyBankPage) {
        return (
            <div className="text-center text-slate-500 py-4 bg-white rounded-lg shadow p-6">
                <p>다른 사용자의 계좌에서 예금 신청을 할 수 없습니다.</p>
            </div>
        );
    }

    // ✨ 현재 활성화된 예금 상품 목록 (BankLoanTab과 동일한 로직)
    const activeDepositProducts = bankSettings?.depositProducts?.filter(p => p.active) || [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DepositList
                    depositProducts={activeDepositProducts} // ✨ 활성화된 상품 목록 전달
                    currentRateModifiers={currentRateModifiers}
                    currencyUnit={currencyUnit}
                />
                <Card title="예금 상품 가입" icon={PlusCircleIcon} titleColor="text-green-700" className="bg-green-50/50 border-green-200">
                    <div className="space-y-4 flex-grow flex flex-col">
                        <InputField
                            id="depositAmount"
                            label={`예금액 (${currencyUnit})`}
                            type="number"
                            value={depositAmount}
                            onChange={e => {
                                const inputValue = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                                const selectedProduct = activeDepositProducts.find(p => p.id === selectedDepositProductId);
                                const maxAmount = selectedProduct?.maxDepositAmount ?? Infinity;
                                setDepositAmount(inputValue > maxAmount ? maxAmount : inputValue);
                            }}
                            min="1"
                            max={(() => {
                                const selectedProduct = activeDepositProducts.find(p => p.id === selectedDepositProductId);
                                return selectedProduct?.maxDepositAmount ?? undefined;
                            })()}
                            placeholder={`예금할 금액 (${currencyUnit})`}
                            disabled={activeDepositProducts.length === 0}
                        />
                        <SelectField
                            id="depositProductSelect"
                            label="예금 상품 선택"
                            value={selectedDepositProductId}
                            onChange={e => setSelectedDepositProductId(e.target.value)}
                            disabled={activeDepositProducts.length === 0} // ✨ 활성화된 상품 기준
                        >
                            {activeDepositProducts.length === 0 ? (
                                <option value="">선택 가능한 상품이 없습니다.</option>
                            ) : (
                                <option value="">-- 상품 선택 --</option>
                            )}
                            {activeDepositProducts.map(p => ( // ✨ 활성화된 상품 기준
                                <option key={p.id} value={p.id}>
                                    {`${p.label}`}
                                </option>
                            ))}
                        </SelectField>
                        <div className="mt-auto pt-4 space-y-3">
                            <Button
                                onClick={handleOpenDepositConfirmModal}
                                disabled={!selectedDepositProductId || Number(depositAmount) <= 0 || activeDepositProducts.length === 0 || isSubmitting} // ✨ isSubmitting 추가
                                color="green"
                                className="w-full"
                                icon={PlusCircleIcon}
                                isLoading={isSubmitting} // ✨ isSubmitting prop으로 로딩 상태 표시
                            >
                                예금 신청하기
                            </Button>
                            {(isMyBankPage || isTeacher) && (
                                <Button
                                    onClick={() => setShowDepositHistoryModal(true)}
                                    variant="tertiary"
                                    color="green"
                                    size="sm"
                                    className="w-full mt-2"
                                    icon={ListBulletIcon}
                                >
                                    {isMyBankPage ? "나의" : `${studentInfo?.name || '학생'}님`} 예금 내역 보기
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default BankDepositTab;