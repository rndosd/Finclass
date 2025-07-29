import React, { useState, useMemo } from 'react';
import { Card, InputField } from '../../../components/ui';
import dayjs from 'dayjs';
import { subDays } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ko } from 'date-fns/locale';

import useClassFinancials from '../hooks/useClassFinancials';
import { useUser } from '../../../contexts/UserContext';

const StorePurchasesTab = () => {
    const { classData } = useUser();
    const currencyUnit = classData?.currencyUnit || '단위';
    const {
        storeRedemptions = [],
        isLoading,
        error,
        refresh: refreshPurchases,
    } = useClassFinancials();

    const [studentNameFilter, setStudentNameFilter] = useState('');
    const [startDate, setStartDate] = useState(subDays(new Date(), 3));
    const [endDate, setEndDate] = useState(new Date());

    const filteredRedemptions = useMemo(() => {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        return storeRedemptions.filter((p) => {
            if (!p.redeemedAt) return false;
            const date = p.redeemedAt.toDate ? p.redeemedAt.toDate() : new Date(p.redeemedAt);
            const dateMatch = date >= startDate && date <= endOfDay;
            const nameMatch = studentNameFilter
                ? p.studentName?.toLowerCase().includes(studentNameFilter.toLowerCase())
                : true;
            return dateMatch && nameMatch;
        });
    }, [storeRedemptions, studentNameFilter, startDate, endDate]);

    return (
        <Card>
            <Card.Header>
                <Card.Title>상점 소비 내역</Card.Title>
                <Card.Description>학생들의 상점 소비 활동 내역입니다.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
                    <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">조회 기간</label>
                        <div className="flex items-center gap-2">
                            <DatePicker selected={startDate} onChange={(date) => setStartDate(date)} className="form-input w-full" dateFormat="yyyy-MM-dd" locale={ko} />
                            <span>~</span>
                            <DatePicker selected={endDate} onChange={(date) => setEndDate(date)} className="form-input w-full" dateFormat="yyyy-MM-dd" locale={ko} />
                        </div>
                    </div>
                    <InputField
                        label="학생 이름"
                        placeholder="학생 이름으로 검색..."
                        value={studentNameFilter}
                        onChange={(e) => setStudentNameFilter(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-md">
                    <table className="w-full text-sm">
                        <thead className="text-center text-xs text-slate-500 bg-slate-100">
                            <tr>
                                <th className="p-3 font-medium">수령 시각</th>
                                <th className="p-3 font-medium">학생</th>
                                <th className="p-3 font-medium">아이템</th>
                                <th className="p-3 font-medium">수량</th>
                                <th className="p-3 font-medium">총 금액 ({currencyUnit})</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRedemptions.length > 0 ? (
                                filteredRedemptions.map((p) => (
                                    <tr key={p.id} className="text-center bg-white hover:bg-slate-50/50">
                                        <td className="p-3 whitespace-nowrap text-slate-600">{dayjs(p.redeemedAt?.toDate ? p.redeemedAt.toDate() : p.redeemedAt).format('YYYY.MM.DD HH:mm')}</td>
                                        <td className="p-3 font-medium text-slate-800">{p.studentName}</td>
                                        <td className="p-3 text-slate-700">{p.itemName}</td>
                                        <td className="p-3 font-semibold text-slate-700">{p.quantity}</td>
                                        <td className="p-3 font-semibold text-slate-700">{p.totalAmount?.toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center p-10 text-slate-500">
                                        선택한 조건에 해당하는 소비 내역이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card.Content>
        </Card>
    );
};

export default StorePurchasesTab;
