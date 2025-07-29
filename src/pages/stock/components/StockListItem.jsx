// src/pages/stock/components/StockListItem.jsx
import React from 'react';
import { Button } from '../../../components/ui';
import {
    DollarSign,
    BarChart3,
    Info as InformationCircleIcon,
    TrendingUp,
    TrendingDown,
    Minus, // 또는 MinusCircle을 import 했다면 그것으로 대체
    Building2
} from 'lucide-react';

const StockListItem = ({ stockItem, onOpenBuyModal, onOpenChartModal, onOpenStockInfoModal }) => {
    const { symbol, companyName, priceData, isIndex = false, unit = '' } = stockItem;
    const currentPrice = priceData?.current;
    const prevClose = priceData?.previousClose;

    let priceDisplay = "시세 정보 없음";
    let diffDisplay = null; // 등락 정보를 담을 JSX 변수
    let changeColor = 'text-slate-700'; // 기본값

    if (typeof currentPrice === 'number' && !isNaN(currentPrice)) {
        priceDisplay = currentPrice.toFixed(2);
        if (unit && isIndex) { // 지수이고 단위가 명시된 경우
            priceDisplay += ` ${unit}`;
        } else if (!isIndex) { // 지수가 아니면 USD
            priceDisplay += " USD";
        }
        // (캐시) 표시는 필요시 priceData.source를 보고 추가

        if (typeof prevClose === 'number' && !isNaN(prevClose)) {
            const diffValue = currentPrice - prevClose;
            let TrendIconToUse = Minus; // 기본 등락 아이콘

            if (prevClose > 0) {
                const dailyRateValue = (diffValue / prevClose) * 100;
                if (diffValue > 0.0001) { changeColor = 'text-red-500'; TrendIconToUse = TrendingUp; }
                else if (diffValue < -0.0001) { changeColor = 'text-blue-500'; TrendIconToUse = TrendingDown; }
                else { changeColor = 'text-slate-500'; }

                diffDisplay = (
                    <>
                        <TrendIconToUse className={`h-4 w-4 mr-1 flex-shrink-0 ${changeColor === 'text-slate-700' ? 'opacity-50' : ''}`} />
                        {diffValue >= 0 ? '+' : ''}{diffValue.toFixed(2)}
                        {!isIndex && !unit && " USD"}
                        {isIndex && unit && ` ${unit}`}
                        {` (${dailyRateValue.toFixed(2)}%)`}
                    </>
                );
            } else if (prevClose === 0 && currentPrice > 0) { // 신규 상장 등
                changeColor = 'text-red-500';
                TrendIconToUse = TrendingUp;
                diffDisplay = (
                    <>
                        <TrendIconToUse className="h-4 w-4 mr-1 flex-shrink-0" />
                        {currentPrice >= 0 ? '+' : ''}{currentPrice.toFixed(2)}
                        {!isIndex && !unit && " USD"}
                        {isIndex && unit && ` ${unit}`}
                        {" (기준가 없음)"}
                    </>
                );
            }
        }
    } else if (typeof currentPrice === 'string' && currentPrice.includes("오류")) {
        priceDisplay = currentPrice; // "URL오류", "API오류" 등
        changeColor = 'text-orange-500';
        diffDisplay = <InformationCircleIcon className={`h-4 w-4 mr-1 flex-shrink-0 ${changeColor}`} />;
    } else if (currentPrice === "캐시없음" || currentPrice === "정보없음" || currentPrice === "시세확인중...") {
        priceDisplay = currentPrice;
        changeColor = 'text-slate-500';
    }


    const canTrade = !isIndex && typeof currentPrice === 'number' && currentPrice > 0;
    const canShowInfo = !isIndex;

    return (
        <div className={`p-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200 border flex flex-col h-full ${isIndex ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <div
                    onClick={() => canShowInfo && onOpenStockInfoModal(symbol)}
                    className={`${canShowInfo ? 'cursor-pointer group' : ''} flex-grow mr-2 min-w-0`}
                    title={canShowInfo ? `${symbol} (${companyName || '정보없음'}) 상세 정보 보기` : `${companyName || symbol}`}
                >
                    <h3 className={`font-semibold text-lg group-hover:underline ${isIndex ? 'text-blue-700' : 'text-indigo-700 group-hover:text-indigo-800'}`}>
                        {isIndex ? companyName : symbol}
                        {isIndex && <span className="text-xs font-normal text-slate-500 ml-1">({symbol})</span>}
                    </h3>
                    {!isIndex && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate" title={companyName || symbol}>
                            {companyName || symbol}
                        </p>
                    )}
                    <p className="text-sm text-slate-800 mt-1 font-medium">
                        {priceDisplay}
                    </p>
                </div>
                <Button
                    onClick={() => onOpenChartModal(symbol, '7d')}
                    variant="outline"
                    color={isIndex ? "blue" : "slate"}
                    size="xs"
                    icon={BarChart3}
                    className="flex-shrink-0 !shadow-none"
                >
                    차트
                </Button>
            </div>

            {diffDisplay && (
                <p className={`text-xs font-medium ${changeColor} mb-3 flex items-center`}>
                    {diffDisplay}
                </p>
            )}

            <div className="mt-auto">
                {!isIndex ? (
                    <Button
                        onClick={() => onOpenBuyModal(symbol, companyName, currentPrice)}
                        color="indigo"
                        className="w-full"
                        icon={DollarSign}
                        disabled={!canTrade}
                    >
                        매수하기
                    </Button>
                ) : (
                    <div className="text-center text-xs text-blue-600 py-2 h-[34px] bg-blue-100 rounded-md flex items-center justify-center">
                        주요 시장 지수
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockListItem;