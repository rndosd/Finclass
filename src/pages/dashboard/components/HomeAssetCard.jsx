// src/pages/dashboard/components/HomeAssetCard.jsx

import React, { useState, useMemo } from 'react';
import { Button, Card } from '../../../components/ui';
import AssetDetailModal from '../modals/AssetDetailModal';
import { Briefcase, ArrowRightCircle, CircleDollarSign } from 'lucide-react'; // 아이콘 추가

// recharts 관련 import (이 카드에서는 사용하지 않으므로 제거 가능)
// import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const HomeAssetCard = ({ jobTitle, salary, assets, currencyUnit }) => {
    const [showDetailModal, setShowDetailModal] = useState(false);

    const cash = assets?.cash ?? 0;
    const stockValue = assets?.stockValue?.value ?? 0
    const deposit = assets?.deposit ?? 0;
    const loan = assets?.loan ?? 0;

    const totalAssets = cash + stockValue + deposit - loan;

    return (
        <>
            <Card className="flex flex-col h-full bg-white shadow-lg border border-slate-200">
                {/* 헤더 */}
                <Card.Header>
                    <Card.Title className="text-base font-bold text-slate-700">
                        💰 총 자산 현황
                    </Card.Title>
                </Card.Header>

                {/* 콘텐츠: '총 자산' 금액 강조 */}
                <Card.Content className="flex-grow flex flex-col items-center justify-center text-center p-6">
                    <p className="text-sm text-slate-500">현재 총 자산</p>
                    <p className="text-5xl font-extrabold text-indigo-600 my-2">
                        {totalAssets.toLocaleString()}
                        <span className="text-3xl font-semibold ml-1">{currencyUnit}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">(현금+주식+예금-대출)</p>
                </Card.Content>

                {/* ⭐ 푸터: Flexbox를 사용하여 정보와 버튼을 양쪽으로 분리 */}
                <Card.Footer className="flex items-center justify-between p-4 bg-slate-50/50 border-t">
                    {/* 왼쪽: 직업 및 월급 정보 */}
                    <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Briefcase className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{jobTitle || '직업 없음'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                            <CircleDollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">월급: {salary?.toLocaleString() || 0} {currencyUnit}</span>
                        </div>
                    </div>

                    {/* 오른쪽: 자산 상세 보기 버튼 (작게) */}
                    <Button
                        size="sm"
                        variant="secondary" // 덜 강조되는 스타일
                        onClick={() => setShowDetailModal(true)}
                        className="flex-shrink-0 ml-2" // 내용이 길어져도 줄어들지 않도록
                    >
                        상세 보기
                        <ArrowRightCircle className="h-4 w-4 ml-1.5" />
                    </Button>
                </Card.Footer>
            </Card>

            {/* 자산 상세 보기 모달 렌더링 */}
            {showDetailModal && (
                <AssetDetailModal
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    assetDetail={{
                        cash,
                        stockValue: assets?.stockValue ?? { value: 0, usdValue: 0 }, // ✅ 객체로!
                        deposit,
                        loan
                    }}
                    currencyUnit={currencyUnit}
                />
            )}
        </>
    );
};

export default HomeAssetCard;