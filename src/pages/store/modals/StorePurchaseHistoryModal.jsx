// src/pages/store/modals/StorePurchaseHistoryModal.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Button, Spinner, Alert } from '../../../components/ui';
import { db } from '../../../firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import dayjs from 'dayjs';

const StorePurchaseHistoryModal = ({ isOpen, onClose }) => {
  const { classId, userData } = useUser();
  const userId = userData?.uid;

  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !classId || !userId) return;

    setIsLoading(true);
    setError(null);

    const baseCollection = collection(db, `classes/${classId}/storeRedemptions`);

    // 🚀 7일 전 timestamp 계산
    const sevenDaysAgo = Timestamp.fromDate(dayjs().subtract(7, 'day').startOf('day').toDate());

    const q = query(
      baseCollection,
      where("studentUid", "==", userId),
      where("requestDate", ">=", sevenDaysAgo),
      orderBy("requestDate", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPurchaseHistory(data);
      setIsLoading(false);
    }, (err) => {
      console.error("StorePurchaseHistoryModal → 구독 오류:", err);
      setError("구매 내역을 불러오는 중 오류가 발생했습니다.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, classId, userId]);

  // 🚀 총 구매 수량 계산
  const totalQuantity = useMemo(() => {
    return purchaseHistory.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [purchaseHistory]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="🛍️ 최근 1주일 구매 내역">
      {isLoading ? (
        <div className="p-5 text-center">
          <Spinner message="구매 내역 로딩 중..." />
        </div>
      ) : error ? (
        <Alert type="error" message={error} className="m-4" />
      ) : purchaseHistory.length === 0 ? (
        <p className="text-sm text-slate-500 py-5 text-center">
          최근 1주일 동안 구매한 기록이 없습니다.
        </p>
      ) : (
        <>
          {/* 🚀 총 구매 수량 표시 */}
          <div className="text-sm text-slate-600 px-3 py-2">
            총 구매 수량: <span className="font-bold">{totalQuantity}</span> 개
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-slate-700 border border-slate-200">
              <thead className="bg-slate-100 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-3 py-2 border">상품명</th>
                  <th className="px-3 py-2 border text-center">수량</th>
                  <th className="px-3 py-2 border text-right">단가</th>
                  <th className="px-3 py-2 border text-right">총액</th>
                  <th className="px-3 py-2 border text-center">구매일</th>
                  <th className="px-3 py-2 border text-center">상태</th>
                  <th className="px-3 py-2 border">취소 사유</th>
                </tr>
              </thead>
              <tbody>
                {purchaseHistory.map(item => (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2 border font-semibold text-slate-800">
                      {item.itemName}
                    </td>
                    <td className="px-3 py-2 border text-center">
                      {item.quantity} 개
                    </td>
                    <td className="px-3 py-2 border text-right">
                      {item.pricePerItem?.toLocaleString()} {item.currencyUnit}
                    </td>
                    <td className="px-3 py-2 border text-right">
                      {item.totalAmount?.toLocaleString()} {item.currencyUnit}
                    </td>
                    <td className="px-3 py-2 border text-center text-slate-500">
                      {item.requestDate?.toDate
                        ? item.requestDate.toDate().toLocaleString()
                        : '날짜 없음'}
                    </td>
                    <td className="px-3 py-2 border text-center">
                      {item.status === "redeemed" && (
                        <span className="text-green-600 font-semibold">지급 완료</span>
                      )}
                      {item.status === "pending" && (
                        <span className="text-yellow-600 font-semibold">미지급</span>
                      )}
                      {item.status === "cancelled" && (
                        <span className="text-red-600 font-semibold">취소됨</span>
                      )}
                    </td>
                    <td className="px-3 py-2 border text-sm">
                      {item.status === "cancelled"
                        ? (item.cancellationReason ? item.cancellationReason : '취소 사유 없음')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex justify-end mt-6 px-5 pb-5">
        <Button variant="outline" onClick={onClose}>닫기</Button>
      </div>
    </Modal>
  );
};

export default StorePurchaseHistoryModal;
