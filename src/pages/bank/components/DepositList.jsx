// src/pages/bank/components/DepositList.jsx
import React from 'react';
import { Card } from '../../../components/ui';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// currencyUnit prop 추가
function DepositList({ depositProducts = [], currentRateModifiers, currencyUnit }) {
    // console.log("[DepositList] Received currentRateModifiers:", currentRateModifiers);
    // const weeklyDepositModifier = currentRateModifiers?.depositRateModifier ?? 0;

    const displayCurrency = currencyUnit || '단위'; // currencyUnit이 없을 경우 기본값 '단위' 사용

    return (
        <Card title="예금 상품 안내" icon={InformationCircleIcon} titleColor="text-green-700">
            {depositProducts && depositProducts.length > 0 ? (
                <div className="space-y-3">
                    {depositProducts.filter(p => p.active).map(p => (
                        <div key={p.id} className="p-3 border rounded-lg shadow-sm bg-slate-50 hover:shadow-md transition-shadow">
                            <h4 className="font-semibold text-green-800">{p.label || `${p.days}일 예금`}</h4>
                            <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                                <p><strong>• 기간:</strong> {p.days}일</p>
                                <p><strong>• 해당 기간 금리:</strong> <span className="font-bold text-green-700">{p.rate}%</span></p>
                                <p>
                                    <strong>• 예치 조건:</strong>
                                    {p.maxDepositAmount !== null && p.maxDepositAmount !== undefined
                                        ? `최대 ${p.maxDepositAmount.toLocaleString()} ${displayCurrency}까지 예치 가능`
                                        : '한도 없음'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-center text-slate-500 py-4">이용 가능한 예금 상품이 없습니다.</p>
            )}
        </Card>
    );
}

export default DepositList;