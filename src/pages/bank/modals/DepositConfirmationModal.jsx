// src/pages/bank/modals/DepositConfirmationModal.jsx
import React from 'react';
import { Modal, Button, Card } from '../../../components/ui'; // Badge는 현재 코드에서 사용 안 함
import { CheckCircleIcon, BanknotesIcon, StarIcon } from '@heroicons/react/24/outline';

export default function DepositConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    product,
    depositAmount,
    studentCreditInfo, // { tierFullName, mainTierName }
    rateModifiers,      // { depositRateModifier } - 주간 보정치 표시용
    finalCalculations,  // ★★★ 여기에 이미 최종 계산된 값들이 들어있음 ★★★
    currencyUnit,
    isSubmitting, // (Bank.jsx에서 추가적으로 전달받을 수 있는 로딩 상태)
}) {
    if (!isOpen) return null;

    // finalCalculations 객체 및 내부 속성 안전하게 접근
    const {
        baseInterestAmount = 0,     // 기본 이율로 계산된 이자
        tierBonusInterestAmount = 0, // 티어 보너스로 인한 추가 이자
        totalEstimatedInterest = 0, // 최종 예상 이자 (기본 + 티어보너스)
        finalPeriodRate = 0         // 최종 적용될 기간 이율 (기본 이율 + 총 티어 보정 %p)
    } = finalCalculations || {};

    const productName = product?.label || "정보 없음";
    const productDays = product?.days || 0;
    const productBaseRate = product?.rate ?? 0;

    const displayTierFullName = studentCreditInfo?.tierFullName || "기본 등급";

    // 주간 보정치 (%p) - 표시용
    const weeklyDepositModifier = rateModifiers?.depositRateModifier ?? 0;
    // 상품 기간에 따른 총 적용된 보정치 (%p) - 표시용
    // (finalPeriodRate - productBaseRate) 로도 계산 가능하지만, 명시적으로 계산해서 표시
    const totalTierRateModifierApplied = parseFloat((finalPeriodRate - productBaseRate).toFixed(4));


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="💰 예금 신청 확인">
            <div className="space-y-4 text-sm">
                <Card className="bg-indigo-50 border-indigo-200">
                    <h3 className="text-lg font-semibold text-indigo-700 mb-2">{productName}</h3>
                    <p><strong>• 예금액:</strong> {(depositAmount || 0).toLocaleString()} {currencyUnit}</p>
                    <p><strong>• 예금 기간:</strong> {productDays}일</p>
                </Card>

                <Card>
                    <h4 className="text-md font-semibold text-slate-700 mb-2 flex items-center">
                        <BanknotesIcon className="h-5 w-5 mr-1.5 text-green-600" />
                        예상 이자 상세 (기간 내)
                    </h4>
                    <div className="space-y-1 pl-2">
                        <p><strong>• 상품 기본 이율:</strong> {productBaseRate.toFixed(2)}%</p>
                        <p><strong>• 기본 예상 이자:</strong> {baseInterestAmount.toLocaleString()} {currencyUnit}</p>
                        <hr className="my-2" />

                        <div className="flex items-center">
                            <StarIcon className="h-4 w-4 mr-1 text-yellow-500" />
                            <p><strong>신용등급 ({displayTierFullName}):</strong>
                                <span className={`ml-1 font-semibold ${weeklyDepositModifier > 0 ? 'text-green-600' : (weeklyDepositModifier < 0 ? 'text-red-600' : 'text-slate-600')}`}>
                                    주간 보정치: {weeklyDepositModifier >= 0 ? '+' : ''}{weeklyDepositModifier.toFixed(2)}%p
                                </span>
                                {/* 총 적용된 %p 보정치 표시 */}
                                {(totalTierRateModifierApplied !== 0) &&
                                    <span className={`ml-1 font-normal text-xs ${totalTierRateModifierApplied > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        (총 기간 적용: {totalTierRateModifierApplied >= 0 ? '+' : ''}{totalTierRateModifierApplied.toFixed(2)}%p)
                                    </span>
                                }
                            </p>
                        </div>
                        <p className="pl-5"><strong>• 신용등급 추가 이자:</strong>
                            <span className={`font-semibold ${tierBonusInterestAmount > 0 ? 'text-green-600' : (tierBonusInterestAmount < 0 ? 'text-red-600' : 'text-slate-600')}`}>
                                {tierBonusInterestAmount >= 0 ? '+' : ''}{tierBonusInterestAmount.toLocaleString()} {currencyUnit}
                            </span>
                        </p>
                        <hr className="my-2" />
                        <p className="text-md font-bold text-indigo-700">
                            <strong>• 최종 적용 (기간)이율:</strong> {finalPeriodRate.toFixed(2)}%
                        </p>
                        <p className="text-md font-bold text-indigo-700">
                            <strong>• 총 예상 이자 (만기 시):</strong> {totalEstimatedInterest.toLocaleString()} {currencyUnit}
                        </p>
                    </div>
                </Card>
                {/* ... (안내 문구) ... */}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>취소</Button>
                <Button color="green" icon={CheckCircleIcon} onClick={onConfirm} disabled={isSubmitting} isLoading={isSubmitting}>
                    예금 신청 확정
                </Button>
            </div>
        </Modal>
    );
}