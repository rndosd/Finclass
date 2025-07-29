// src/pages/stock/StockPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import Header from '../home/Header'; // StockSidebar 내부에서 처리 가정

import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, // 사용된다면 유지, 아니면 제거
} from 'recharts'; // recharts 설치 및 사용 여부 확인문자열useStockSetting
import { auth, db } from '../../firebase'; // db는 일부 하위 로직에서 아직 사용될 수 있음
import {
    doc, getDoc, setDoc, updateDoc, collection, addDoc, increment,
    serverTimestamp, query, orderBy, writeBatch, Timestamp // getDocs, deleteDoc 등은 서비스/훅으로 이동
} from 'firebase/firestore';

import { useUser } from '../../contexts/UserContext'; // ★ classData, userData 가져오기 위해 사용
import { useStockContext } from '../../contexts/StockContext';
import { useFeedback } from '../../contexts/FeedbackContext';

import AppLayout from '../../components/layout/AppLayout';

// UI 컴포넌트 import
import { Button, Modal, InputField, Spinner, Alert } from '../../components/ui';
import TabButtonOriginal from '../../components/ui/TabButton';
import CustomXAxisTickOriginal from '../../components/ui/CustomXAxisTick';

// 아이콘 import (기존대로 유지)
import {
    Search, Settings2, BarChart3, Briefcase, DollarSign, Repeat, Filter, XCircle,
    ExternalLink, TrendingUp, TrendingDown, Edit2, Info, Building2, Newspaper, Users, Minus, Plus
} from 'lucide-react';

// 커스텀 훅 Import
import useStockSettings from './hooks/useStockSettings';
import useStockUserData from './hooks/useStockUserData';
import useStockMarketData from './hooks/useStockMarketData';

// 서비스 함수 Import
import { executeBuyStock, executeSellStock, executeExchange } from './services/stockTradingService';
// import { updateExchangeRate } from './services/stockAdminService'; // 나중에 Admin 기능 구현 시

// 자식 컴포넌트 Import (기존대로 유지)
import StockSidebar from './components/StockSidebar';
import StockMarketDisplay from './components/StockMarketDisplay';
import TopMoversDashboard from './components/TopMoversDashboard';
import PortfolioModal from './modals/PortfolioModal';
import StockInfoModal from './modals/StockInfoModal';
import ChartModal from './modals/ChartModal';
import BuyStockModal from './modals/BuyStockModal';
import SellStockModal from './modals/SellStockModal';
import ExchangeModal from './modals/ExchangeModal';
import MarketSettingsModal from './modals/MarketSettingsModal';

// 상수 정의 (기존대로 유지)
const GENERIC_FMP_PLACEHOLDER_URL = "YOUR_FMP_FUNCTION_URL_PLACEHOLDER";
const DEFAULT_CATEGORY_NAME = "주요 ETF";

const TabButton = TabButtonOriginal;
const CustomXAxisTick = CustomXAxisTickOriginal;

export default function StockPage({ uid: pageUidFromApp, classId: pageClassIdFromApp }) {
    const {
        userData: contextUserData,
        classData,
        classId: contextClassId,   // ← 컨텍스트에서 classId 가져옴
        loading: userContextLoading
    } = useUser();

    // 라우트-프롭이 없으면 컨텍스트 값 사용
    const effectiveClassId = pageClassIdFromApp || contextClassId;
    const studentName = contextUserData?.name || contextUserData?.displayName || '학생'; // 학생 이름 확보
    const currencyUnit = classData?.currencyUnit || '단위';

    const {
        allPrices,
        dailyPricesFlatMap: contextDerivedFlatMap, // StockContext가 flatMap을 직접 제공한다면
        isDataLoading: isStockContextLoading
    } = useStockContext();

    const {
        conversionRate,
        tradeFeeRate,
        exchangeFeeRate,
        fmpProxyUrl,
        isLoadingSettings,
        errorSettings,
        updateMarketSettings,
        isSubmitting: isSubmittingSettings
    } = useStockSettings(pageClassIdFromApp);

    const {
        authUser, balanceBIL, balanceUSD, portfolio, portfolioValuation,
        isStockAdmin, isLoading: isLoadingStockUser, error: stockUserError,
    } = useStockUserData();

    // ⭐ useStockMarketData 훅 호출 시 로딩 상태 변수명 수정
    const {
        dynamicAllStocks,
        category,
        setCategory,
        search,
        setSearch,
        stocksToList,
        isLoading: isLoadingMarketData, // `isLoading`을 `isLoadingMarketData`라는 이름으로 받음 (또는 원하는 다른 이름)
        error: marketDataError,
        refetchCategories
        // isLoadingCategories는 이제 isLoadingMarketData에 통합되었으므로 직접 받을 필요 없음 (useStockMarketData 내부에서 사용)
    } = useStockMarketData(DEFAULT_CATEGORY_NAME);

    const { showFeedback } = useFeedback();

    // allPrices를 사용하여 거래 함수에 필요한 플랫한 가격 맵 (dailyPricesFlatMap) 생성
    const dailyPricesFlatMap = useMemo(() => {
        const flatMap = {};
        if (allPrices && Object.keys(allPrices).length > 0) {
            for (const symbol in allPrices) {
                const priceData = allPrices[symbol];
                const priceValue = priceData?.current ?? priceData?.price;
                if (typeof priceValue === 'number') {
                    flatMap[symbol.toUpperCase()] = priceValue;
                }
            }
        }
        return flatMap;
    }, [allPrices]);

    const allStockSymbolsForDashboard = useMemo(() => {
        if (!dynamicAllStocks || Object.keys(dynamicAllStocks).length === 0) return [];
        return Object.values(dynamicAllStocks).flat().map(item => ({
            symbol: item.ticker,
            companyName: item.companyName,
            isIndex: item.isIndex || false
        }));
    }, [dynamicAllStocks]);

    // 모달 상태 (기존대로 유지)
    const [chartModal, setChartModal] = useState({ show: false, symbol: null, data: [], timeframe: "7d", isLoading: false, source: null });
    const [stockInfoModal, setStockInfoModal] = useState({ show: false, symbol: null, isLoading: false, activeTab: 'profile' });
    const [buyModalInfo, setBuyModalInfo] = useState({ show: false, symbol: null, companyName: null, currentPriceUSD: 0 });
    const [sellModalInfo, setSellModalInfo] = useState({ show: false, symbol: null, quantityOwned: 0, currentPriceUSD: 0 });
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [showMarketSettingsModal, setShowMarketSettingsModal] = useState(false);
    // const [newConversionRateInput, setNewConversionRateInput] = useState(""); // MarketSettingsModal 내부로 이동 권장

    // 모달 열기/닫기 핸들러 (기존대로 유지, currentPriceUSD 전달 시 dailyPricesFlatMap 활용)
    const openStockInfoModal = useCallback((symbol, initialTab = 'profile') => {
        setStockInfoModal({ show: true, symbol: symbol, activeTab: initialTab, isLoading: true });
    }, []);
    const closeStockInfoModal = useCallback(() => setStockInfoModal({ show: false, symbol: null, activeTab: 'profile', isLoading: false }), []);
    const handleStockInfoTabChange = useCallback((tabId) => setStockInfoModal(prev => ({ ...prev, activeTab: tabId, isLoading: true })), []);

    const openChart = useCallback((symbol, timeframe = '1W') => {
        setChartModal({ show: true, symbol, data: [], timeframe, isLoading: true, source: null });
    }, []);
    const closeChart = useCallback(() => setChartModal(prev => ({ ...prev, show: false, symbol: null, isLoading: false })), []);

    const openBuyModal = useCallback((symbol, companyName) => {
        // 이제 dailyPricesFlatMap은 선언되었으므로 안전하게 접근 가능합니다.
        const price = dailyPricesFlatMap[symbol.toUpperCase()] || 0;
        if (price <= 0) {
            showFeedback("현재가 정보가 없어 매수할 수 없습니다.", 'warning'); return;
        }
        setBuyModalInfo({ show: true, symbol, companyName: companyName || symbol, currentPriceUSD: price });
    }, [dailyPricesFlatMap, showFeedback]);

    const closeBuyModal = useCallback(() => setBuyModalInfo(prev => ({ ...prev, show: false })), []);

    const openSellModal = useCallback((symbol, companyName, quantityOwned) => {
        const price = dailyPricesFlatMap[symbol.toUpperCase()] || 0;
        if (price <= 0) {
            showFeedback("현재가 정보가 없어 매도할 수 없습니다.", 'warning'); return;
        }
        setSellModalInfo({ show: true, symbol, companyName: companyName || symbol, quantityOwned, currentPriceUSD: price });
    }, [dailyPricesFlatMap, showFeedback]);
    // dailyPricesFlatMap 의존성 추가
    const closeSellModal = useCallback(() => setSellModalInfo(prev => ({ ...prev, show: false })), []);

    const handleOpenExchangeModal = () => setShowExchangeModal(true);
    const handleCloseExchangeModal = () => setShowExchangeModal(false);
    const handleOpenMarketSettingsModal = () => setShowMarketSettingsModal(true);
    const handleCloseMarketSettingsModal = () => setShowMarketSettingsModal(false);

    // 실제 액션 실행 핸들러 (서비스 함수 호출)
    const handleExecuteExchange = async (
        directionFromModal, amountFromModal, sourceCurrency, targetCurrency,
        calculatedResultFromModal, conversionRateFromModal
    ) => {
        if (!authUser || !effectiveClassId) { showFeedback("로그인 또는 학급 정보가 필요합니다.", "error"); return; }

        const result = await executeExchange({
            classId: effectiveClassId,
            userId: authUser.uid,
            studentName: studentName, // ★ studentName 전달
            direction: directionFromModal,
            amount: parseFloat(amountFromModal),
            calculatedResult: calculatedResultFromModal,
            conversionRate: conversionRateFromModal, // 모달에서 사용한 환율 (useStockSettings의 conversionRate와 다를 수 있음)
            currencyUnit: currencyUnit // ★ currencyUnit 전달
        });

        if (result.success) {
            showFeedback(result.message, 'success');
            handleCloseExchangeModal();
        } else {
            showFeedback(result.message || "환전 처리 중 오류", 'error');
        }
    };

    const handleExecuteBuyOrder = async (quantity) => {
        if (!authUser || !effectiveClassId) {
            showFeedback("로그인 또는 학급 정보가 필요합니다.", "error");
            return;
        }

        const { symbol, companyName, currentPriceUSD } = buyModalInfo;

        const result = await executeBuyStock({
            classId: effectiveClassId,
            userId: authUser.uid,
            studentName: studentName,
            symbol,
            companyName,
            quantity,
            currentPriceUSD,
            tradeFeeRate,
            conversionRate,
            currencyUnit,
        });

        if (result.success) {
            showFeedback(result.message, 'success');
            closeBuyModal();
        } else {
            showFeedback(result.message || "매수 처리 중 오류", 'error');
        }
    };

    const handleExecuteSellOrder = async (quantityToSell) => {
        if (!authUser || !effectiveClassId) {
            showFeedback("로그인 또는 학급 정보가 필요합니다.", "error");
            return;
        }

        const { symbol, companyName, currentPriceUSD } = sellModalInfo;

        const result = await executeSellStock({
            classId: effectiveClassId,
            userId: authUser.uid,
            studentName: studentName,
            symbol,
            companyName,
            quantityToSell,
            currentPriceUSD,
            tradeFeeRate,
            conversionRate,
            currencyUnit,
        });

        if (result.success) {
            showFeedback(result.message, 'success');
            closeSellModal();
        } else {
            showFeedback(result.message || "매도 처리 중 오류", 'error');
        }
    };

    const handleSaveMarketSettings = async (newSettings) => {
        // ... (기존 로직 유지) ...
        if (!authUser || !isStockAdmin) { showFeedback("권한이 없습니다.", 'error'); return; }
        const result = await updateMarketSettings(newSettings);
        if (result.success) {
            showFeedback(result.message || "시장 설정이 성공적으로 업데이트되었습니다.", 'success');
            handleCloseMarketSettingsModal();
        } else {
            showFeedback(result.message || "시장 설정 업데이트 실패", 'error');
        }
    };

    // --- 로딩 및 오류 처리 (기존 로직 유지) ---
    const pageIsLoading = userContextLoading || isLoadingSettings || isLoadingStockUser || isStockContextLoading || isLoadingMarketData;
    const pageError = errorSettings || stockUserError || marketDataError;

    if (pageIsLoading) { return <div className="flex justify-center items-center min-h-screen"><Spinner size="xl" /> <p className="ml-2">데이터 로딩 중...</p></div>; }
    if (pageError) { return <div className="p-4"><Alert type="error" message={`오류가 발생했습니다: ${pageError}`} /></div>; }
    if (!authUser) { return <div className="p-4"><Alert type="warning" message="로그인이 필요합니다." /></div>; }
    if (!effectiveClassId && !userContextLoading) {
        console.warn("⚠️ classId 정보가 없습니다. 페이지 접근 불가.");
        return <div className="p-4"><Alert type="warning" message="선택된 학급 정보가 없습니다. 학급을 선택해주세요." /></div>;
    }
    console.log("현재 dailyPricesFlatMap:", dailyPricesFlatMap);
    console.log("원본 allPrices:", allPrices);
    // --- JSX 렌더링 (기존 구조 최대한 유지) ---
    // --- AppLayout 적용 ---
    return (
        <AppLayout
            showDefaultHeader={false}
            customSidebar={
                <StockSidebar
                    balanceBIL={balanceBIL}
                    balanceUSD={balanceUSD}
                    conversionRate={conversionRate}
                    isStockAdmin={isStockAdmin}
                    onOpenPortfolioModal={() => setShowPortfolioModal(true)}
                    onOpenExchangeModal={() => setShowExchangeModal(true)}
                    user={authUser}
                    isLoadingUserData={isLoadingStockUser}
                    isLoadingConversionRate={isLoadingSettings}
                    onOpenMarketSettingsModal={() => setShowMarketSettingsModal(true)}
                    currencyUnit={currencyUnit}
                />
            }
        >
            <StockMarketDisplay
                categories={Object.keys(dynamicAllStocks)}
                currentCategory={category}
                onSelectCategory={setCategory}
                searchTerm={search}
                onSearchChange={setSearch}
                stocksToDisplay={stocksToList}
                isLoadingData={isLoadingMarketData}
                onOpenBuyModal={openBuyModal}
                onOpenChartModal={openChart}
                currencyUnit={currencyUnit}

                // ⭐ prop은 태그 안쪽에 작성해야 합니다.
                topMoversData={{
                    isLoadingData: isLoadingMarketData,
                    allStockSymbols: allStockSymbolsForDashboard,
                }}
                // ⭐ TopMoversDashboard를 표시할지 여부도 전달합니다.
                showTopMovers={category === DEFAULT_CATEGORY_NAME && !search}
            />


            {showPortfolioModal && authUser && (
                <PortfolioModal
                    isOpen={showPortfolioModal}
                    onClose={() => setShowPortfolioModal(false)}
                    portfolio={portfolio}
                    allPrices={allPrices}
                    conversionRate={conversionRate}
                    portfolioValuation={portfolioValuation}
                    isLoadingData={isLoadingMarketData}
                    onOpenSellModal={openSellModal}
                    currencyUnit={currencyUnit}
                />
            )}

            {buyModalInfo.show && authUser && (
                <BuyStockModal
                    isOpen={buyModalInfo.show}
                    onClose={() => setBuyModalInfo({ ...buyModalInfo, show: false })}
                    symbol={buyModalInfo.symbol}
                    companyName={buyModalInfo.companyName}
                    currentPriceUSD={buyModalInfo.currentPriceUSD}
                    balanceUSD={balanceUSD}
                    tradeFeeRate={tradeFeeRate}
                    // ⭐ 수정: handleExecuteBuyOrder를 직접 전달
                    onSubmitBuyOrder={handleExecuteBuyOrder}
                    currencyUnit={currencyUnit}
                />
            )}

            {sellModalInfo.show && authUser && (
                <SellStockModal
                    isOpen={sellModalInfo.show}
                    onClose={() => setSellModalInfo({ ...sellModalInfo, show: false })}
                    symbol={sellModalInfo.symbol}
                    companyName={sellModalInfo.companyName}
                    quantityOwned={sellModalInfo.quantityOwned}
                    currentPriceUSD={sellModalInfo.currentPriceUSD}
                    tradeFeeRate={tradeFeeRate}
                    // ⭐ 수정: handleExecuteSellOrder를 직접 전달
                    onSubmitSellOrder={handleExecuteSellOrder}
                    currencyUnit={currencyUnit}
                />
            )}

            {chartModal.show && (
                <ChartModal
                    isOpen={chartModal.show}
                    onClose={closeChart}
                    symbol={chartModal.symbol}
                    initialTimeframe={chartModal.timeframe}  // 선택 시간대 유지
                />
            )}

            {showExchangeModal && authUser && (
                <ExchangeModal
                    isOpen={showExchangeModal}
                    onClose={() => setShowExchangeModal(false)}
                    balanceBIL={balanceBIL}
                    balanceUSD={balanceUSD}
                    conversionRate={conversionRate}
                    exchangeFeeRate={exchangeFeeRate}
                    onSubmitExchange={handleExecuteExchange}
                    currencyUnit={currencyUnit}
                />
            )}

            {showMarketSettingsModal && isStockAdmin && (
                <MarketSettingsModal
                    isOpen={showMarketSettingsModal}
                    onClose={() => setShowMarketSettingsModal(false)}
                    currentSettings={{ conversionRate, tradeFeeRate, exchangeFeeRate, currencyUnit }}
                    onSubmitSettings={updateMarketSettings}
                    isSubmitting={isSubmittingSettings}
                />
            )}



        </AppLayout>
    );
}