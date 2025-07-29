import React, { useEffect, useState } from 'react';
import { InputField, Button } from '../../../components/ui';
import StockListItem from './StockListItem';
import TopMoversDashboard from './TopMoversDashboard'; // ⭐ import 추가
import { Search, Filter as FilterIcon } from 'lucide-react';

const StockMarketDisplay = ({
    categories = [],
    currentCategory,
    onSelectCategory,
    searchTerm,
    onSearchChange,
    stocksToDisplay = [],
    isLoadingData,
    onOpenBuyModal,
    onOpenChartModal,
    onOpenStockInfoModal,
    currencyUnit,
    topMoversData, // ⭐ 새로운 prop
    showTopMovers,  // ⭐ 새로운 prop
}) => {
    // lastNonEmptyStocks 관련 로직은 이제 TopMovers와 관련 없으므로, 필요 시 단순화하거나 유지할 수 있습니다.
    // 여기서는 주식 목록 표시에만 사용되므로 그대로 둡니다.
    const [lastNonEmptyStocks, setLastNonEmptyStocks] = useState([]);
    useEffect(() => {
        if (stocksToDisplay.length > 0) {
            setLastNonEmptyStocks(stocksToDisplay);
        }
    }, [stocksToDisplay]);

    const displayStocks = stocksToDisplay.length > 0 ? stocksToDisplay : (isLoadingData ? lastNonEmptyStocks : []);
    const showEmptyMessage = !isLoadingData && displayStocks.length === 0;

    return (
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">
                주식 거래소 <span className="text-base font-normal text-slate-500">(미국 장 마감 기준 시세)</span>
            </h1>

            {/* 검색 및 카테고리 필터 영역 */}
            <div className="mb-6 p-4 sm:p-5 bg-white rounded-xl shadow-lg border border-slate-200">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative w-full sm:w-auto sm:flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <InputField
                            id="stock-search-in-marketdisplay"
                            type="text"
                            placeholder="종목 심볼 또는 이름 검색"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="pl-10 !py-2.5 text-sm"
                        />
                    </div>
                    <div className="flex-grow sm:flex-grow-0 overflow-x-auto pb-1 w-full sm:w-auto">
                        <div className="flex gap-2">
                            {categories.map(catName => (
                                <Button
                                    key={catName}
                                    onClick={() => { onSelectCategory(catName); onSearchChange(""); }}
                                    variant={currentCategory === catName && !searchTerm ? 'primary' : 'secondary'}
                                    size="sm"
                                    className="whitespace-nowrap"
                                >
                                    {catName}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ⭐ 시작: 렌더링 로직 수정 */}
            <div className="space-y-5">
                {/* '전체' 카테고리이고 검색어가 없을 때만 TopMovers 대시보드 표시 */}
                {showTopMovers && topMoversData && (
                    <TopMoversDashboard
                        isLoadingData={topMoversData.isLoadingData}
                        allStockSymbols={topMoversData.allStockSymbols}
                    />
                )}

                {/* 주식 목록 그리드 */}
                {showEmptyMessage ? (
                    <div className="text-center py-10 text-slate-500 bg-white rounded-xl shadow p-6 border">
                        <FilterIcon className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <p className="font-semibold">표시할 주식이 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {displayStocks.map((stockItem) => (
                            <StockListItem
                                key={stockItem.symbol}
                                stockItem={stockItem}
                                onOpenBuyModal={onOpenBuyModal}
                                onOpenChartModal={onOpenChartModal}
                                onOpenStockInfoModal={onOpenStockInfoModal}
                                currencyUnit={currencyUnit}
                            />
                        ))}
                    </div>
                )}
            </div>
            {/* ⭐ 끝: 렌더링 로직 수정 */}
        </div>
    );
};

export default StockMarketDisplay;