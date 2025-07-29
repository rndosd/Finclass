// src/pages/bank/modals/DepositHistoryModal.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import {
    collection, query, orderBy, onSnapshot
} from 'firebase/firestore';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { Modal, Button, Badge } from '../../../components/ui';
import { ClockIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

dayjs.extend(isSameOrAfter);

export default function DepositHistoryModal({
    open,
    onClose,
    uid,
    classId,
    studentName,
    processSavingAction,
    isMyBankPage,
    currencyUnit,
    isProcessing, // 로딩 표시용 (from useSavingsManagement)
}) {
    const [savings, setSavings] = useState([]);

    // ✅ onSnapshot 적용
    useEffect(() => {
        if (open && uid && classId) {
            const q = query(
                collection(db, "classes", classId, "students", uid, "savings"),
                orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const savingsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setSavings(savingsData);

                // 디버깅: 예금 데이터 로그
                console.log('=== 예금 데이터 디버깅 ===');
                savingsData.forEach((s, index) => {
                    console.log(`예금 ${index + 1}:`, {
                        id: s.id,
                        productLabel: s.productLabel,
                        amount: s.amount,
                        status: s.status,
                        days: s.days,
                        startedAt: s.startedAt,
                        createdAt: s.createdAt,
                        finalRate: s.finalRate
                    });
                });
            });

            return () => unsubscribe();
        }
    }, [open, uid, classId]);

    if (!open) return null;

    const getStatusInfo = (savingStatus, isMaturedAlready) => {
        switch (savingStatus) {
            case "pending": return { label: "승인대기", color: "yellow", Icon: ClockIcon };
            case "active": return { label: isMaturedAlready ? "만기(수령가능)" : "진행중", color: isMaturedAlready ? "blue" : "teal", Icon: CheckCircleIcon };
            case "completed": return { label: "수령완료", color: "green", Icon: CheckCircleIcon };
            case "terminated": return { label: "중도해지", color: "orange", Icon: XCircleIcon };
            case "cancelled_request": return { label: "신청취소", color: "slate", Icon: XCircleIcon };
            case "rejected": return { label: "승인거절", color: "red", Icon: XCircleIcon };
            default: return { label: String(savingStatus || '알수없음').toUpperCase(), color: "gray", Icon: InformationCircleIcon };
        }
    };

    return (
        <Modal onClose={onClose} title={`💰 ${studentName}님 예금 현황`} size="2xl">
            {savings.length === 0 ? (
                <p className="text-center text-gray-500 py-8">가입된 예금 상품이 없습니다.</p>
            ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                    <table className="w-full min-w-[750px] text-xs leading-tight border-collapse align-middle">
                        <thead className="text-xs text-slate-600 uppercase bg-slate-100">
                            <tr>
                                <th className="px-3 py-3 text-left font-semibold">상품명</th>
                                <th className="px-3 py-3 text-right font-semibold">원금({currencyUnit})</th>
                                <th className="px-3 py-3 text-center font-semibold">최종이율(%)</th>
                                <th className="px-3 py-3 text-right font-semibold">예상이자({currencyUnit})</th>
                                <th className="px-3 py-3 text-center hidden md:table-cell font-semibold">시작일</th>
                                <th className="px-3 py-3 text-center font-semibold">만기일</th>
                                <th className="px-3 py-3 text-center font-semibold">상태</th>
                                {isMyBankPage && <th className="px-3 py-3 text-center font-semibold">작업</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {savings.map(s => {
                                const now = dayjs();

                                // ✅ 시작일 처리 개선
                                let startedAtDate = null;
                                if (s.startedAt?.toDate) {
                                    startedAtDate = dayjs(s.startedAt.toDate());
                                } else if (s.startedAt?.seconds) {
                                    // Firestore Timestamp 객체 처리
                                    startedAtDate = dayjs(new Date(s.startedAt.seconds * 1000));
                                } else if (s.startedAt) {
                                    // 일반 Date 객체나 문자열 처리
                                    startedAtDate = dayjs(s.startedAt);
                                }

                                // ✅ 만기일 처리 개선 - maturityDate 필드 우선 사용
                                let calculatedMaturityDate = null;

                                // 1순위: maturityDate 필드 사용 (실제 계산된 만기일)
                                if (s.maturityDate?.toDate) {
                                    calculatedMaturityDate = dayjs(s.maturityDate.toDate());
                                } else if (s.maturityDate?.seconds) {
                                    calculatedMaturityDate = dayjs(new Date(s.maturityDate.seconds * 1000));
                                } else if (s.maturityDate) {
                                    calculatedMaturityDate = dayjs(s.maturityDate);
                                }
                                // 2순위: startedAt + days로 계산 (fallback)
                                else if (startedAtDate && typeof s.days === 'number' && s.days > 0) {
                                    calculatedMaturityDate = startedAtDate.add(s.days, 'day');
                                }

                                // ✅ 만기 여부 판단 개선
                                const isMatured = s.status === "active" &&
                                    calculatedMaturityDate &&
                                    now.isSameOrAfter(calculatedMaturityDate, 'day');

                                // 디버깅 로그 추가
                                if (s.status === "active") {
                                    console.log(`=== 예금 ${s.id} 만기 계산 ===`);
                                    console.log('현재 시간:', now.format('YYYY-MM-DD HH:mm:ss'));
                                    console.log('시작일 원본:', s.startedAt);
                                    console.log('파싱된 시작일:', startedAtDate?.format('YYYY-MM-DD HH:mm:ss'));
                                    console.log('예금 기간(일):', s.days);
                                    console.log('저장된 만기일(maturityDate):', s.maturityDate);
                                    console.log('계산된 만기일:', calculatedMaturityDate?.format('YYYY-MM-DD HH:mm:ss'));
                                    console.log('만기 여부:', isMatured);
                                    console.log('만기 조건 체크:');
                                    console.log('- status === "active":', s.status === "active");
                                    console.log('- calculatedMaturityDate 존재:', !!calculatedMaturityDate);
                                    console.log('- 현재시간 >= 만기일:', calculatedMaturityDate ? now.isSameOrAfter(calculatedMaturityDate, 'day') : false);
                                    console.log('- 시간 차이(시간):', calculatedMaturityDate ? now.diff(calculatedMaturityDate, 'hour') : '계산불가');
                                }

                                const statusInfo = getStatusInfo(s.status, isMatured);
                                const StatusIcon = statusInfo.Icon;

                                let displayEndDate = calculatedMaturityDate;
                                if (s.status === "terminated" && s.terminatedAt?.toDate) {
                                    displayEndDate = dayjs(s.terminatedAt.toDate());
                                } else if (s.status === "completed" && s.claimedAt?.toDate) {
                                    displayEndDate = dayjs(s.claimedAt.toDate());
                                } else if ((s.status === "cancelled_request" || s.status === "rejected") && s.processedAt?.toDate) {
                                    displayEndDate = dayjs(s.processedAt.toDate());
                                }

                                const canClaim = isMyBankPage && s.status === "active" && isMatured;
                                const canCancelRequest = isMyBankPage && s.status === "pending";
                                const canTerminateEarly = isMyBankPage && s.status === "active" && calculatedMaturityDate && !isMatured;

                                // 버튼 상태 디버깅
                                if (isMyBankPage && s.status === "active") {
                                    console.log(`=== 버튼 상태 (예금 ${s.id}) ===`);
                                    console.log('canClaim:', canClaim);
                                    console.log('canTerminateEarly:', canTerminateEarly);
                                    console.log('조건 분석:');
                                    console.log('- isMyBankPage:', isMyBankPage);
                                    console.log('- status === "active":', s.status === "active");
                                    console.log('- isMatured:', isMatured);
                                    console.log('- calculatedMaturityDate 존재:', !!calculatedMaturityDate);
                                }

                                return (
                                    <tr key={s.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-left text-slate-700 font-medium whitespace-nowrap">{s.productLabel || `${s.days}일 예금`}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">{s.amount?.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-center font-semibold text-green-600 whitespace-nowrap">{s.finalRate?.toFixed(2) ?? '-'}</td>
                                        <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                                            {(s.status === 'completed' || s.status === 'terminated' ? s.finalInterestPaid : s.interestCalculatedOnRequest)?.toLocaleString() ?? '?'}
                                        </td>
                                        <td className="px-3 py-2 hidden md:table-cell text-center text-slate-500 whitespace-nowrap">
                                            {startedAtDate ? startedAtDate.format("YY.MM.DD HH:mm") : (s.status === "pending" ? "승인대기" : "-")}
                                        </td>
                                        <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">
                                            {displayEndDate ? displayEndDate.format("YY.MM.DD HH:mm") :
                                                (s.status === "pending" ? "승인 후 결정" :
                                                    (s.status === "active" && calculatedMaturityDate ? calculatedMaturityDate.format("YY.MM.DD HH:mm") : "-"))
                                            }
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <Badge colorScheme={statusInfo.color} size="sm" className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <StatusIcon className="h-3.5 w-3.5" /> {statusInfo.label}
                                            </Badge>
                                        </td>
                                        {isMyBankPage && (
                                            <td className="px-3 py-2 text-center space-x-1 whitespace-nowrap">
                                                {canClaim && (
                                                    <Button
                                                        onClick={() => processSavingAction(s.id, "claim")}
                                                        color="blue"
                                                        size="xs"
                                                        isLoading={isProcessing}
                                                    >
                                                        수령
                                                    </Button>
                                                )}
                                                {canCancelRequest && (
                                                    <Button
                                                        onClick={() => processSavingAction(s.id, "cancel_request")}
                                                        color="red"
                                                        variant="secondary"
                                                        size="xs"
                                                        isLoading={isProcessing}
                                                    >
                                                        취소
                                                    </Button>
                                                )}
                                                {canTerminateEarly && (
                                                    <Button
                                                        onClick={() => processSavingAction(s.id, "terminate")}
                                                        color="yellow"
                                                        size="xs"
                                                        isLoading={isProcessing}
                                                    >
                                                        해지
                                                    </Button>
                                                )}
                                                {(!canClaim && !canCancelRequest && !canTerminateEarly) && (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}

                                                {/* 디버깅용 임시 정보 (개발 완료 후 제거) */}
                                                {process.env.NODE_ENV === 'development' && s.status === "active" && (
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        <div>만기: {isMatured ? 'Y' : 'N'}</div>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="mt-6 text-right">
                <Button onClick={onClose} variant="secondary" color="gray">닫기</Button>
            </div>
        </Modal>
    );
}