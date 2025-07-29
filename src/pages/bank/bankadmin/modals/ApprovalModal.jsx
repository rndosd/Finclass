// src/pages/bank/bankadmin/modals/ApprovalModal.jsx 

import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../../../../firebase';
import {
    collection, query, where, getDocs, doc,
    writeBatch, serverTimestamp, increment
} from 'firebase/firestore';
import dayjs from 'dayjs';

import { Button, Modal, Spinner, Alert, Badge } from '../../../../components/ui';
import {
    CheckCircleIcon, XCircleIcon, ClockIcon,
    InformationCircleIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function ApprovalModal({
    isOpen,
    onClose,
    classId,
    onActionProcessed,
    currencyUnit,
    activeSubTab,     // ✨ Bank.jsx로부터 현재 활성화된 탭을 prop으로 받음
    onSubTabChange    // ✨ Bank.jsx로부터 탭 변경 함수를 prop으로 받음
}) {
    const [pendingSavings, setPendingSavings] = useState([]);
    const [pendingLoans, setPendingLoans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [alertInfo, setAlertInfo] = useState({ open: false, message: '', type: 'info' });
    // const [activeSubTab, setActiveSubTab] = useState('savings'); // 💣 이 로컬 상태는 제거! props로 받음

    // 컴포넌트 마운트/언마운트 및 주요 props 변경 로깅
    useEffect(() => {
        console.log(`[ApprovalModal] MOUNTED or isOpen/activeSubTab prop changed. isOpen: ${isOpen}, prop activeSubTab: ${activeSubTab}`);
        return () => {
            console.log("[ApprovalModal] UNMOUNTING!");
        };
    }, []); // 최초 마운트/언마운트 시

    useEffect(() => {
        console.log(`[ApprovalModal] Props update check - isOpen: ${isOpen}, activeSubTab: ${activeSubTab}`);
    }, [isOpen, activeSubTab]);


    const fetchPendingApplications = useCallback(async () => {
        if (!classId) {
            console.warn("[ApprovalModal] fetchPendingApplications - classId is missing.");
            setIsLoading(false);
            return;
        }
        console.log("[ApprovalModal] fetchPendingApplications CALLED for classId:", classId);
        setIsLoading(true);
        setAlertInfo({ open: false, message: '', type: 'info' });
        try {
            const studentsRef = collection(db, "classes", classId, "students");
            const studentsSnap = await getDocs(studentsRef);

            const savingsPromises = [];
            const loansPromises = [];

            for (const studentDoc of studentsSnap.docs) {
                const studentUid = studentDoc.id;
                const studentName = studentDoc.data().name || `학생 ${studentUid.substring(0, 5)}`;

                // 예금 목록 가져오기
                const pendingSavingsQuery = query(collection(db, "classes", classId, "students", studentUid, "savings"), where("status", "==", "pending"));
                savingsPromises.push(getDocs(pendingSavingsQuery).then(snap => snap.docs.map(d => ({ studentUid, studentName, id: d.id, ...d.data() }))));

                // 대출 목록 가져오기
                const pendingLoansQuery = query(collection(db, "classes", classId, "students", studentUid, "loans"), where("status", "==", "pending"));
                loansPromises.push(getDocs(pendingLoansQuery).then(snap => snap.docs.map(d => ({ studentUid, studentName, id: d.id, ...d.data() }))));
            }

            const allPendingSavings = (await Promise.all(savingsPromises)).flat();
            const allPendingLoans = (await Promise.all(loansPromises)).flat();

            setPendingSavings(allPendingSavings.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
            setPendingLoans(allPendingLoans.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
        } catch (error) {
            console.error("[ApprovalModal] 승인 대기 목록 로딩 오류:", error);
            setAlertInfo({ open: true, message: "승인 대기 목록 로딩 중 오류가 발생했습니다.", type: "error" });
            setPendingSavings([]);
            setPendingLoans([]);
        } finally { setIsLoading(false); }
    }, [classId]);

    useEffect(() => {
        if (isOpen && classId) {
            console.log("[ApprovalModal] useEffect (deps: [isOpen, classId, fetchPendingApplications]) is calling fetchPendingApplications.");
            fetchPendingApplications();
        }
    }, [isOpen, classId, fetchPendingApplications]);

    const handleApproval = useCallback(async (item, itemType, isApproved) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setAlertInfo({ open: true, message: "승인 권한이 없습니다. 다시 로그인해주세요.", type: "error" });
            return;
        }
        const currentApproverUid = currentUser.uid;
        const actionText = isApproved ? "승인" : "거절";

        if (!window.confirm(`${item.studentName}님의 ${itemType === 'saving' ? '예금' : '대출'} 신청(상품: ${item.productLabel}, 금액: ${item.amount.toLocaleString()}${currencyUnit || ''})을 ${actionText}하시겠습니까?`)) return;

        setIsLoading(true);
        setAlertInfo({ open: false, message: '', type: 'info' });
        console.log(`[ApprovalModal] handleApproval started for ${itemType} ID: ${item.id}. Action: ${actionText}. Current activeSubTab (from prop): ${activeSubTab}`);

        const batch = writeBatch(db);
        const studentRef = doc(db, "classes", classId, "students", item.studentUid);

        // ✅ 여기가 핵심 변경
        const collectionName = itemType === 'saving' ? 'savings' : 'loans';
        const itemRef = doc(db, "classes", classId, "students", item.studentUid, collectionName, item.id);

        const newStatus = isApproved ? (itemType === 'saving' ? "active" : "ongoing") : "rejected";
        const nowServerTimestamp = serverTimestamp();
        const updateData = { status: newStatus, processedAt: nowServerTimestamp, processedBy: currentApproverUid };

        if (isApproved) {
            updateData.approvedAt = nowServerTimestamp;
            updateData.approvedBy = currentApproverUid;
            updateData.startedAt = nowServerTimestamp;

            if (itemType === 'saving') {
                const savingMaturityDate = dayjs().add(item.days, 'day').toDate();
                updateData.maturityDate = savingMaturityDate;
                batch.update(studentRef, { "assets.deposit": increment(item.amount) });
            } else { // 'loan'
                const loanApprovalClientTime = dayjs();
                updateData.actualRepaymentDate = loanApprovalClientTime.add(item.days, 'day').toDate();
                batch.update(studentRef, { "assets.cash": increment(item.amount), "assets.loan": increment(item.amount) });
            }
        } else {
            updateData.rejectedAt = nowServerTimestamp;
            updateData.rejectedBy = currentApproverUid;
        }

        batch.update(itemRef, updateData);

        try {
            await batch.commit();
            setAlertInfo({ open: true, message: `${item.studentName}님의 ${itemType} 신청이 성공적으로 ${actionText}되었습니다.`, type: "success" });
            await fetchPendingApplications();
            if (onActionProcessed) onActionProcessed();
        } catch (error) {
            console.error(`[ApprovalModal] ${itemType} ${actionText} 처리 오류:`, error, item);
            setAlertInfo({ open: true, message: `[${item.productLabel}] ${itemType} ${actionText} 처리 중 오류: ${error.message}`, type: "error" });
        } finally {
            setIsLoading(false);
        }
    }, [classId, currencyUnit, onActionProcessed, fetchPendingApplications, activeSubTab, setIsLoading, setAlertInfo]);

    const renderPendingList = (items, itemTypeForAction) => {
        if (isLoading && items.length === 0) return <div className="flex justify-center py-4"><Spinner /></div>;
        if (!isLoading && items.length === 0) return <p className="text-gray-500 text-center py-4">승인 대기 중인 신청이 없습니다.</p>;
        if (items.length === 0) return null;

        return (
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {items.map((item) => (
                    <li key={item.id} className="p-3 border rounded-lg shadow-sm bg-slate-50 hover:bg-slate-100">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <p className="font-semibold text-indigo-700">{item.studentName} (UID: {item.studentUid?.substring(0, 5)}...)</p>
                                <p className="text-sm text-slate-600">
                                    상품: <span className="font-medium">{item.productLabel}</span> /
                                    금액: <span className="font-medium">{item.amount?.toLocaleString()}{currencyUnit}</span>
                                </p>
                                <div className="text-xs text-slate-500 mt-1">
                                    {itemTypeForAction === 'saving' ? (
                                        <p>기간 이율: {(item.finalRate ?? item.rate ?? 0).toFixed(2)}% | 예상 이자: {(item.interestCalculatedOnRequest ?? 0).toLocaleString()}{currencyUnit}</p>
                                    ) : (
                                        <p>기간 이율: {(item.finalPeriodRate ?? item.basePeriodRate ?? 0).toFixed(2)}% | 예상 총이자: {(item.interestCalculatedOnRequest ?? 0).toLocaleString()}{currencyUnit}</p>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400">
                                    신청일: {item.clientRequestedAt?.toDate ? dayjs(item.clientRequestedAt.toDate()).format("YYYY-MM-DD HH:mm") : (item.createdAt?.toDate ? dayjs(item.createdAt.toDate()).format("YYYY-MM-DD HH:mm") : '날짜 정보 없음')}
                                </p>
                            </div>
                            <div className="flex gap-2 mt-2 sm:mt-0 flex-shrink-0">
                                <Button onClick={() => handleApproval(item, itemTypeForAction, true)} color="green" size="sm" icon={CheckCircleIcon}>승인</Button>
                                <Button onClick={() => handleApproval(item, itemTypeForAction, false)} color="red" variant="secondary" size="sm" icon={XCircleIcon}>거절</Button>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        );
    };

    console.log(`[ApprovalModal] RENDERING. isOpen: ${isOpen}, prop activeSubTab: ${activeSubTab}, isLoading: ${isLoading}`);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="은행 거래 승인 관리">
            {alertInfo.open && <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))} className="mb-4" />}

            <div className="mb-4 border-b">
                <nav className="flex space-x-2">
                    <Button
                        variant={activeSubTab === 'savings' ? 'primary' : 'tertiary'}
                        color={activeSubTab === 'savings' ? 'indigo' : 'slate'}
                        onClick={() => {
                            if (onSubTabChange) onSubTabChange('savings'); // ✨ prop으로 받은 함수 호출
                        }}
                        size="sm"
                        className={`py-2 px-3 text-sm font-medium text-center rounded-t-md ${activeSubTab === 'savings' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        예금 승인 ({pendingSavings.length})
                    </Button>
                    <Button
                        variant={activeSubTab === 'loans' ? 'primary' : 'tertiary'}
                        color={activeSubTab === 'loans' ? 'indigo' : 'slate'}
                        onClick={() => {
                            if (onSubTabChange) onSubTabChange('loans'); // ✨ prop으로 받은 함수 호출
                        }}
                        size="sm"
                        className={`py-2 px-3 text-sm font-medium text-center rounded-t-md ${activeSubTab === 'loans' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        대출 승인 ({pendingLoans.length})
                    </Button>
                </nav>
            </div>

            {isLoading && (pendingSavings.length === 0 && pendingLoans.length === 0) ? ( // 목록이 모두 비어있고 로딩중일때만
                <div className="flex justify-center py-10"><Spinner /><p className="ml-2">승인 대기 목록 로딩중...</p></div>
            ) : (
                <>
                    {activeSubTab === 'savings' && (
                        <section>
                            <h3 className="text-lg font-semibold text-green-700 mb-3">💰 승인 대기 예금</h3>
                            {renderPendingList(pendingSavings, 'saving')}
                        </section>
                    )}
                    {activeSubTab === 'loans' && (
                        <section>
                            <h3 className="text-lg font-semibold text-blue-700 mb-3">💳 승인 대기 대출</h3>
                            {renderPendingList(pendingLoans, 'loan')}
                        </section>
                    )}
                </>
            )}

            <div className="mt-6 text-right">
                <Button onClick={onClose} variant="secondary">닫기</Button>
            </div>
        </Modal>
    );
}