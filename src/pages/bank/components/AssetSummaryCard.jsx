// src/pages/bank/components/AssetSummaryCard.jsx

import React from 'react';
import { Card } from '../../../components/ui'; // 경로는 실제 프로젝트에 맞게 확인
import { WalletIcon, BanknotesIcon, CreditCardIcon, StarIcon, ArrowTrendingUpIcon, TrendingDown } from '@heroicons/react/24/outline';
import { Badge } from '../../../components/ui'; // 뱃지 컴포넌트가 있다고 가정

// 각 자산 항목을 표시하기 위한 작은 헬퍼 컴포넌트
const AssetRow = ({ Icon, iconColor, label, value, currencyUnit, valueColor = 'text-slate-800' }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-200 last:border-b-0">
        <span className={`flex items-center gap-2 text-slate-600`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
            {label}
        </span>
        <span className={`font-semibold text-lg ${valueColor}`}>
            {value.toLocaleString()} {currencyUnit}
        </span>
    </div>
);

function AssetSummaryCard({ studentAssets, creditScore, currentTierInfo, currentRateModifiers, currencyUnit }) {
    // 자산 값 안전 처리
    const cash = studentAssets?.cash ?? 0;
    const deposit = studentAssets?.deposit ?? 0;
    const loan = studentAssets?.loan ?? 0;
    // stockValue는 HomeAssetCard에서처럼 객체 또는 숫자일 수 있으므로 안전하게 처리
    const stockValue = studentAssets?.stockValue?.value ?? studentAssets?.stockValue ?? 0;

    // ⭐ 순자산(총자산) 계산
    const netAssets = cash + deposit + stockValue - loan;

    return (
        <Card title="자산 현황" icon={WalletIcon} titleColor="text-indigo-700" className="h-full flex flex-col">
            {/* 1. 순자산(총자산) 강조 섹션 */}
            <Card.Content className="text-center py-6 bg-slate-50">
                <p className="text-sm text-slate-500">현재 순자산</p>
                <p className="text-4xl font-extrabold text-indigo-600 my-1">
                    {netAssets.toLocaleString()}
                    <span className="text-2xl font-semibold ml-1">{currencyUnit}</span>
                </p>
                <p className="text-xs text-slate-400">(현금+예금+주식-대출)</p>
            </Card.Content>

            {/* 2. 자산 상세 내역 섹션 */}
            <Card.Content className="space-y-1 text-sm pt-4">
                <AssetRow Icon={WalletIcon} iconColor="text-green-500" label="현금" value={cash} currencyUnit={currencyUnit} valueColor="text-green-700" />
                <AssetRow Icon={ArrowTrendingUpIcon} iconColor="text-sky-500" label="주식" value={stockValue} currencyUnit={currencyUnit} />
                <AssetRow Icon={BanknotesIcon} iconColor="text-blue-500" label="예금" value={deposit} currencyUnit={currencyUnit} />
                <AssetRow Icon={CreditCardIcon} iconColor="text-red-500" label="대출" value={loan} currencyUnit={currencyUnit} valueColor="text-red-600" />
            </Card.Content>

            <div className="flex-grow"></div> {/* Spacer */}

            {/* 3. 신용점수 및 이자율 정보 섹션 (Footer 활용) */}
            <Card.Footer className="p-4 bg-slate-50/50 border-t space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-slate-600 flex items-center gap-1.5 font-semibold">
                        <StarIcon className="h-5 w-5 text-amber-500" />
                        신용점수
                    </span>
                    <Badge color={currentTierInfo?.tierColor || 'gray'} size="lg">
                        {currentTierInfo?.tierFullName || "정보 없음"} ({creditScore ?? "-"} 점)
                    </Badge>
                </div>
                {(currentTierInfo?.mainTierName && currentTierInfo.mainTierName !== "정보 없음") && (
                    <div className="text-xs text-slate-500 pt-3 border-t border-slate-200">
                        <p className="font-medium text-slate-600 mb-1">적용 이자율 보정 ({currentTierInfo.mainTierName} 등급):</p>
                        <div className="pl-2 space-y-0.5">
                            <p> • 예금:
                                <span className={`font-semibold ml-1 ${currentRateModifiers.depositRateModifier > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {currentRateModifiers.depositRateModifier >= 0 ? '+' : ''}{(currentRateModifiers.depositRateModifier || 0).toFixed(2)}%p (1주)
                                </span>
                            </p>
                            <p> • 대출:
                                {/* 대출 이자율 보정이 음수(-)이면 학생에게 유리(초록색), 양수(+)이면 불리(빨간색) */}
                                <span className={`font-semibold ml-1 ${currentRateModifiers.loanRateModifier < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {currentRateModifiers.loanRateModifier >= 0 ? '+' : ''}{(currentRateModifiers.loanRateModifier || 0).toFixed(2)}%p (1주)
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </Card.Footer>
        </Card>
    );
}

export default AssetSummaryCard;