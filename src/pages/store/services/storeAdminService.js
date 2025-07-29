import { db } from '../../../firebase';
import {
    doc,
    writeBatch,
    serverTimestamp,
    getDoc,
    deleteDoc,
    collection,
    query,
    where,
    limit,
    getDocs,
    runTransaction // ⭐ 트랜잭션 사용을 위해 import
} from 'firebase/firestore';

/**
 * 학생의 상품 구매를 '지급 완료'로 처리합니다. (트랜잭션 적용)
 * @param {object} params
 * @param {string} params.classId
 * @param {string} params.studentUid
 * @param {string} params.purchaseId - storeRedemptions 문서의 ID
 * @param {string} params.adminUid
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const markPurchaseAsRedeemed = async ({
    classId,
    studentUid,
    purchaseId,
    adminUid
}) => {
    if (!classId || !studentUid || !purchaseId || !adminUid) {
        return { success: false, message: "필수 정보가 누락되었습니다." };
    }

    const redemptionDocRef = doc(db, "classes", classId, "storeRedemptions", purchaseId);

    try {
        await runTransaction(db, async (transaction) => {
            // --- 1. 읽기 작업 ---
            const redemptionSnap = await transaction.get(redemptionDocRef);

            if (!redemptionSnap.exists()) {
                throw new Error("상품 지급 요청을 찾을 수 없습니다.");
            }

            const redemptionData = redemptionSnap.data();
            if (redemptionData.status !== 'pending') {
                throw new Error("이미 처리(지급 완료 또는 취소)된 항목입니다.");
            }

            const originalPurchaseId = redemptionData.originalPurchaseId;
            const purchaseDocRef = doc(db, "classes", classId, "students", studentUid, "purchaseHistory", originalPurchaseId);

            // --- 2. 쓰기 작업 ---
            const timestamp = serverTimestamp();

            // purchaseHistory 문서 업데이트
            transaction.update(purchaseDocRef, {
                isRedeemed: true,
                redeemedAt: timestamp,
                redeemedBy: adminUid
            });

            // storeRedemptions 문서 업데이트
            transaction.update(redemptionDocRef, {
                status: "redeemed",
                redeemedAt: timestamp,
                redeemedBy: adminUid
            });
        });

        return { success: true, message: "상품 지급 완료로 처리되었습니다." };

    } catch (error) {
        console.error("Error marking purchase as redeemed:", error);
        return { success: false, message: `지급 완료 처리 중 오류: ${error.message}` };
    }
};

/**
 * 상점 카테고리를 삭제합니다. (안전장치 포함)
 * @param {object} params
 * @param {string} params.classId
 * @param {string} params.categoryId
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const deleteStoreCategory = async ({ classId, categoryId }) => {
    if (!classId || !categoryId) {
        return { success: false, message: '필수 정보가 누락되었습니다.' };
    }

    try {
        // ⭐ 안전장치: 삭제하려는 카테고리에 속한 상품이 있는지 확인
        const itemsRef = collection(db, `classes/${classId}/storeItems`);
        const q = query(itemsRef, where("categoryId", "==", categoryId), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            return { success: false, message: '해당 카테고리에 속한 상품이 있어 삭제할 수 없습니다. 먼저 상품들을 다른 카테고리로 옮기거나 삭제해주세요.' };
        }

        // 속한 상품이 없을 때만 카테고리 삭제 실행
        const categoryDocRef = doc(db, `classes/${classId}/storeCategories`, categoryId);
        await deleteDoc(categoryDocRef);

        return { success: true, message: '카테고리가 성공적으로 삭제되었습니다.' };
    } catch (error) {
        console.error('Error deleting category:', error);
        return { success: false, message: `카테고리 삭제 중 오류가 발생했습니다.` };
    }
};