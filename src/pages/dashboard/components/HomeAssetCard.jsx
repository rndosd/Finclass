// src/pages/dashboard/components/HomeAssetCard.jsx

import React, { useState } from 'react';
import { Button, Card } from '../../../components/ui';
import AssetDetailModal from '../modals/AssetDetailModal';
import PaySlipModal from '../modals/PaySlipModal';
import { ArrowRightCircle, FileText } from 'lucide-react';

const HomeAssetCard = ({ assets, currencyUnit, userData }) => {
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPaySlipModal, setShowPaySlipModal] = useState(false);

    const cash = assets?.cash ?? 0;
    const stockValue = assets?.stockValue?.value ?? 0;
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

                {/* 푸터: 버튼들만 */}
                <Card.Footer className="flex items-center justify-between p-4 bg-slate-50/50 border-t">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowDetailModal(true)}
                    >
                        자산 상세 보기
                        <ArrowRightCircle className="h-4 w-4 ml-1" />
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPaySlipModal(true)}
                    >
                        급여명세서
                        <FileText className="h-4 w-4 ml-1" />
                    </Button>
                </Card.Footer>
            </Card>

            {/* 자산 상세 보기 모달 */}
            {showDetailModal && (
                <AssetDetailModal
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    assetDetail={{
                        cash,
                        stockValue: assets?.stockValue ?? { value: 0, usdValue: 0 },
                        deposit,
                        loan
                    }}
                    currencyUnit={currencyUnit}
                />
            )}

            {/* 급여 명세서 모달 */}
            {showPaySlipModal && (
                <PaySlipModal
                    isOpen={showPaySlipModal}
                    onClose={() => setShowPaySlipModal(false)}
                    employeeData={userData} // ✅ userData를 employeeData로 전달
                    currencyUnit={currencyUnit}
                />
            )}
        </>
    );
};

export default HomeAssetCard;