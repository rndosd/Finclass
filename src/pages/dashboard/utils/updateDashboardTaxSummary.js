import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';

export async function updateDashboardTaxSummary(classId) {
    try {
        console.log('🚀 세금 Summary 업데이트 시작...');

        // 학생 UIDs 가져오기
        const studentUids = await getStudentUids(classId);

        // salaryTax 계산
        const salaryTax = await calculateSalaryTax(classId, studentUids);

        // manualTaxPaid 계산
        const manualTaxPaid = await calculateManualTaxPaid(classId);

        // stockExchangeFee 계산
        const stockExchangeFee = await calculateClassStockExchangeFee(classId, studentUids);

        // expense 계산
        const expense = await calculateTaxExpense(classId);

        const balance = salaryTax + manualTaxPaid + stockExchangeFee - expense;

        await setDoc(doc(db, `classes/${classId}/dashboardSummary/taxSummary`), {
            salaryTax,
            manualTaxPaid,
            stockExchangeFee,
            expense,
            balance,
            updatedAt: new Date()
        });

        console.log('✅ 세금 Summary 업데이트 완료!');
        return true;

    } catch (error) {
        console.error('❌ 세금 Summary 업데이트 실패:', error);
        return false;
    }
}

// 👉 학생 UIDs 가져오기
async function getStudentUids(classId) {
    const studentsRef = collection(db, `classes/${classId}/students`);
    const snapshot = await getDocs(studentsRef);
    const uids = [];
    snapshot.forEach(doc => {
        uids.push(doc.id);
    });
    return uids;
}

// 👉 salaryTax 계산
async function calculateSalaryTax(classId, studentUids) {
    let totalSalaryTax = 0;

    for (const uid of studentUids) {
        const paySlipsRef = collection(db, `classes/${classId}/students/${uid}/paySlips`);
        const snapshot = await getDocs(paySlipsRef);

        snapshot.forEach(doc => {
            const data = doc.data();
            const taxes = data.taxes || [];
            taxes.forEach(tax => {
                totalSalaryTax += tax.amount || 0;
            });
        });
    }

    return totalSalaryTax;
}

// 👉 manualTaxPaid 계산
async function calculateManualTaxPaid(classId) {
    const taxPaymentRef = collection(db, `classes/${classId}/taxPaymentHistory`);
    const snapshot = await getDocs(taxPaymentRef);

    let manualTaxPaid = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        manualTaxPaid += data.amountPaid || 0;
    });

    return manualTaxPaid;
}

// 👉 stockExchangeFee 계산
async function calculateClassStockExchangeFee(classId, studentUids) {
    const feeTypes = [
        "EXCHANGE_BIL_TO_USD",
        "EXCHANGE_USD_TO_BIL",
        "STOCK_BUY_USD",
        "STOCK_SELL_USD"
    ];

    let totalFee = 0;

    for (const uid of studentUids) {
        const transactionsRef = collection(db, `classes/${classId}/students/${uid}/transactions`);
        const q = query(
            transactionsRef,
            where('type', 'in', feeTypes),
            where('feeAmount', '>', 0)
        );

        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            const data = doc.data();
            totalFee += data.feeAmount || 0;
        });
    }

    return totalFee;
}

// 👉 expense 계산
async function calculateTaxExpense(classId) {
    const taxUsageRef = collection(db, `classes/${classId}/taxUsageHistory`);
    const snapshot = await getDocs(taxUsageRef);

    let expense = 0;
    snapshot.forEach(doc => {
        const data = doc.data();
        expense += data.amountUsed || 0;
    });

    return expense;
}


/**
 * 교사가 입력한 세금 지출 내역을 Firestore에 기록합니다.
 * @param {object} params
 * @param {string} params.classId
 * @param {number} params.amountUsed
 * @param {string} params.reason
 * @param {string} params.actorUid
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const recordTaxExpense = async ({ classId, amountUsed, reason, actorUid }) => {
    if (!classId || !amountUsed || !reason || !actorUid) {
        return { success: false, message: "필수 정보(금액, 사유)가 누락되었습니다." };
    }
    if (amountUsed <= 0) {
        return { success: false, message: "지출 금액은 0보다 커야 합니다." };
    }

    try {
        const historyColRef = collection(db, `classes/${classId}/taxUsageHistory`);
        await addDoc(historyColRef, {
            amountUsed: Number(amountUsed),
            reason: reason,
            usedAt: serverTimestamp(), // 지출 기록 시점
            recordedBy: actorUid,
        });
        return { success: true, message: "지출 내역이 성공적으로 기록되었습니다." };
    } catch (error) {
        console.error("Error recording tax expense:", error);
        return { success: false, message: "지출 내역 기록 중 오류가 발생했습니다." };
    }
};