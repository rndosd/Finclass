// src/pages/police/tabs/ReportListTab.jsx

import React, { useState } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { useReportList } from '../hooks/useReportList';
import { Badge, Button, Spinner } from '../../../components/ui';
import { InformationCircleIcon } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';

const ReportListTab = ({ classId, allStudentsFromPage = [], policeRulesFromPage = [], currencyUnit }) => {
    const {
        reports,
        isLoading,
        handleResolveReport
    } = useReportList({ classId, allStudents: allStudentsFromPage, policeRules: policeRulesFromPage });

    const [processingId, setProcessingId] = useState(null);

    const onResolve = async (report, applyPenalty) => {
        setProcessingId(report.id);
        await handleResolveReport(report, applyPenalty);
        setProcessingId(null);
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 min-h-full">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 mb-4">
                🚨 신고 접수 내역 <span className="text-base font-normal text-slate-500">({reports.length}건 대기 중)</span>
            </h2>

            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Spinner size="lg" />
                    <p className="ml-3 text-slate-600">신고 내역을 불러오는 중입니다...</p>
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <InformationCircleIcon className="h-16 w-16 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-500 text-lg">표시 가능한 신고 내역이 없습니다.</p>
                </div>
            ) : (
                <div className="shadow-md rounded-lg overflow-hidden bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-sm">
                            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                                <tr>
                                    {['신고자', '피신고자', '위반 규칙', '신고 사유', '민감', '신고일시', '처리'].map(header => (
                                        <th key={header} className="px-4 py-3 font-semibold text-left whitespace-nowrap">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap" title={report.reporterUid}>
                                            {report.reporterName || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap" title={report.accusedStudentUid}>
                                            {report.accusedStudentName || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {report.ruleText || '-'}
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate" title={report.reason}>
                                            {report.reason || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {report.isSensitive ? (
                                                <Badge colorScheme="purple" size="sm">민감</Badge>
                                            ) : (
                                                <Badge colorScheme="slate" size="sm">일반</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                            {report.createdAt?.toDate ? dayjs(report.createdAt.toDate()).format('YYYY-MM-DD HH:mm') : '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex gap-2 justify-center">
                                                <Button
                                                    onClick={() => onResolve(report, true)}
                                                    color="red"
                                                    size="xs"
                                                    disabled={processingId === report.id}
                                                >
                                                    {processingId === report.id ? '처리 중...' : '처벌'}
                                                </Button>
                                                <Button
                                                    onClick={() => onResolve(report, false)}
                                                    color="gray"
                                                    variant="outline"
                                                    size="xs"
                                                    disabled={processingId === report.id}
                                                >
                                                    무시
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportListTab;
