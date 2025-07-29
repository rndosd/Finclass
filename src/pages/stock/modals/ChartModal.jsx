// src/pages/stock/modals/ChartModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Spinner } from '../../../components/ui';
import TabButtonOriginal from '../../../components/ui/TabButton';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import { useStockContext } from '../../../contexts/StockContext';
import dayjs from 'dayjs';

const TabButton = TabButtonOriginal;

const TIMEFRAME_OPTIONS = [
    { label: '1주일', value: '1W' },
    { label: '1개월', value: '1M' },
    { label: '3개월', value: '3M' },
    { label: '1년', value: '1Y' },
];

// 잘못된 값이 들어왔을 때 보정
const validTimeframes = ['1W', '1M', '3M', '1Y'];
const normalizeTimeframe = (value) =>
    value === '7d' ? '1W' :
        value === '1mo' ? '1M' :
            value === '3mo' ? '3M' :
                value === '1y' ? '1Y' :
                    validTimeframes.includes(value) ? value : '1W';

const ChartModal = ({ isOpen, onClose, symbol, initialTimeframe = '1W' }) => {
    const { chartDataMap, isChartLoading } = useStockContext();

    const [selectedTimeframe, setSelectedTimeframe] = useState(() => normalizeTimeframe(initialTimeframe));

    useEffect(() => {
        if (isOpen) {
            setSelectedTimeframe(normalizeTimeframe(initialTimeframe));
        }
    }, [isOpen, initialTimeframe]);

    const chartDisplayData = useMemo(() => {
        const raw = chartDataMap?.[symbol]?.[selectedTimeframe] || [];
        console.log('📊 symbol:', symbol);
        console.log('📊 selectedTimeframe:', selectedTimeframe);
        console.log('📊 chartDataMap:', chartDataMap);
        console.log('📊 chartDataMap[symbol]:', chartDataMap?.[symbol]);
        console.log('📊 chartDataMap[symbol][selectedTimeframe]:', raw);
        return raw.map(d => ({
            dateValue: new Date(d.x).getTime?.() || new Date(d.date).getTime?.() || 0,
            price: d.y ?? d.close ?? 0,
        }));
    }, [chartDataMap, symbol, selectedTimeframe]);

    const handleTimeframeChange = (newTimeframe) => setSelectedTimeframe(newTimeframe);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title={`${symbol || ''} 주가 차트`} onClose={onClose} size="3xl">
            <div className="mb-4 flex justify-center space-x-2 border-b pb-3">
                {TIMEFRAME_OPTIONS.map(opt => (
                    <TabButton
                        key={opt.value}
                        isActive={selectedTimeframe === opt.value}
                        onClick={() => handleTimeframeChange(opt.value)}
                    >
                        {opt.label}
                    </TabButton>
                ))}
            </div>

            {isChartLoading && (
                <div className="text-center py-20">
                    <Spinner size="xl" />
                    <p className="mt-3">차트 데이터 로딩 중...</p>
                </div>
            )}

            {!isChartLoading && chartDisplayData.length === 0 && (
                <p className="text-center py-20 text-slate-500">
                    해당 종목 또는 기간의 차트 데이터가 없습니다.
                </p>
            )}

            {!isChartLoading && chartDisplayData.length > 0 && (
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <LineChart
                            data={chartDisplayData}
                            margin={{ top: 5, right: 20, left: -10, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis
                                dataKey="dateValue"
                                type="number"
                                scale="time"
                                domain={['dataMin', 'dataMax']}
                                tickFormatter={(unixTime) => dayjs(unixTime).format('MM/DD')}
                                minTickGap={20}
                                interval="preserveStart"
                                height={50}
                                angle={-15}
                                textAnchor="end"
                                tick={{ fontSize: 12, fill: '#555' }}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                tickFormatter={(value) => new Intl.NumberFormat().format(value)}
                                width={70}
                                tick={{ fontSize: 12, fill: '#555' }}
                            />
                            <Tooltip
                                formatter={(value) => [`${value.toFixed(2)} USD`]}
                                labelFormatter={(label) => dayjs(label).format('YYYY-MM-DD')}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Line
                                type="monotone"
                                dataKey="price"
                                name={symbol}
                                stroke="#1e40af"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 5 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-right text-slate-400 mt-1">
                        데이터 출처: 캐시 요약 데이터 (stockChartSummary)
                    </p>
                </div>
            )}

            <div className="mt-6 pt-4 border-t text-right">
                <Button onClick={onClose} variant="secondary" color="gray">
                    닫기
                </Button>
            </div>
        </Modal>
    );
};

export default ChartModal;
