import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../../firebase';
import {
    collection,
    getDocs,
    query,
    orderBy
} from 'firebase/firestore';
import { useStockContext } from '../../../contexts/StockContext';

const useStockMarketData = (initialCategory = '') => {
    const {
        allPrices, // ✅ allPrices 그대로 사용!
        isDataLoading: isContextDataLoading
    } = useStockContext();

    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [dynamicAllStocks, setDynamicAllStocks] = useState({});
    const [category, setCategory] = useState(initialCategory);
    const [search, setSearch] = useState('');
    const [stocksToList, setStocksToList] = useState([]);
    const [error, setError] = useState(null);

    const fetchStockCategories = useCallback(async () => {
        setIsLoadingCategories(true);
        setError(null);
        try {
            const catSnap = await getDocs(query(collection(db, 'stockCategories'), orderBy('order', 'asc')));
            const loadedCategories = {};
            let firstCategory = initialCategory || '';

            catSnap.forEach((doc, idx) => {
                const d = doc.data();
                if (d.name && Array.isArray(d.symbols)) {
                    loadedCategories[d.name] = d.symbols;
                    if (idx === 0 && !initialCategory) firstCategory = d.name;
                }
            });

            setDynamicAllStocks(loadedCategories);
            if (!category && firstCategory) {
                setCategory(firstCategory);
            }
        } catch (e) {
            console.error('fetchStockCategories error:', e);
            setError('카테고리를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoadingCategories(false);
        }
    }, [initialCategory, category]);

    useEffect(() => {
        fetchStockCategories();
    }, [fetchStockCategories]);

    const stockItemsToFilter = useMemo(() => {
        const mapItem = (itemFromCategory) => ({
            symbol: itemFromCategory.ticker,
            companyName: itemFromCategory.companyName,
            isIndex: itemFromCategory.isIndex || false,
            unit: itemFromCategory.unit || null
        });

        if (search) {
            return Object.values(dynamicAllStocks).flat()
                .filter(stock => stock.ticker &&
                    (stock.ticker.toLowerCase().includes(search.toLowerCase()) ||
                        stock.companyName?.toLowerCase().includes(search.toLowerCase()))
                )
                .map(mapItem);
        }

        if (category && dynamicAllStocks[category]) {
            return dynamicAllStocks[category]
                .filter(stock => stock.ticker)
                .map(mapItem);
        }

        return [];
    }, [search, category, dynamicAllStocks]);

    useEffect(() => {
        if (isContextDataLoading || isLoadingCategories) {
            setStocksToList([]);
            return;
        }

        if (stockItemsToFilter.length > 0 || search) {
            setStocksToList(stockItemsToFilter.map(item => ({
                ...item,
                priceData: allPrices?.[item.symbol.toUpperCase()] || {
                    current: '정보없음',
                    previousClose: 'N/A',
                    source: '미존재'
                }
            })));
        } else {
            setStocksToList([]);
        }
    }, [allPrices, stockItemsToFilter, search, isLoadingCategories, isContextDataLoading]);

    return {
        dynamicAllStocks,
        category,
        setCategory,
        search,
        setSearch,
        stocksToList,
        isLoading: isContextDataLoading || isLoadingCategories,
        error,
        refetchCategories: fetchStockCategories
    };
};

export default useStockMarketData;
