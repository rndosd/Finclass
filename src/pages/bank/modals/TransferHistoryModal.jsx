// src/pages/bank/modals/TransferHistoryModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Spinner } from '../../../components/ui';
import { db } from '../../../firebase';
import {
    collection, query, where, orderBy, limit, startAfter, getDocs
} from 'firebase/firestore';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import { useFeedback } from '../../../contexts/FeedbackContext'; // ✅ 전역 피드백 훅 사용

const ITEMS_PER_PAGE = 5;

export default function TransferHistoryModal({ isOpen, onClose, classId, uid, currencyUnit }) {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const { showFeedback } = useFeedback(); // ✅ 전역 피드백 훅 호출

    const dateField = 'date';

    const fetchHistoryData = useCallback(async (isInitialLoad = false, currentLastDoc = null) => {
        if (!classId || !uid) return;

        if (isInitialLoad) {
            setIsLoading(true);
        } else {
            if (!currentLastDoc) {
                setHasMore(false);
                setIsLoadingMore(false);
                return;
            }
            setIsLoadingMore(true);
        }

        try {
            const logsRef = collection(db, `classes/${classId}/students/${uid}/transferLogs`);
            const q = query(
                logsRef,
                // where("type", "==", "transfer"), // ✅ 제거 - type은 'sent' 또는 'received'
                orderBy(dateField, "desc"),
                ...(isInitialLoad ? [limit(ITEMS_PER_PAGE)] : [startAfter(currentLastDoc), limit(ITEMS_PER_PAGE)])
            );

            const snapshot = await getDocs(q);
            const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (isInitialLoad) {
                setHistory(fetchedItems);
            } else {
                setHistory(prev => [...prev, ...fetchedItems]);
            }

            if (snapshot.docs.length > 0) {
                setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
            }

            setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error("[TransferHistoryModal] 송금 내역 로드 오류:", error);
            showFeedback({ message: '송금 내역을 불러오는 데 실패했습니다.', type: 'error' });
            if (isInitialLoad) setHistory([]);
            setHasMore(false);
        } finally {
            if (isInitialLoad) setIsLoading(false);
            else setIsLoadingMore(false);
        }
    }, [classId, uid, showFeedback]);

    useEffect(() => {
        if (isOpen && classId && uid) {
            setHistory([]);
            setLastVisibleDoc(null);
            setHasMore(true);
            fetchHistoryData(true, null);
        } else if (!isOpen) {
            setHistory([]);
            setLastVisibleDoc(null);
            setHasMore(true);
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [isOpen, classId, uid, fetchHistoryData]);

    const handleLoadMore = () => {
        if (!isLoadingMore && hasMore && lastVisibleDoc) {
            fetchHistoryData(false, lastVisibleDoc);
        }
    };

    const renderHistoryItem = (item) => {
        const isSent = item.type === 'sent'; // ✅ 수정: action → type
        // ✅ 수정: 올바른 이름 필드 사용
        const counterpartyName = isSent
            ? item.receiverName || '정보 없음'  // 보낸 경우 → 받는 사람 이름
            : item.senderName || '정보 없음';   // 받은 경우 → 보낸 사람 이름
        const dateValue = item[dateField]?.toDate?.();
        const formattedDate = dateValue ? dayjs(dateValue).format('YYYY-MM-DD HH:mm') : '날짜 없음';

        return (
            <li key={item.id} className="p-3 sm:p-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                <div className="flex justify-between items-center space-x-3">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                        {isSent
                            ? <ArrowUpIcon className="h-5 w-5 text-red-500" />
                            : <ArrowDownIcon className="h-5 w-5 text-green-500" />}
                        <div>
                            <p className="text-sm font-medium text-slate-800">{counterpartyName}</p>
                            <p className="text-xs text-slate-500">{formattedDate}</p>
                        </div>
                    </div>
                    <div className={`text-sm font-bold ${isSent ? 'text-red-600' : 'text-green-600'}`}>
                        {isSent ? '-' : '+'}
                        {Math.abs(item.amount || 0).toLocaleString()} {currencyUnit}
                    </div>
                </div>
            </li>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="송금 내역" size="lg">
            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Spinner size="md" />
                    <p className="ml-2 text-slate-500">송금 내역을 불러오는 중...</p>
                </div>
            ) : history.length === 0 ? (
                <p className="text-center text-slate-500 py-10">송금 내역이 없습니다.</p>
            ) : (
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                    {history.map(renderHistoryItem)}
                </ul>
            )}

            {!isLoading && hasMore && history.length > 0 && (
                <div className="mt-6 text-center">
                    <Button onClick={handleLoadMore} disabled={isLoadingMore} variant="outline" color="slate">
                        {isLoadingMore && <Spinner size="sm" className="mr-2" />}
                        더보기
                    </Button>
                </div>
            )}

            <div className="mt-6 text-right">
                <Button onClick={onClose} variant="secondary">닫기</Button>
            </div>
        </Modal>
    );
}
