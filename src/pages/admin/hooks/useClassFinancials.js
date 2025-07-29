import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { collection, collectionGroup, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';

/**
 * 학생 목록과 예금/대출 데이터를 받아, 학생별 은행 이용 현황을 계산하는 헬퍼 함수
 * @param {Array} students - 학생 목록 배열
 * @param {Array} activeSavings - 활성 예금 목록 배열
 * @param {Array} activeLoans - 진행 중인 대출 목록 배열
 * @returns {Array} 각 학생의 은행 현황이 포함된 배열
 */
const processBankStatus = (students, activeSavings, activeLoans) => {
    // 1. 학생 데이터를 Map으로 변환하여 빠른 조회를 준비합니다.
    const studentMap = new Map(students.map(s => [s.uid, {
        ...s,
        savingsCount: 0,
        totalSavingsAmount: 0,
        loanCount: 0,
        totalLoanAmount: 0,
    }]));

    // 2. 예금 및 대출 데이터를 순회하며 각 학생의 현황을 업데이트합니다.
    activeSavings.forEach(saving => {
        const student = studentMap.get(saving.requestedBy);
        if (student) {
            student.savingsCount += 1;
            student.totalSavingsAmount += saving.amount || 0;
        }
    });

    activeLoans.forEach(loan => {
        const student = studentMap.get(loan.requestedBy);
        if (student) {
            student.loanCount += 1;
            student.totalLoanAmount += loan.amount || 0;
        }
    });

    // 3. 교사/학생 정렬 후 최종 결과를 반환합니다.
    const finalData = Array.from(studentMap.values());
    finalData.sort((a, b) => {
        if (a.role === 'teacher' && b.role !== 'teacher') return -1;
        if (a.role !== 'teacher' && b.role === 'teacher') return 1;
        return (Number(a.studentNumber) || 999) - (Number(b.studentNumber) || 999);
    });

    return finalData;
};

/**
 * 학급의 전체 금융 활동 데이터를 불러오고 가공하는 커스텀 훅
 */
const useClassFinancials = () => {
    const { classId } = useUser();

    const [stockTrades, setStockTrades] = useState([]);
    const [storePurchases, setStorePurchases] = useState([]);
    const [bankStatusByStudent, setBankStatusByStudent] = useState([]);
    const [activeSavings, setActiveSavings] = useState([]);
    const [activeLoans, setActiveLoans] = useState([]);
    const [transferLogs, setTransferLogs] = useState([]);
    const [storeRedemptions, setStoreRedemptions] = useState([]); // 상품 지급 관리용

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!classId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 모든 데이터 요청을 병렬로 처리하여 로딩 속도 최적화
            const [
                studentsSnap,
                tradeSnap,
                purchaseSnap,
                savingsSnap,
                loansSnap,
                transfersSnap,
                redemptionsSnap
            ] = await Promise.all([
                getDocs(collection(db, `classes/${classId}/students`)),
                getDocs(query(collectionGroup(db, 'tradeHistory'), where('classId', '==', classId), orderBy('timestamp', 'desc'))),
                getDocs(query(collectionGroup(db, 'purchaseHistory'), where('classId', '==', classId), orderBy('timestamp', 'desc'))),
                getDocs(query(collectionGroup(db, 'savings'), where('classId', '==', classId), where('status', '==', 'active'))),
                getDocs(query(collectionGroup(db, 'loans'), where('classId', '==', classId), where('status', '==', 'ongoing'))),
                getDocs(query(collectionGroup(db, 'transferLogs'), where('classId', '==', classId), orderBy('date', 'desc'))),
                getDocs(query(collection(db, `classes/${classId}/storeRedemptions`), orderBy('redeemedAt', 'desc')))
            ]);

            // 학생 이름 조회를 위한 Map 생성
            const studentNameMap = new Map(studentsSnap.docs.map(d => [d.id, d.data().name || '이름없음']));

            // 송금 로그에 보낸 사람/받는 사람 이름 추가
            const processedTransfers = transfersSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    ...data,
                    senderName: studentNameMap.get(data.senderUid) || '알 수 없음',
                    receiverName: studentNameMap.get(data.receiverUid) || '알 수 없음',
                };
            });
            setTransferLogs(processedTransfers);

            // 은행 현황 데이터 가공
            const students = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
            const allActiveSavings = savingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const allActiveLoans = loansSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const processedBankStatus = processBankStatus(students, allActiveSavings, allActiveLoans);

            // 최종 상태 업데이트
            setStockTrades(tradeSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setStorePurchases(purchaseSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setStoreRedemptions(redemptionsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setActiveSavings(allActiveSavings);
            setActiveLoans(allActiveLoans);
            setBankStatusByStudent(processedBankStatus);

        } catch (err) {
            console.error("Error fetching class financial data:", err);
            setError("전체 금융 활동 데이터를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        if (classId) {
            fetchData();
        }
    }, [classId, fetchData]);

    return {
        stockTrades,
        storePurchases,
        storeRedemptions,
        bankStatusByStudent,
        activeSavings,
        activeLoans,
        transferLogs,
        isLoading,
        error,
        refreshData: fetchData
    };
};

export default useClassFinancials;