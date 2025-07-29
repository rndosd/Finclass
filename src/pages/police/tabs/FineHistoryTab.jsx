import React from 'react';
import dayjs from 'dayjs';
import {
    CalendarDaysIcon,
    RefreshCwIcon,
    InfoIcon,
    XCircle,
} from 'lucide-react';
import { useFineHistory } from '../hooks/useFineHistory';
import { useUser } from '../../../contexts/UserContext';
import { Card, InputField, Button, Spinner, Badge } from '../../../components/ui';

const FineHistoryTab = ({ allStudentsFromPage, policeRulesFromPage, classData }) => {
    const { userData } = useUser();
    const currencyUnit = classData?.currencyUnit || '단위';

    const {
        records,
        isLoading,
        displayMode,
        searchStartDate,
        searchEndDate,
        isPoliceAdmin,
        setDisplayMode,
        setSearchStartDate,
        setSearchEndDate,
        handleCancelFine,
        fetchHistoricalFines
    } = useFineHistory({ allStudents: allStudentsFromPage, policeRules: policeRulesFromPage });

    const handleSearchButtonClick = () => {
        if (!searchStartDate || !searchEndDate) {
            alert('시작일과 종료일을 모두 선택해주세요.');
            return;
        }
        if (dayjs(searchEndDate).isBefore(dayjs(searchStartDate))) {
            alert('종료일은 시작일보다 이후여야 합니다.');
            return;
        }
        setDisplayMode('historical');
        fetchHistoricalFines(searchStartDate, searchEndDate);
    };

    const handleShowRecentClick = () => {
        setDisplayMode('recent');
    };

    const getDangerLevelColor = (level) => {
        switch (level) {
            case 3:
                return 'text-red-600';
            case 2:
                return 'text-yellow-600';
            case 1:
            default:
                return 'text-slate-500';
        }
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
            {isPoliceAdmin && (
                <Card className="mb-6 shadow-sm">
                    <div className="flex flex-wrap gap-3 items-end justify-between">
                        <div className="flex flex-wrap gap-3 items-end">
                            <InputField
                                label="시작일"
                                type="date"
                                value={searchStartDate}
                                onChange={(e) => setSearchStartDate(e.target.value)}
                            />
                            <InputField
                                label="종료일"
                                type="date"
                                value={searchEndDate}
                                onChange={(e) => setSearchEndDate(e.target.value)}
                            />
                            <Button onClick={handleSearchButtonClick} icon={CalendarDaysIcon} color="indigo">
                                조회
                            </Button>
                            <Button variant="outline" onClick={handleShowRecentClick} icon={RefreshCwIcon}>
                                최근 3일
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <h3 className="text-xl font-semibold text-slate-800 mb-1">
                📜 {displayMode === 'recent' ? '최근 3일 벌금 부과 내역' : '조회된 과거 벌금 내역'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
                {displayMode === 'historical' && `${searchStartDate} ~ ${searchEndDate}의 검색 결과입니다.`}
            </p>

            {isLoading ? (
                <div className="flex justify-center items-center p-10">
                    <Spinner size="xl" />
                    <p className="ml-4 text-slate-600 text-lg">
                        {displayMode === 'recent' ? '최근 내역 로딩 중...' : '과거 내역 조회 중...'}
                    </p>
                </div>
            ) : records.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg shadow-md">
                    <InfoIcon className="h-16 w-16 mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-500 text-lg">🤔 선택하신 기간에는 표시할 벌금 내역이 없습니다.</p>
                </div>
            ) : (
                <div className="shadow-lg rounded-lg overflow-hidden border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead className="bg-slate-100 text-slate-700 text-xs font-medium">
                                <tr>
                                    <th className="px-4 py-3 text-left">학생명</th>
                                    <th className="px-4 py-3 text-left">규칙</th>
                                    <th className="px-4 py-3 text-left">사유</th>
                                    <th className="px-4 py-3 text-right">벌금</th>
                                    <th className="px-4 py-3 text-center">신용</th>
                                    <th className="px-4 py-3 text-left">부과 시각</th> {/* ✅ 신고 시각 포함 */}
                                    <th className="px-4 py-3 text-left">부과자</th>
                                    <th className="px-4 py-3 text-center">상태</th>
                                    {isPoliceAdmin && <th className="px-4 py-3 text-center">작업</th>}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200">
                                {records.map((rec) => (
                                    <tr key={rec.id} className={rec.status === 'cancelled' ? 'opacity-70 bg-slate-50' : ''}>
                                        <td className="px-4 py-3">{rec.studentName}</td>

                                        <td className={`px-4 py-3 font-semibold ${getDangerLevelColor(rec.ruleDangerLevel)}`}>
                                            {rec.ruleText}
                                        </td>

                                        <td className="px-4 py-3 max-w-sm truncate" title={rec.reason}>
                                            {rec.reason}
                                        </td>

                                        <td className="px-4 py-3 text-right font-medium text-red-600">
                                            -{rec.fineAmountApplied?.toLocaleString()} {currencyUnit}
                                        </td>

                                        <td className="px-4 py-3 text-center font-medium text-red-600">
                                            {rec.creditChangeApplied || 0}점
                                        </td>

                                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                            <div>{dayjs(rec.appliedAt?.toDate()).format('YYYY.MM.DD HH:mm')}</div>
                                            {rec.reportedAt && (
                                                <div className="text-[11px] text-slate-400">
                                                    (신고: {dayjs(rec.reportedAt.toDate()).format('MM.DD HH:mm')})
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-slate-500">{rec.appliedByName}</td>

                                        <td className="px-4 py-3 text-center">
                                            <Badge colorScheme={rec.status === 'applied' ? 'red' : 'slate'} size="sm">
                                                {rec.status === 'cancelled' ? '취소됨' : '부과됨'}
                                            </Badge>
                                        </td>

                                        {isPoliceAdmin && (
                                            <td className="px-4 py-3 text-center">
                                                {rec.status !== 'cancelled' && (
                                                    <Button
                                                        size="xs"
                                                        color="red"
                                                        variant="outline"
                                                        icon={XCircle}
                                                        onClick={() => handleCancelFine(rec)}
                                                    >
                                                        취소
                                                    </Button>
                                                )}
                                            </td>
                                        )}
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

export default FineHistoryTab;
