// src/pages/bank/components/LoanList.jsx
import React from 'react';
import { Card } from '../../../components/ui';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// currencyUnit prop 추가
function LoanList({ loanProducts = [], currentRateModifiers, currencyUnit }) {
    // const weeklyLoanModifier = currentRateModifiers?.loanRateModifier ?? 0;

    const displayCurrency = currencyUnit || '단위'; // currencyUnit이 없을 경우 기본값 '단위' 사용

    return (
        <Card title="대출 상품 안내" icon={InformationCircleIcon} titleColor="text-red-700">
            {loanProducts && loanProducts.length > 0 ? (
                <div className="space-y-3">
                    {loanProducts.filter(p => p.active).map(p => ( // 활성화된 상품만 필터링
                        <div key={p.id} className="p-3 border rounded-lg shadow-sm bg-slate-50 hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-red-800">{p.label || `${p.days}일 대출`}</h4>
                            <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                                <p><strong>• 기간:</strong> {p.days}일</p>
                                {/* ✨ 필드명 p.annualRate에서 p.periodRate로 수정 및 표시 형식 개선 */}
                                <p><strong>• 해당 기간 금리:</strong>
                                    <span className="font-bold text-red-700">
                                        {(p.periodRate ?? 0).toFixed(2)}%
                                    </span>
                                </p>
                                <p>
                                    <strong>• 필요 신용:</strong>
                                    {p.minCreditScore === null || p.minCreditScore === undefined
                                        ? '-'
                                        : `${p.minCreditScore}점 이상`}
                                </p>
                                {p.maxLoanAmount !== null && p.maxLoanAmount !== undefined && (
                                    <p><strong>• 개인 최대 대출액:</strong> {p.maxLoanAmount.toLocaleString()} {displayCurrency}</p>
                                )}
                                <p>
                                    <strong>• 상품 조건:</strong>
                                    {p.maxLoanProductLimit !== null && p.maxLoanProductLimit !== undefined
                                        ? `최대 ${p.maxLoanProductLimit.toLocaleString()} ${displayCurrency} 상품`
                                        : '상품 한도 없음'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-center text-slate-500 py-4">이용 가능한 대출 상품이 없습니다.</p>
            )}
        </Card>
    );
}

export default LoanList;