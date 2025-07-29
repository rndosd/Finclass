import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../../../components/ui';
import { Eye } from 'lucide-react';
import StudentBankDetailModal from '../modals/StudentBankDetailModal';

const BankStatusTab = ({ studentsBankStatus = [], allActiveSavings = [], allActiveLoans = [], currencyUnit = '코인', classId }) => {
    const [detailModalTarget, setDetailModalTarget] = useState(null);

    const handleViewDetail = (student) => {
        // ⭐ 시작: 디버깅 로그 추가
        console.log("--- [BankStatusTab] handleViewDetail 실행 ---");
        console.log("클릭된 학생 정보 (student):", student);
        console.log(`이 학생의 ID (${student.uid})와 일치하는 내역을 찾습니다.`);

        // 전체 활성 예금/대출 목록에서 이 학생의 데이터만 필터링합니다.
        const studentSavings = allActiveSavings.filter(s => s.requestedBy === student.uid);
        const studentLoans = allActiveLoans.filter(l => l.requestedBy === student.uid);

        console.log(`필터링 결과: 예금 ${studentSavings.length}건, 대출 ${studentLoans.length}건`);
        // console.log("전체 활성 예금 목록 (참고용):", allActiveSavings);
        // console.log("전체 활성 대출 목록 (참고용):", allActiveLoans);
        // ⭐ 끝: 디버깅 로그 추가

        setDetailModalTarget({
            studentInfo: student,
            savings: studentSavings,
            loans: studentLoans,
        });
    };

    return (
        <>
            <Card>
                <Card.Header>
                    <Card.Title>학생별 은행 이용 현황</Card.Title>
                    <Card.Description>학생들의 활성 예금 및 대출 보유 현황을 요약하여 보여줍니다.</Card.Description>
                </Card.Header>
                <Card.Content>
                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                        <table className="w-full text-sm">
                            {/* ⭐ 시작: 개선된 그룹 헤더 */}
                            <thead className="text-center text-xs text-slate-600 bg-slate-100 font-semibold">
                                <tr>
                                    <th rowSpan="2" className="p-3 border-b border-r">학번</th>
                                    <th rowSpan="2" className="p-3 border-b border-r">이름</th>
                                    <th colSpan="2" className="p-3 border-b border-r">예금 정보</th>
                                    <th colSpan="2" className="p-3 border-b border-r">대출 정보</th>
                                    <th rowSpan="2" className="p-3 border-b">상세보기</th>
                                </tr>
                                <tr>
                                    <th className="p-3 border-b border-r font-medium">보유(건)</th>
                                    <th className="p-3 border-b border-r font-medium">총액</th>
                                    <th className="p-3 border-b border-r font-medium">보유(건)</th>
                                    <th className="p-3 border-b border-r font-medium">총액</th>
                                </tr>
                            </thead>
                            {/* ⭐ 끝: 개선된 그룹 헤더 */}
                            <tbody className="divide-y divide-slate-100">
                                {studentsBankStatus.length > 0 ? (
                                    studentsBankStatus.map(student => (
                                        <tr key={student.uid} className="bg-white hover:bg-slate-50/50">
                                            <td className="p-3 text-center text-slate-700">{student.studentNumber || "-"}</td>
                                            <td className="p-3 font-medium text-slate-900 flex items-center justify-center">
                                                <span>{student.name}</span>
                                                {student.role === 'teacher' && (
                                                    <Badge color="violet" size="sm" className="ml-2">교사</Badge>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-blue-600">{student.savingsCount > 0 ? `${student.savingsCount}` : '-'}</td>
                                            <td className="p-3 text-right font-medium text-blue-600">{student.totalSavingsAmount > 0 ? `${student.totalSavingsAmount.toLocaleString()} ${currencyUnit}` : '-'}</td>
                                            <td className="p-3 text-center font-semibold text-red-600">{student.loanCount > 0 ? `${student.loanCount}` : '-'}</td>
                                            <td className="p-3 text-right font-medium text-red-600">{student.totalLoanAmount > 0 ? `${student.totalLoanAmount.toLocaleString()} ${currencyUnit}` : '-'}</td>
                                            <td className="p-3 text-center">
                                                <Button size="xs" variant="ghost" onClick={() => handleViewDetail(student)}>                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center p-10 text-slate-500">
                                            은행 이용 내역이 있는 학생이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card.Content>
            </Card>

            {detailModalTarget && (
                <StudentBankDetailModal
                    isOpen={!!detailModalTarget}
                    onClose={() => setDetailModalTarget(null)}
                    modalData={detailModalTarget}
                    classId={classId}
                    currencyUnit={currencyUnit}
                />
            )}
        </>
    );
};

export default BankStatusTab;