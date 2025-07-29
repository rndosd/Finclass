import { db } from '../../../firebase';
import {
    doc,
    collection,
    runTransaction,
    serverTimestamp,
    increment,
    setDoc
} from 'firebase/firestore';

export const makeDonation = async ({ classId, userId, userName, amount }) => {
    const studentDocRef = doc(db, `classes/${classId}/students/${userId}`);
    const donationColRef = collection(db, `classes/${classId}/donations`);
    const newDonationDocRef = doc(donationColRef);

    try {
        console.log("🚀 [makeDonation] runTransaction 시작");

        await runTransaction(db, async (transaction) => {
            console.log("📍 [makeDonation] 트랜잭션 내부 진입 성공");

            const studentDoc = await transaction.get(studentDocRef);
            console.log("📍 [makeDonation] studentDoc:", studentDoc.exists ? "존재함" : "존재 안 함");

            if (!studentDoc.exists) {
                throw new Error("기부할 학생 정보를 찾을 수 없습니다.");
            }

            const currentCash = studentDoc.data().assets?.cash ?? 0;
            console.log(`📍 [makeDonation] currentCash: ${currentCash}, 기부할 금액: ${amount}`);

            if (currentCash < amount) {
                throw new Error("보유한 현금이 기부할 금액보다 적습니다.");
            }

            console.log("📍 [makeDonation] assets.cash 차감 시도");

            transaction.update(studentDocRef, {
                'assets.cash': increment(-amount)
            });

            console.log("📍 [makeDonation] donations 문서 생성 시도");

            transaction.set(newDonationDocRef, {
                amount: amount,
                donatorUid: userId,
                donatorName: userName,
                studentUid: userId,              // ⭐ 추가
                classId: classId,                 // ⭐ 추가
                donatedAt: serverTimestamp()
            });

            console.log("✅ [makeDonation] 트랜잭션 내부 완료");
        });

        console.log("✅ [makeDonation] 트랜잭션 전체 성공");
        return { success: true, message: "따뜻한 마음을 나눠주셔서 감사합니다! 기부가 완료되었습니다." };

    } catch (error) {
        console.error("❌ [makeDonation] 트랜잭션 실패:", error);
        return { success: false, message: error.message || "기부 처리 중 오류가 발생했습니다." };
    }
};

/**
 * 기부 목표 금액을 설정(업데이트)하는 서비스 함수
 * @param {object} params
 * @param {string} params.classId
 * @param {number} params.newGoal
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const setDonationGoal = async ({ classId, newGoal }) => {
    const goalAmount = Number(newGoal);
    if (!classId || isNaN(goalAmount) || goalAmount < 0) {
        return { success: false, message: "유효하지 않은 목표 금액입니다." };
    }

    try {
        const summaryDocRef = doc(db, `classes/${classId}/dashboardSummary/donationSummary`);
        // merge: true 옵션으로 기존 필드는 유지하고 goalAmount 필드만 추가/업데이트
        await setDoc(summaryDocRef, { goalAmount: goalAmount }, { merge: true });

        return { success: true, message: "기부 목표가 성공적으로 설정되었습니다." };
    } catch (error) {
        console.error("Error setting donation goal:", error);
        return { success: false, message: "목표 설정 중 오류가 발생했습니다." };
    }
};