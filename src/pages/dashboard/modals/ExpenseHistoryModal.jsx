// src/pages/dashboard/modals/ExpenseHistoryModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Spinner, Button } from '../../../components/ui';
import { db } from '../../../firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';

const ExpenseHistoryModal = ({ isOpen, onClose, classId }) => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { classData } = useUser(); // 학급 화폐 단위를 가져오기 위해
    const currencyUnit = classData?.currencyUnit || '단위';

    useEffect(() => {
        // 모달이 열릴 때만 데이터를 불러옵니다.
        if (isOpen && classId) {
            const fetchHistory = async () => {
                setIsLoading(true);
                try {
                    const historyColRef = collection(db, `classes/${classId}/taxUsageHistory`);
                    // 'usedAt' 필드를 기준으로 최신순으로 정렬
                    const q = query(historyColRef, orderBy('usedAt', 'desc'));

                    const snapshot = await getDocs(q);
                    const loadedHistory = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setHistory(loadedHistory);
                } catch (error) {
                    console.error("Error fetching tax usage history:", error);
                    setHistory([]); // 오류 발생 시 빈 배열로 설정
                } finally {
                    setIsLoading(false);
                }
            };
            fetchHistory();
        }
    }, [isOpen, classId]); // 모달이 열리거나 classId가 변경될 때마다 실행

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="세금 지출 전체 내역" size="lg">
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Spinner />
                    </div>
                ) : history.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">기록된 지출 내역이 없습니다.</p>
                ) : (
                    <ul className="space-y-3">
                        {history.map(item => (
                            <li key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-slate-800 break-all">{item.reason}</p>
                                    <p className="text-lg font-bold text-red-600 ml-4 whitespace-nowrap">
                                        - {item.amountUsed.toLocaleString()} {currencyUnit}
                                    </p>
                                </div>
                                <div className="text-right mt-1">
                                    <span className="text-xs text-slate-500">
                                        {/* 'usedAt' 필드가 없다면 recordedBy 정보라도 표시 */}
                                        {item.usedAt ? item.usedAt.toDate().toLocaleString('ko-KR') : `기록자: ${item.recordedBy}`}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t">
                <Button onClick={onClose} variant="secondary">닫기</Button>
            </div>
        </Modal>
    );
};

export default ExpenseHistoryModal;