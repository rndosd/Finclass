// src/pages/stock/components/TopMoversDashboard.jsx
import React, { useMemo } from 'react';
import { useStockContext } from '../../../contexts/StockContext';
import { Card, Spinner } from '../../../components/ui'; // 경로 확인
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

// 개별 Top Stock 아이템을 위한 컴포넌트
const TopStockItem = ({ rank, stock, isGainer }) => {
    const colorClass = isGainer ? 'text-green-600' : 'text-red-600';
    const Icon = isGainer ? TrendingUp : TrendingDown;

    return (
        <li className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-50 rounded-md transition-colors duration-150">
            <div className="flex items-center min-w-0">
                <span className={`text-xs font-semibold ${isGainer ? 'text-green-500' : 'text-red-500'} w-6 text-center mr-2`}>{rank}.</span>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate" title={stock.companyName}>
                        {stock.companyName}
                    </p>
                    <p className="text-xs text-slate-500">{stock.symbol}</p>
                </div>
            </div>
            <div className={`flex items-center text-sm font-bold ${colorClass} ml-2 whitespace-nowrap`}>
                <Icon className="h-4 w-4 mr-1 opacity-80" strokeWidth={2.5} />
                {stock.changePercent > 0 && '+'}{stock.changePercent.toFixed(2)}%
            </div>
        </li>
    );
};

const TopMoversDashboard = ({ isLoadingData, allStockSymbols = [] }) => {
    const { allPrices } = useStockContext();

    const { topGainers, topLosers } = useMemo(() => {
        if (isLoadingData || Object.keys(allPrices).length === 0 || allStockSymbols.length === 0) {
            return { topGainers: [], topLosers: [] };
        }

        const indicesSymbols = ["^GSPC", "^IXIC", "^DJI", "^RUT", "^VIX"]; // 지수는 TOP 리스트에서 제외
        const stockListWithChange = allStockSymbols
            .filter(item => item && item.symbol && !indicesSymbols.includes(item.symbol) && !item.isIndex)
            .map(item => {
                const priceData = allPrices[item.symbol];
                if (!priceData || typeof priceData.current !== 'number' || typeof priceData.previousClose !== 'number' || priceData.previousClose === 0) {
                    return null;
                }
                const changePercent = ((priceData.current - priceData.previousClose) / priceData.previousClose) * 100;
                return { ...item, changePercent };
            })
            .filter(item => item && isFinite(item.changePercent));

        stockListWithChange.sort((a, b) => b.changePercent - a.changePercent);

        const gainers = stockListWithChange.slice(0, 3);
        // 하락률 TOP은 실제 하락한 (changePercent < 0) 종목 중에서, 하락률이 큰 순서 (원래 배열의 끝에서부터)
        const losers = stockListWithChange.filter(s => s.changePercent < 0).reverse().slice(0, 3);


        return { topGainers: gainers, topLosers: losers };

    }, [allPrices, isLoadingData, allStockSymbols]);

    if (isLoadingData && topGainers.length === 0 && topLosers.length === 0) {
        return (
            <div className="mb-6 p-4 text-center">
                <Spinner />
                <p className="text-sm text-slate-500 mt-2">시장 동향 정보 로딩 중...</p>
            </div>
        );
    }

    // 유효한 TOP 정보가 하나도 없을 경우 (예: 모든 주식이 보합)
    if (topGainers.length === 0 && topLosers.length === 0) {
        return (
            <Card className="mb-6 p-4 sm:p-5 bg-white shadow-md text-center border border-slate-200">
                <div className="flex items-center justify-center text-slate-500">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <p className="text-sm">현재 시장에서 두드러진 상승 또는 하락 종목이 없습니다.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="mb-6 p-4 sm:p-5 bg-white shadow-xl border border-slate-200 rounded-xl"> {/* 그림자 및 테두리 강화 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4"> {/* gap 조정 */}
                {/* 상승률 TOP 3 */}
                <div>
                    <h4 className="text-md font-bold text-green-600 mb-2.5 flex items-center border-b border-green-200 pb-2">
                        <TrendingUp className="h-5 w-5 mr-2" strokeWidth={2.5} />상승률 TOP
                    </h4>
                    {topGainers.length > 0 ? (
                        <ul className="space-y-1">
                            {topGainers.map((stock, index) => (
                                <TopStockItem key={stock.symbol} rank={index + 1} stock={stock} isGainer={true} />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-slate-400 py-3 text-center">상승 종목 없음</p>
                    )}
                </div>

                {/* 하락률 TOP 3 */}
                <div>
                    <h4 className="text-md font-bold text-red-600 mb-2.5 flex items-center border-b border-red-200 pb-2">
                        <TrendingDown className="h-5 w-5 mr-2" strokeWidth={2.5} />하락률 TOP
                    </h4>
                    {topLosers.length > 0 ? (
                        <ul className="space-y-1">
                            {topLosers.map((stock, index) => (
                                <TopStockItem key={stock.symbol} rank={index + 1} stock={stock} isGainer={false} />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-slate-400 py-3 text-center">하락 종목 없음</p>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default TopMoversDashboard;