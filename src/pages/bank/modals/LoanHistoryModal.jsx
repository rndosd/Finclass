// src/pages/bank/modals/LoanHistoryModal.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import {
    collection, query, orderBy, onSnapshot
} from 'firebase/firestore';
import dayjs from 'dayjs';
import { Modal, Button, Badge } from '../../../components/ui';
import {
    ClockIcon, CheckCircleIcon, XCircleIcon,
    InformationCircleIcon, ExclamationTriangleIcon, ReceiptRefundIcon
} from '@heroicons/react/24/solid';
import { useUser } from '../../../contexts/UserContext';

export default function LoanHistoryModal({
    open,
    onClose,
    uid,
    classId,
    studentName,
    onOpenRepayModal,
    isMyBankPage,
    currencyUnit,
    calculateEarlyRepaymentInterest,
}) {
    const { isTeacher, isBankManager } = useUser();
    const [loans, setLoans] = useState([]);

    // ✅ 실시간 onSnapshot 적용
    useEffect(() => {
        if (open && uid && classId) {
            const q = query(
                collection(db, "classes", classId, "students", uid, "loans"),
                orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const loansData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setLoans(loansData);
            });

            return () => unsubscribe();
        }
    }, [open, uid, classId]);

    if (!open) return null;

    const getStatusInfo = (loan) => {
        switch (loan.status) {
            case "pending": return { label: "승인대기", color: "yellow", Icon: ClockIcon };
            case "approved": case "ongoing": return { label: "상환중", color: "blue", Icon: CheckCircleIcon };
            case "repaid": return { label: "상환완료", color: "green", Icon: CheckCircleIcon };
            case "rejected": return { label: "승인거절", color: "red", Icon: XCircleIcon };
            case "defaulted": return { label: "연체", color: "red", Icon: ExclamationTriangleIcon, className: "font-bold" };
            default: return { label: loan.status, color: "gray", Icon: InformationCircleIcon };
        }
    };

    return (
        <Modal onClose={onClose} title={`💸 ${studentName}님 대출 현황`}>
            {loans.length === 0 ? (
                <p className="text-center text-gray-500 py-8">신청하거나 실행된 대출이 없습니다.</p>
            ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                    <table className="w-full min-w-[820px] text-xs leading-tight border-collapse align-middle">
                        <thead className="text-xs text-slate-600 uppercase bg-slate-100">
                            <tr>
                                <th className="px-3 py-3 font-semibold text-center">상품명</th>
                                <th className="px-3 py-3 font-semibold text-center">대출원금({currencyUnit})</th>
                                <th className="px-3 py-3 font-semibold text-center">남은원금({currencyUnit})</th>
                                <th className="px-3 py-3 font-semibold text-center">남은이자({currencyUnit})</th>
                                <th className="px-3 py-3 font-semibold text-center hidden md:table-cell">실제시작일</th>
                                <th className="px-3 py-3 font-semibold text-center">실제상환만기일</th>
                                <th className="px-3 py-3 font-semibold text-center">상태</th>
                                {(isMyBankPage || isTeacher || isBankManager) && <th className="px-3 py-3 font-semibold text-center">작업</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {loans.map(l => {
                                const statusInfo = getStatusInfo(l);
                                const StatusIcon = statusInfo.Icon;

                                const interestLeft = calculateEarlyRepaymentInterest
                                    ? calculateEarlyRepaymentInterest(l)
                                    : (l.interestLeft ?? l.interestCalculatedOnRequest ?? 0);

                                const startedAt = (l.status !== "pending" && l.startedAt?.toDate) ? dayjs(l.startedAt.toDate()) : null;

                                let determinedMaturityDate = null;
                                if (l.actualRepaymentDate?.toDate) {
                                    determinedMaturityDate = dayjs(l.actualRepaymentDate.toDate());
                                } else if (l.expectedRepaymentDate?.toDate) {
                                    determinedMaturityDate = dayjs(l.expectedRepaymentDate.toDate());
                                }

                                let displayEndDate = determinedMaturityDate;
                                if (l.status === "rejected" && l.processedAt?.toDate) {
                                    displayEndDate = dayjs(l.processedAt.toDate());
                                } else if (l.status === "repaid" && l.lastRepaymentAt?.toDate) {
                                    displayEndDate = dayjs(l.lastRepaymentAt.toDate());
                                }

                                const isRepayable = (l.status === "approved" || l.status === "ongoing") && (l.amountLeft ?? l.amount ?? 0) > 0.001;
                                const canUserRepay = isMyBankPage || isTeacher || isBankManager;

                                return (
                                    <tr key={l.id} className={`hover:bg-slate-50 ${l.status === 'repaid' ? 'opacity-60' : ''}`}>
                                        <td className="px-3 py-2 text-center text-slate-700 font-medium">{l.productLabel || `${l.days}일 대출`}</td>
                                        <td className="px-3 py-2 text-center font-semibold text-slate-900">{l.amount?.toLocaleString()}</td>
                                        <td className="px-3 py-2 text-center text-blue-600">{(l.amountLeft ?? 0).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-center text-red-600">{(l.interestLeft ?? 0).toLocaleString()}</td>
                                        <td className="px-3 py-2 hidden md:table-cell text-center text-slate-500">
                                            {l.status === "pending"
                                                ? "승인 대기중"
                                                : (startedAt ? startedAt.format("YY.MM.DD HH:mm") : "-")
                                            }
                                        </td>
                                        <td className="px-3 py-2 text-center text-slate-500">
                                            {l.status === "pending"
                                                ? "승인 대기중"
                                                : (displayEndDate ? displayEndDate.format("YY.MM.DD HH:mm") : "-")
                                            }
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <Badge colorScheme={statusInfo.color} size="sm" className={`inline-flex items-center gap-1 ${statusInfo.className || ''}`}>
                                                <StatusIcon className="h-3.5 w-3.5" /> {statusInfo.label}
                                            </Badge>
                                        </td>
                                        {canUserRepay && (
                                            <td className="px-3 py-2 text-center">
                                                {isRepayable && (
                                                    <Button onClick={() => {
                                                        console.log("🔍 LoanHistoryModal → 상환 버튼 클릭 → loan.id:", l.id);
                                                        onOpenRepayModal(l.id);
                                                    }} color="blue" size="xs" icon={ReceiptRefundIcon}>상환</Button>)}
                                                {(!isRepayable && (l.status === "approved" || l.status === "ongoing" || l.status === "defaulted")) && <span className="text-xs text-slate-400">-</span>}
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
