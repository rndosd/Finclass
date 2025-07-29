import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { generateTimeframeChartData } from '../pages/stock/utils/chartUtils';
import { useUser } from '../contexts/UserContext'; // ✅ 추가

const StockContext = createContext();

export const useStockContext = () => useContext(StockContext);

export const StockProvider = ({ children }) => {
    const { userData, loading: userLoading } = useUser(); // ✅ 사용자 로딩 상태 체크
    const [allPrices, setAllPrices] = useState({});
    const [chartDataMap, setChartDataMap] = useState({});
    const [isDataLoading, setIsDataLoading] = useState(true);

    useEffect(() => {
        if (userLoading || !userData) return; // ✅ 로그인 전에는 실행 안 함

        const fetchStockData = async () => {
            setIsDataLoading(true);
            try {
                // 1. 실시간 가격 요약
                const priceSnapshot = await getDocs(collection(db, 'stockMarketSummary'));
                const prices = {};
                priceSnapshot.forEach(docSnap => {
                    Object.assign(prices, docSnap.data());
                });
                setAllPrices(prices);

                // 2. 차트 요약
                const chartSnapshot = await getDocs(collection(db, 'stockChartSummary'));
                const charts = {};
                chartSnapshot.forEach(docSnap => {
                    Object.assign(charts, docSnap.data());
                });
                setChartDataMap(charts);

            } catch (error) {
                console.error("📉 주식 데이터 로딩 중 오류:", error);
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchStockData();
    }, [userLoading, userData]); // ✅ 의존성에 로그인 상태 포함

    const value = useMemo(() => ({
        allPrices,
        chartDataMap,
        isDataLoading,
    }), [allPrices, chartDataMap, isDataLoading]);

    return (
        <StockContext.Provider value={value}>
            {children}
        </StockContext.Provider>
    );
};
