// src/pages/bank/modals/LoanConfirmationModal.jsx
import React from 'react';
import { Modal, Button, Card } from '../../../components/ui'; // 경로는 실제 프로젝트에 맞게 조정
import { CheckCircleIcon, BanknotesIcon, StarIcon } from '@heroicons/react/24/outline'; // 대출에 어울리는 아이콘 사용

export default function LoanConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    product,                // 선택된 대출 상품 객체
    loanAmount,             // 사용자가 입력한 대출액
    studentCreditInfo,      // 학생 신용 등급 정보 { tierFullName }
    rateModifiers,          // 학생 티어의 주간 대출 이율 보정치 { loanRateModifier }
    finalCalculations,      // 미리 계산된 이자 관련 상세 정보
    currencyUnit,
    isSubmitting,           // 확정 버튼 로딩 상태
}) {
    if (!isOpen) return null;

    // finalCalculations 객체 및 내부 속성 안전하게 접근
    const {
        baseInterestAmount = 0,     // 상품 기본 이율로 계산된 이자
        tierBonusInterestAmount = 0,  // 티어 보너스/패널티로 인한 추가/감소 이자
        totalEstimatedInterest = 0, // 최종 예상 총 이자 (기본 이자 + 티어 영향분)
        finalPeriodRate = 0         // 티어 보정치가 적용된 최종 기간 이율 (%)
    } = finalCalculations || {};

    const productName = product?.label || "정보 없음";
    const productDays = product?.days || 0;
    const productBaseRate = product?.periodRate ?? 0; // 대출 상품의 기본 '기간' 이율

    const displayTierFullName = studentCreditInfo?.tierFullName || "기본 등급";

    // 주간 대출 이율 보정치 (%p) - 표시용
    const weeklyLoanRateModifier = rateModifiers?.loanRateModifier ?? 0;

    // 상품 기간 전체에 적용된 총 %p 보정치 - 표시용
    // (finalPeriodRate - productBaseRate)로 계산하여 표시
    const totalTierRateModifierApplied = parseFloat((finalPeriodRate - productBaseRate).toFixed(4));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="💳 대출 신청 확인">
            <div className="space-y-4 text-sm">
                <Card className="bg-rose-50 border-rose-200"> {/* 대출에 어울리는 색상으로 변경 */}
                    <h3 className="text-lg font-semibold text-rose-700 mb-2">{productName}</h3>
                    <p><strong>• 대출 신청액:</strong> {(loanAmount || 0).toLocaleString()} {currencyUnit}</p>
                    <p><strong>• 대출 기간:</strong> {productDays}일</p>
                </Card>

                <Card>
                    <h4 className="text-md font-semibold text-slate-700 mb-2 flex items-center">
                        <BanknotesIcon className="h-5 w-5 mr-1.5 text-red-600" /> {/* 대출에 어울리는 색상 */}
                        예상 총이자 상세 (기간 내)
                    </h4>
                    <div className="space-y-1 pl-2">
                        <p><strong>• 상품 기본 (기간)이율:</strong> {productBaseRate.toFixed(2)}%</p>
                        <p><strong>• 기본 예상 이자:</strong> {baseInterestAmount.toLocaleString()} {currencyUnit}</p>
                        <hr className="my-2" />

                        <div className="flex items-center">
                            <StarIcon className="h-4 w-4 mr-1 text-yellow-500" />
                            <p><strong>신용등급 ({displayTierFullName}):</strong>
                                <span className={`ml-1 font-semibold ${weeklyLoanRateModifier > 0 ? 'text-red-600' : (weeklyLoanRateModifier < 0 ? 'text-green-600' : 'text-slate-600')}`}>
                                    {/* 대출이므로 보정치가 양수(+)면 사용자에게 불리(빨강), 음수(-)면 유리(초록) */}
                                    주간 보정치: {weeklyLoanRateModifier >= 0 ? '+' : ''}{weeklyLoanRateModifier.toFixed(2)}%p
                                </span>
                                {totalTierRateModifierApplied !== 0 &&
                                    <span className={`ml-1 font-normal text-xs ${totalTierRateModifierApplied > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        (총 기간 적용: {totalTierRateModifierApplied >= 0 ? '+' : ''}{totalTierRateModifierApplied.toFixed(2)}%p)
                                    </span>
                                }
                            </p>
                        </div>
                        <p className="pl-5"><strong>• 신용등급 영향분 (이자):</strong>
                            <span className={`font-semibold ${tierBonusInterestAmount > 0 ? 'text-red-600' : (tierBonusInterestAmount < 0 ? 'text-green-600' : 'text-slate-600')}`}>
                                {/* 대출이므로 추가 이자가 양수(+)면 사용자에게 불리(빨강), 음수(-)면 유리(초록) */}
                                {tierBonusInterestAmount >= 0 ? '+' : ''}{tierBonusInterestAmount.toLocaleString()} {currencyUnit}
                            </span>
                        </p>
                        <hr className="my-2" />
                        <p className="text-md font-bold text-rose-700"> {/* 대출에 어울리는 색상 */}
                            <strong>• 최종 적용 (기간)이율:</strong> {finalPeriodRate.toFixed(2)}%
                        </p>
                        <p className="text-md font-bold text-rose-700"> {/* 대출에 어울리는 색상 */}
                            <strong>• 예상 총 이자 (만기 시):</strong> {totalEstimatedInterest.toLocaleString()} {currencyUnit}
                        </p>
                    </div>
                </Card>

                <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 p-3 rounded-md text-xs">
                    <p><strong>주의:</strong> 위 예상 이자는 현재 신용 등급을 기준으로 계산된 값이며, 실제 대출 기간 중 신용 등급 변동 시 변동된 이율이 일할(또는 주할) 계산되어 최종 이자가 달라질 수 있습니다 (해당 기능 구현 시).</p>
                    <p>대출 신청 내용을 다시 한번 확인하신 후 확정 버튼을 눌러주세요.</p>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>취소</Button>
                <Button color="red" icon={CheckCircleIcon} onClick={onConfirm} disabled={isSubmitting} isLoading={isSubmitting}>
                    {/* 대출에 어울리는 색상 */}
                    대출 신청 확정
                </Button>
            </div>
        </Modal>
    );
}