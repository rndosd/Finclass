import React, { useState, useMemo } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Table, InputField } from "../../../components/ui";
import dayjs from "dayjs";

export default function TransfersTab({ transfers = [], currencyUnit = "단위" }) {
    // --- 필터링을 위한 상태 ---
    const [searchTerm, setSearchTerm] = useState("");
    const [dateRange, setDateRange] = useState({
        start: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
        end: dayjs().format('YYYY-MM-DD'),
    });

    // --- 필터링된 데이터 ---
    const filteredTransfers = useMemo(() => {
        let filtered = transfers;
        if (dateRange.start && dateRange.end) { /* ... 날짜 필터링 로직 ... */ }
        if (searchTerm.trim()) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(tx =>
                tx.senderName.toLowerCase().includes(lowercasedTerm) ||
                tx.receiverName.toLowerCase().includes(lowercasedTerm)
            );
        }
        return filtered;
    }, [transfers, searchTerm, dateRange]);

    return (
        <div className="space-y-4">
            {/* --- 필터링 UI --- */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg bg-slate-50">
                <InputField type="date" label="조회 시작일" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
                <InputField type="date" label="조회 종료일" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
                <div className="flex-grow">
                    <InputField label="이름으로 검색" placeholder="보낸 또는 받은 사람 이름" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} icon={Search} />
                </div>
            </div>

            {/* --- 송금 내역 테이블 --- */}
            <div className="overflow-x-auto">
                <Table>
                    {/* ⭐ 시작: 테이블 헤더(thead) 완성 */}
                    <thead className="bg-slate-100">
                        <tr className="text-sm text-slate-600">
                            <th className="p-3 font-semibold text-left">날짜</th>
                            <th className="p-3 font-semibold text-right">보낸 사람</th>
                            <th className="p-3 w-8 font-semibold"></th>
                            <th className="p-3 font-semibold text-left">받은 사람</th>
                            <th className="p-3 font-semibold text-right">금액 ({currencyUnit})</th>
                        </tr>
                    </thead>
                    {/* ⭐ 끝: 수정된 부분 */}

                    <tbody className="divide-y divide-slate-100">
                        {filteredTransfers.length > 0 ? (
                            filteredTransfers.map((tx) => (
                                <tr key={tx.id} className="text-sm">
                                    <td className="px-3 py-2.5 text-slate-500">{dayjs((tx.date?.seconds || 0) * 1000).format("YYYY.MM.DD HH:mm")}</td>
                                    <td className="px-3 py-2.5 font-medium text-slate-800 text-right">{tx.senderName}</td>
                                    <td className="px-1 py-2.5 text-slate-400"><ArrowRight className="h-4 w-4 mx-auto" /></td>
                                    <td className="px-3 py-2.5 font-medium text-slate-800 text-left">{tx.receiverName}</td>
                                    <td className="px-3 py-2.5 text-right font-bold text-indigo-600">{tx.amount.toLocaleString()}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center text-slate-500 py-12">
                                    해당 조건의 송금 내역이 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </div>
    );
}