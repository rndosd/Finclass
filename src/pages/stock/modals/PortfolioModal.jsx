// src/pages/stock/components/modals/PortfolioModal.jsx
import React, { useMemo, useState } from 'react'; // useEffect는 이제 불필요 (또는 다른 용도)
import { useStockContext } from '../../../contexts/StockContext'; // StockContext 훅 import
import { Modal, Button, Badge, Spinner, Tooltip } from '../../../components/ui'; // UI 컴포넌트 경로 확인
import { TrendingUp, TrendingDown, MinusCircle, HelpCircle } from 'lucide-react'; // 아이콘
import dayjs from 'dayjs'; // dayjs import

const PortfolioModal = ({
    isOpen,
    onClose,
    portfolio = {},
    // allPrices는 이제 context에서 가져옴
    conversionRate,
    portfolioValuation,
    isLoadingStockPrices: externalLoading = false,
    onOpenSellModal,
    currencyUnit = "단위" // ★ StockPage로부터 전달받는 currencyUnit
}) => {

    const { allPrices } = useStockContext();

    const portfolioEntries = useMemo(() => {
        console.log("[PortfolioModal] Recalculating portfolioEntries. Global allPrices keys:", Object.keys(allPrices).length);
        if (!portfolio || Object.keys(portfolio).length === 0) {
            return [];
        }
        return Object.entries(portfolio).map(([symbol, stockData]) => {
            const currentPriceData = allPrices[symbol]; // ★ Context의 allPrices 사용
            const currentPriceUSD = (typeof currentPriceData?.current === 'number' && currentPriceData.current > 0)
                ? currentPriceData.current
                : null; // 시세 없으면 null

            const avgPriceUSD = stockData.avgPriceUSD || 0;
            const quantity = stockData.quantity || 0;

            let evalAmountUSD = 0;
            let profitLossUSD = 0;
            let profitRate = 0;
            const priceSource = currentPriceData?.source || 'N/A'; // 시세 출처
            const priceTimestamp = currentPriceData?.timestamp || null; // 시세 타임스탬프

            if (currentPriceUSD !== null && quantity > 0) {
                evalAmountUSD = currentPriceUSD * quantity;
                if (avgPriceUSD > 0) {
                    profitLossUSD = (currentPriceUSD - avgPriceUSD) * quantity;
                    profitRate = (profitLossUSD / (avgPriceUSD * quantity)) * 100;
                } else if (currentPriceUSD > 0) { // 매입가가 0 또는 유효하지 않으나 현재가가 있는 경우
                    profitLossUSD = evalAmountUSD; // 평가액 전체가 수익
                    profitRate = Infinity; // 또는 다른 방식으로 표시 (예: 'N/A' 또는 100% если avgPriceUSD가 0이라면)
                }
            } else if (quantity > 0 && avgPriceUSD > 0) {
                // 현재가 정보는 없지만(null), 보유는 하고 있는 경우
                evalAmountUSD = avgPriceUSD * quantity; // 평가액은 매입가 기준으로
            }

            return {
                ...stockData, // Firestore의 포트폴리오 데이터 (name, quantity, avgPriceUSD 등)
                symbol,
                companyName: stockData.name || symbol,
                currentPriceUSD, // 계산된 현재가 (null일 수 있음)
                evalAmountUSD,
                profitLossUSD,
                profitRate,
                priceSource,    // 시세 출처 (디버깅 또는 UI 표시용)
                priceTimestamp  // 시세 타임스탬프 (디버깅 또는 UI 표시용)
            };
        });
    }, [portfolio, allPrices]); // Context에서 온 allPrices에 의존

    const summary = useMemo(() => {
        console.log("[PortfolioModal] Recalculating summary.");
        let totalInvestedUSD = 0;
        let totalCurrentValueUSD = 0;

        if (portfolioEntries && portfolioEntries.length > 0) {
            portfolioEntries.forEach(item => {
                // item.avgPriceUSD와 item.quantity가 유효한 숫자인지 확인
                totalInvestedUSD += (Number(item.avgPriceUSD) || 0) * (Number(item.quantity) || 0);
                // item.evalAmountUSD는 이미 currentPriceUSD가 null일 경우 avgPriceUSD를 사용하도록 계산됨
                totalCurrentValueUSD += (Number(item.evalAmountUSD) || 0);
            });
        }

        const totalProfitLossUSD = totalCurrentValueUSD - totalInvestedUSD;
        const totalProfitRate = totalInvestedUSD !== 0 ? (totalProfitLossUSD / totalInvestedUSD) * 100 : 0;
        const validConversionRate = (typeof conversionRate === 'number' && conversionRate > 0) ? conversionRate : 1;

        return {
            totalInvestedUSD,
            totalCurrentValueUSD,
            totalProfitLossUSD,
            totalProfitRate,
            totalInvestedLocal: totalInvestedUSD * validConversionRate,
            totalCurrentValueLocal: totalCurrentValueUSD * validConversionRate,
            totalProfitLossLocal: totalProfitLossUSD * validConversionRate,
        };
    }, [portfolioEntries, conversionRate]);

    if (!isOpen) return null;

    // 이제 modalIsLoading은 StockPage에서 전달된 externalLoading (useStockMarketData의 로딩 상태)만 반영
    const modalIsLoading = externalLoading;

    return (
        <Modal isOpen={isOpen} title="💼 내 보유자산 현황" onClose={onClose} size="5xl">
            <div className="space-y-5">
                {/* --- 자산 요약 정보 --- */}
                <div className="p-4 bg-slate-50 rounded-lg shadow-inner">
                    <h3 className="text-lg font-semibold text-slate-700 mb-3">자산 요약 (클라이언트 계산)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                        {/* USD 표시 */}
                        <div>
                            <p className="text-xs text-slate-500 uppercase">총 투자원금 (USD)</p>
                            <p className="text-lg font-semibold text-slate-800">${summary.totalInvestedUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase">총 현재가치 (USD)</p>
                            <p className="text-lg font-semibold text-indigo-600">${summary.totalCurrentValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase">총 평가손익 (USD)</p>
                            <p className={`text-lg font-semibold ${summary.totalProfitLossUSD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {summary.totalProfitLossUSD >= 0 ? '+' : ''}
                                ${summary.totalProfitLossUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase">총 수익률</p>
                            <p className={`text-lg font-semibold ${summary.totalProfitRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {isFinite(summary.totalProfitRate) ? summary.totalProfitRate.toFixed(2) + '%' : 'N/A'}
                            </p>
                        </div>

                        {/* ★★★ 학급 화폐 단위(currencyUnit)로 표시하는 부분 ★★★ */}
                        {typeof conversionRate === 'number' && conversionRate > 0 && (
                            <>
                                <div className="mt-2 md:mt-0">
                                    <p className="text-xs text-slate-500 uppercase">총 현재가치 ({currencyUnit})</p> {/* currencyUnit 사용 */}
                                    <p className="text-lg font-semibold text-indigo-600">
                                        {summary.totalCurrentValueLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencyUnit} {/* currencyUnit 사용 */}
                                    </p>
                                </div>
                                <div className="mt-2 md:mt-0">
                                    <p className="text-xs text-slate-500 uppercase">총 평가손익 ({currencyUnit})</p> {/* currencyUnit 사용 */}
                                    <p className={`text-lg font-semibold ${summary.totalProfitLossLocal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {summary.totalProfitLossLocal >= 0 ? '+' : ''}
                                        {summary.totalProfitLossLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencyUnit} {/* currencyUnit 사용 */}
                                    </p>
                                </div>
                                {/* 총 투자원금 (currencyUnit)도 필요하다면 여기에 추가 */}
                                <div className="mt-2 md:mt-0">
                                    <p className="text-xs text-slate-500 uppercase">총 투자원금 ({currencyUnit})</p>
                                    <p className="text-lg font-semibold text-slate-800">
                                        {summary.totalInvestedLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currencyUnit} {/* currencyUnit 사용 */}
                                    </p>
                                </div>
                            </>
                        )}
                        {/* 서버 계산 값 표시 */}
                        {portfolioValuation && (
                            <div className="col-span-2 md:col-span-full border-t mt-3 pt-3">
                                <p className="text-xs text-slate-500 uppercase flex items-center">
                                    서버 계산 총 주식 가치 (USD)
                                    {portfolioValuation.lastCalculated?.toDate && // toDate() 존재 확인
                                        <span className="ml-1 text-slate-400 text-[10px]"> (기준: {dayjs(portfolioValuation.lastCalculated.toDate()).format('MM/DD HH:mm')}{portfolioValuation.marketCloseDateUsed ? `, ${portfolioValuation.marketCloseDateUsed} 종가` : ''})</span>
                                    }
                                    <Tooltip content="서버에서 주기적으로 현재가를 반영하여 계산된 평가액입니다. 약간의 시간차가 있을 수 있습니다.">
                                        <HelpCircle className="h-3 w-3 text-slate-400 ml-1 cursor-help" />
                                    </Tooltip>
                                </p>
                                <p className="text-md font-medium text-slate-700">${(portfolioValuation.rawValueUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm max-h-[50vh] bg-white">
                    <table className="w-full text-sm text-slate-700">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-3 py-2.5 font-semibold text-left whitespace-nowrap">종목</th>
                                <th scope="col" className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">수량</th>
                                <th scope="col" className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">평단가(USD)</th>
                                <th scope="col" className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">현재가(USD)</th>
                                <th scope="col" className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">평가액(USD)</th>
                                <th scope="col" className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">손익(USD)</th>
                                <th scope="col" className="px-3 py-2.5 font-semibold text-right whitespace-nowrap">수익률(%)</th>
                                <th scope="col" className="px-3 py-2.5 font-semibold text-center whitespace-nowrap">매도</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(modalIsLoading && portfolioEntries.length === 0) && (
                                <tr><td colSpan={8} className="py-10 text-center"><Spinner /> 포트폴리오 정보 로딩 중...</td></tr>
                            )}
                            {(!modalIsLoading && portfolioEntries.length === 0) && (
                                <tr><td colSpan={8} className="py-10 text-center text-slate-500">보유 중인 주식이 없습니다.</td></tr>
                            )}
                            {portfolioEntries.map((item) => {
                                const profitColor = item.profitRate > 0.0001 ? 'text-green-600' : item.profitRate < -0.0001 ? 'text-red-600' : 'text-slate-600';
                                const TrendIconToShow = item.profitRate > 0.0001 ? TrendingUp : item.profitRate < -0.0001 ? TrendingDown : MinusCircle;
                                // 개별 아이템 시세가 아직 로드 안됐는지 판단 (allPrices에 없거나, 또는 전체 로딩 중)
                                const isItemPriceStillLoading = modalIsLoading || !allPrices[item.symbol];

                                return (
                                    <tr key={item.symbol} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2.5 font-medium text-indigo-600 text-left whitespace-nowrap">
                                            <div className="font-semibold">{item.symbol}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-[120px]" title={item.companyName}>{item.companyName}</div>
                                        </td>
                                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{item.quantity.toLocaleString()}</td>
                                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{item.avgPriceUSD?.toFixed(2)}</td>
                                        <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold">
                                            {isItemPriceStillLoading && item.currentPriceUSD === null ? <Spinner size="xs" /> : item.currentPriceUSD !== null ? item.currentPriceUSD.toFixed(2) : <span className="text-xs text-slate-400">N/A</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                            {item.evalAmountUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`px-3 py-2.5 text-right whitespace-nowrap font-medium ${profitColor}`}>
                                            {item.profitLossUSD >= 0 ? '+' : ''}
                                            {item.profitLossUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`px-3 py-2.5 text-right whitespace-nowrap font-medium ${profitColor} flex items-center justify-end gap-0.5`}>
                                            <TrendIconToShow className={`h-3.5 w-3.5 ${profitColor === 'text-slate-600' ? 'opacity-50' : ''}`} />
                                            {isFinite(item.profitRate) ? item.profitRate.toFixed(2) + '%' : 'N/A'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                            <Button
                                                onClick={() => onOpenSellModal(item.symbol, item.companyName, item.quantity, item.currentPriceUSD)}
                                                color="red" variant="outline" size="xs"
                                                disabled={item.quantity <= 0 || item.currentPriceUSD === null || modalIsLoading}
                                            >매도</Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end pt-2">
                    <Button onClick={onClose} variant="secondary" color="gray">닫기</Button>
                </div>
            </div>
        </Modal>
    );
};

export default PortfolioModal;