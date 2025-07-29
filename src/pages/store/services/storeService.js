import { db } from '../../../firebase';
import {
    doc,
    collection,
    writeBatch,
    increment,
    serverTimestamp,
    getDoc,
    addDoc,
    deleteDoc,
    runTransaction
} from 'firebase/firestore';

import { logStorePurchase, logPurchaseCancelled } from '../../../utils/logUtils';

/**
 * 학생이 상점에서 상품을 구매하는 로직 (트랜잭션 적용 및 purchaseHistory 사용)
 */
export const buyStoreItem = async ({
    classId,
    userId,
    studentName,
    itemId,
    itemData,
    quantityToBuy = 1,
    currencyUnit
}) => {
    // ... (파라미터 유효성 검사는 기존과 동일)

    const itemPrice = Number(itemData.price) || 0;
    const totalCost = itemPrice * quantityToBuy;

    const studentDocRef = doc(db, "classes", classId, "students", userId);
    const storeItemDocRef = doc(db, "classes", classId, "storeItems", itemId);

    // ⭐ 1. 저장할 컬렉션 경로를 'purchaseHistory'로 변경
    const newPurchaseRef = doc(collection(db, "classes", classId, "students", userId, "purchaseHistory"));

    // ⭐ 2. storeRedemptions 문서 ID는 purchaseHistory의 ID와 동일하게 사용
    const storeRedemptionRef = doc(db, "classes", classId, "storeRedemptions", newPurchaseRef.id);

    try {
        await runTransaction(db, async (transaction) => {
            const studentSnap = await transaction.get(studentDocRef);
            const storeItemSnap = await transaction.get(storeItemDocRef);

            if (!studentSnap.exists()) throw new Error("학생 정보를 찾을 수 없습니다.");
            if (!storeItemSnap.exists()) throw new Error("상품 정보를 찾을 수 없습니다.");

            const currentBalance = studentSnap.data().assets?.cash ?? 0;
            const currentItemData = storeItemSnap.data();

            if (currentBalance < totalCost) {
                throw new Error(`보유 현금이 부족합니다.`);
            }

            const currentStock = currentItemData.stock;
            if (currentStock !== -1 && currentStock < quantityToBuy) {
                throw new Error(`상품의 재고가 부족합니다.`);
            }

            // --- 쓰기 작업 예약 ---

            // 학생 화폐 차감
            transaction.update(studentDocRef, { "assets.cash": increment(-totalCost) });

            // 재고 차감 (무제한이 아닐 경우)
            if (currentStock !== -1) {
                transaction.update(storeItemDocRef, { stock: increment(-quantityToBuy) });
            }

            const purchaseTimestamp = serverTimestamp();
            const humanReadableDescription = `${studentName} 학생이 상점에서 "${itemData.name}" ${quantityToBuy}개를 ${totalCost.toLocaleString()} ${currencyUnit}에 구매했습니다.`;

            // ⭐ 3. 'purchaseHistory'에 구매 기록 저장
            transaction.set(newPurchaseRef, {
                classId, userId, studentName, humanReadableDescription,
                type: "STORE_PURCHASE", // 타입 명시
                details: { itemId, itemName: itemData.name, quantity: quantityToBuy, pricePerItem: itemPrice, totalAmount: totalCost, currencyUnit },
                isRedeemed: false, // 이 기록 자체는 '지급'과는 무관하지만, 상태를 함께 기록할 수 있음
                isCancelled: false,
                timestamp: purchaseTimestamp,
                actorUid: userId
            });

            // 4. storeRedemptions 기록 (상품 지급 요청 목록)
            transaction.set(storeRedemptionRef, {
                studentUid: userId, studentName, itemId, itemName: itemData.name,
                quantity: quantityToBuy, totalAmount: totalCost, currencyUnit,
                requestDate: purchaseTimestamp,
                originalPurchaseId: newPurchaseRef.id, // ⭐ originalTradeId -> originalPurchaseId
                status: "pending"
            });
        });

        return { success: true, message: `"${itemData.name}" ${quantityToBuy}개 구매가 완료되었습니다!` };

    } catch (error) {
        console.error(`[buyStoreItem] Error purchasing item:`, error);
        return { success: false, message: error.message || "상품 구매 중 오류가 발생했습니다." };
    }
};

/**
 * 관리자에 의한 구매 취소 (환불 포함, 트랜잭션 최종 수정본)
 */
export const cancelStorePurchase = async ({
    classId,
    studentUid,
    purchaseId, // storeRedemptions 문서의 ID
    adminUid,
    reason
}) => {
    if (!classId || !studentUid || !purchaseId || !adminUid) {
        return { success: false, message: "필수 정보가 누락되었습니다." };
    }

    try {
        await runTransaction(db, async (transaction) => {
            // --- 1. 모든 읽기 작업 (READ Phase) ---

            const redemptionDocRef = doc(db, "classes", classId, "storeRedemptions", purchaseId);
            const studentDocRef = doc(db, "classes", classId, "students", studentUid);

            const redemptionSnap = await transaction.get(redemptionDocRef);
            if (!redemptionSnap.exists()) throw new Error("지급 관리 문서를 찾을 수 없습니다.");

            const redemptionData = redemptionSnap.data();
            if (redemptionData.status !== 'pending') throw new Error("이미 처리된 항목입니다.");

            const originalPurchaseId = redemptionData.originalPurchaseId;
            const originalPurchaseDocRef = doc(db, "classes", classId, "students", studentUid, "purchaseHistory", originalPurchaseId);
            const originalPurchaseSnap = await transaction.get(originalPurchaseDocRef);
            if (!originalPurchaseSnap.exists()) throw new Error("원본 구매 기록을 찾을 수 없습니다.");

            const purchaseTxData = originalPurchaseSnap.data();
            const quantityToRestore = Number(purchaseTxData.details.quantity) || 0;
            const itemIdToRestore = purchaseTxData.details.itemId;


            let storeItemSnap = null;
            let storeItemDocRef = null;
            if (itemIdToRestore && quantityToRestore > 0) {
                storeItemDocRef = doc(db, "classes", classId, "storeItems", itemIdToRestore);
                storeItemSnap = await transaction.get(storeItemDocRef);
            }

            // --- 모든 읽기 완료 ---

            // --- 2. 모든 쓰기 작업 (WRITE Phase) ---

            const refundAmount = Number(purchaseTxData.details.totalAmount) || 0;
            const finalReason = reason?.trim() || "관리자에 의해 취소되었습니다.";

            // 학생 자산 환불
            if (refundAmount > 0) {
                transaction.update(studentDocRef, { "assets.cash": increment(refundAmount) });
            }

            // 상품 재고 복구
            if (storeItemSnap && storeItemSnap.exists()) {
                const itemData = storeItemSnap.data();
                if (itemData.stock !== -1) { // 재고가 무제한이 아닐 경우
                    transaction.update(storeItemDocRef, { stock: increment(quantityToRestore) });
                }
            }

            // 원본 purchaseHistory 문서 상태 업데이트
            transaction.update(originalPurchaseDocRef, {
                isCancelled: true,
                cancellationReason: finalReason,
                cancelledAt: serverTimestamp(),
                cancelledBy: adminUid
            });

            // storeRedemptions 문서 상태 업데이트
            transaction.update(redemptionDocRef, {
                status: "cancelled",
                cancellationReason: finalReason,
                cancelledAt: serverTimestamp(),
                cancelledBy: adminUid
            });

            // 새로운 '구매 취소' 기록을 purchaseHistory에 추가
            const newCancelRecordRef = doc(collection(db, `classes/${classId}/students/${studentUid}/purchaseHistory`));
            const humanReadableDescription = `관리자가 "${purchaseTxData.details.itemName}" 구매를 취소하고 ${refundAmount.toLocaleString()}을(를) 환불했습니다.`;
            transaction.set(newCancelRecordRef, {
                classId,
                userId: studentUid,
                studentName: redemptionData.studentName,
                humanReadableDescription,
                type: 'STORE_PURCHASE_CANCELLED',
                details: { cancelledPurchaseId: originalPurchaseId, reason: finalReason, refundAmount, quantityRestored: quantityToRestore, },
                timestamp: serverTimestamp(),
                actorUid: adminUid,
            });
        });

        return { success: true, message: `구매가 성공적으로 취소 및 환불되었습니다.` };

    } catch (error) {
        console.error("Error cancelling store purchase:", error);
        return { success: false, message: `구매 취소 처리 중 오류: ${error.message}` };
    }
};