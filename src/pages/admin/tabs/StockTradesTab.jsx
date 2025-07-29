// src/pages/admin/tabs/StockTradesTab.jsx

import React, { useState, useMemo } from 'react';
import { Card, InputField, SelectField, Badge } from '../../../components/ui';
import dayjs from 'dayjs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

// 거래 유형 맵 (이제 currencyUnit을 동적으로 표시하므로 맵에서 제거)
const TRADE_TYPE_MAP = {
    STOCK_BUY_USD: { label: '주식 매수', color: 'red' },
    STOCK_SELL_USD: { label: '주식 매도', color: 'blue' },
    EXCHANGE_BIL_TO_USD: { label: '환전', color: 'green' }, // '코인' 텍스트 제거
    EXCHANGE_USD_TO_BIL: { label: '환전', color: 'green' }, // '코인' 텍스트 제거
};

// 상세 내용 렌더링 함수
const renderTradeDetails = (trade) => {
    switch (trade.type) {
        case 'STOCK_BUY_USD':
        case 'STOCK_SELL_USD':
            return `${trade.symbol || ''} ${trade.quantity || 0}주`;
        case 'EXCHANGE_BIL_TO_USD':
        case 'EXCHANGE_USD_TO_BIL':
            return ''; // 비워두기로 결정
        default:
            return '상세 정보 없음';
    }
};

const StockTradesTab = ({ trades = [], currencyUnit }) => {
    // --- 필터링 상태 ---
    const [studentNameFilter, setStudentNameFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [startDate, setStartDate] = useState(subDays(new Date(), 3));
    const [endDate, setEndDate] = useState(new Date());

    // --- 필터링 로직 ---
    const filteredTrades = useMemo(() => {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        return trades.filter(trade => {
            // 상점 관련 타입은 이 탭에서 제외
            if (trade.type?.startsWith('STORE_')) return false;

            if (!trade.timestamp) return false;
            const tradeDate = trade.timestamp.toDate();

            const dateMatch = tradeDate >= startDate && tradeDate <= endOfDay;
            const studentMatch = studentNameFilter ? trade.studentName?.toLowerCase().includes(studentNameFilter.toLowerCase()) : true;
            const typeMatch = typeFilter !== 'all' ? trade.type === typeFilter : true;

            return dateMatch && studentMatch && typeMatch;
        });
    }, [trades, studentNameFilter, typeFilter, startDate, endDate]);

    return (
        <Card>
            <Card.Header>
                <Card.Title>주식/환전 활동 내역</Card.Title>
                <Card.Description>학급의 모든 투자 및 환전 활동 내역입니다.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
                {/* 필터링 UI */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
                    <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">조회 기간</label>
                        <div className="flex items-center gap-2">
                            <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} className="form-input w-full" dateFormat="yyyy-MM-dd" locale={ko} />
                            <span>~</span>
                            <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} className="form-input w-full" dateFormat="yyyy-MM-dd" locale={ko} />
                        </div>
                    </div>
                    <InputField label="학생 이름" placeholder="학생 이름으로 검색..." value={studentNameFilter} onChange={(e) => setStudentNameFilter(e.target.value)} />
                    <SelectField label="거래 유형" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="all">모든 유형</option>
                        {Object.entries(TRADE_TYPE_MAP).map(([key, { label }]) => (
                            <option key={key} value={key}>{key.includes('EXCHANGE') ? `${label} (${currencyUnit}↔USD)` : label}</option>
                        ))}
                    </SelectField>
                </div>

                {/* 데이터 테이블 */}
                <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-sm">
                        {/* ⭐ thead의 모든 th에 text-center 클래스 추가 */}
                        <thead className="text-center text-xs text-slate-500 bg-slate-100">
                            <tr>
                                <th className="p-3 font-medium">거래 시각</th>
                                <th className="p-3 font-medium">학생</th>
                                <th className="p-3 font-medium">거래 유형</th>
                                <th className="p-3 font-medium">상세 내용</th>
                                <th className="p-3 font-medium">차감된 자산</th>
                                <th className="p-3 font-medium">증가된 자산</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTrades.length > 0 ? (
                                filteredTrades.map(trade => {
                                    const tradeTypeInfo = TRADE_TYPE_MAP[trade.type];
                                    let debitAmount = null;
                                    let creditAmount = null;

                                    switch (trade.type) {
                                        case 'STOCK_BUY_USD':
                                            debitAmount = `-${(trade.totalCostUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
                                            break;
                                        case 'STOCK_SELL_USD':
                                            creditAmount = `+${(trade.totalAmountUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
                                            break;
                                        case 'EXCHANGE_BIL_TO_USD':
                                            debitAmount = `-${(trade.amountFrom || 0).toLocaleString()} ${currencyUnit}`;
                                            creditAmount = `+${(trade.amountTo || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
                                            break;
                                        case 'EXCHANGE_USD_TO_BIL':
                                            debitAmount = `-${(trade.amountFrom || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
                                            creditAmount = `+${(trade.amountTo || 0).toLocaleString()} ${currencyUnit}`;
                                            break;
                                        default: break;
                                    }

                                    return (
                                        // ⭐ tbody의 모든 td에 text-center 클래스 추가
                                        <tr key={trade.id} className="text-center bg-white hover:bg-slate-50/50">
                                            <td className="p-3 whitespace-nowrap text-slate-600">{dayjs(trade.timestamp.toDate()).format('YYYY.MM.DD HH:mm')}</td>
                                            <td className="p-3 font-medium text-slate-800">{trade.studentName}</td>
                                            <td className="p-3"><Badge color={tradeTypeInfo?.color || 'gray'}>{tradeTypeInfo?.label || trade.type}</Badge></td>
                                            <td className="p-3 text-slate-700">{renderTradeDetails(trade)}</td>
                                            <td className="p-3 font-semibold whitespace-nowrap text-red-600">{debitAmount}</td>
                                            <td className="p-3 font-semibold whitespace-nowrap text-blue-600">{creditAmount}</td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr><td colSpan="6" className="text-center p-10 text-slate-500">선택한 조건에 해당하는 내역이 없습니다.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card.Content>
        </Card>
    );
};

export default StockTradesTab;