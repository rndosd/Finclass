import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase'; // Firebase 경로 확인
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function useStudentBankData(uid, classId, savingsSortOrder = "desc", loansSortOrder = "desc") {
    const [studentAssets, setStudentAssets] = useState({ cash: 0, deposit: 0, loan: 0, stockValue: 0 }); const [studentInfo, setStudentInfo] = useState({ name: "학생" });
    const [creditScore, setCreditScore] = useState("-");
    const [savings, setSavings] = useState([]);
    const [loans, setLoans] = useState([]);
    const [isLoadingStudentData, setIsLoadingStudentData] = useState(true);
    const [studentDataError, setStudentDataError] = useState(null);

    const fetchStudentData = useCallback(async () => {
        if (!uid || !classId) {
            setIsLoadingStudentData(false);
            setStudentDataError(new Error("학생 UID 또는 학급 ID가 제공되지 않았습니다."));
            // 기본값으로 초기화 또는 빈 값으로 설정
            setStudentAssets({ cash: 0, deposit: 0, loan: 0 });
            setStudentInfo({ name: "정보없음" });
            setCreditScore("-");
            setSavings([]);
            setLoans([]);
            return;
        }

        setIsLoadingStudentData(true);
        setStudentDataError(null);
        try {
            const studentDocRef = doc(db, "classes", classId, "students", uid);
            const savingsCollectionRef = collection(db, "classes", classId, "students", uid, "savings");
            const loansCollectionRef = collection(db, "classes", classId, "students", uid, "loans");

            const savingsQuery = query(savingsCollectionRef, orderBy("createdAt", savingsSortOrder));
            const loansQuery = query(loansCollectionRef, orderBy("createdAt", loansSortOrder));

            const [studentSnap, savingsSnap, loansSnap] = await Promise.all([
                getDoc(studentDocRef),
                getDocs(savingsQuery),
                getDocs(loansQuery),
            ]);

            if (studentSnap.exists()) {
                const d = studentSnap.data();

                /* ── stockValue 객체({ value }) → 숫자 ── */
                const a = d.assets || {};
                const { cash = 0, deposit = 0, loan = 0 } = a;
                const stockValue = Number(a.stockValue?.value) || 0;

                setStudentAssets({ cash, deposit, loan, stockValue });
                setStudentInfo({ name: d.name || `학생 ${uid.substring(0, 5)}` });
                setCreditScore(d.creditScore ?? "-");
            } else {
                console.warn(`Student document for uid ${uid} in class ${classId} not found.`);
                setStudentAssets({ cash: 0, deposit: 0, loan: 0 });
                setStudentInfo({ name: "정보없음" });
                setCreditScore("-");
                // 여기에 isMyBankPage 같은 조건부 알림은 Bank.jsx에서 처리하도록 함
            }
            setSavings(savingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoans(loansSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error("Error fetching student bank data:", error);
            setStudentDataError(error);
        } finally {
            setIsLoadingStudentData(false);
        }
    }, [uid, classId, savingsSortOrder, loansSortOrder]);

    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]); // fetchStudentData는 uid, classId 등에 의존

    return { studentAssets, studentInfo, creditScore, savings, loans, isLoadingStudentData, studentDataError, refreshStudentData: fetchStudentData };
}