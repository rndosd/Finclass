// src/pages/stock/hooks/useStockUserData.js
import { useState, useEffect, useCallback } from 'react'; // useCallback 제거 가능성
import { auth, db } from '../../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, collection, onSnapshot, query } from 'firebase/firestore'; // getDoc은 이제 직접 안 쓸 수 있음
import { useUser } from '../../../contexts/UserContext';

const useStockUserData = () => {
    const { classId, userData: studentDataFromContext, loading: contextLoading } = useUser();
    const [authUser, authLoading, authError] = useAuthState(auth);

    const [balanceBIL, setBalanceBIL] = useState(null);
    const [balanceUSD, setBalanceUSD] = useState(0);
    const [portfolio, setPortfolio] = useState({});
    const [portfolioValuation, setPortfolioValuation] = useState(null);
    const [isStockAdmin, setIsStockAdmin] = useState(false); // 기본값 false

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // checkAdminStatus 함수는 이제 UserContext의 studentDataFromContext.role을 직접 사용하므로,
    // 별도의 checkAdminStatus useCallback 함수는 필요 없을 수 있습니다.
    // useEffect 내에서 직접 studentDataFromContext.role을 확인합니다.

    useEffect(() => {
        console.group("[🔍 useStockUserData 디버깅]");
        console.log("authUser:", authUser);
        console.log("authLoading:", authLoading);
        console.log("authError:", authError);
        console.log("classId:", classId);
        console.log("contextLoading:", contextLoading);
        console.log("studentDataFromContext:", studentDataFromContext);
        console.groupEnd();

        if (authLoading || contextLoading) {
            console.log("⏳ 로딩 중 - 아무 작업 안 함");
            setIsLoading(true);
            return;
        }

        if (authError) {
            console.warn("❌ 인증 오류:", authError.message);
            setError("사용자 인증 중 오류 발생: " + authError.message);
            setIsLoading(false);
            return;
        }

        if (!authUser || !classId) {
            console.log("⚠️ 아직 authUser 또는 classId가 없음 - 에러는 표시하지 않음");
            setIsLoading(true);
            return;
        }

        // 모든 조건 만족 → 본 로직 실행
        console.log("✅ 조건 충족 - Firestore 구독 시작");
        setIsLoading(true);
        setError(null);

        console.log(`[useStockUserData] Setting up for user ${authUser.uid} in class ${classId}`);

        // ★★★ isStockAdmin 설정: UserContext의 studentDataFromContext.role 사용 ★★★
        if (studentDataFromContext && studentDataFromContext.role === 'teacher') {
            setIsStockAdmin(true);
            console.log(`[useStockUserData] User ${authUser.uid} IS a TEACHER in class ${classId}. isStockAdmin: true`);
        } else {
            setIsStockAdmin(false);
            console.log(`[useStockUserData] User ${authUser.uid} role is "${studentDataFromContext?.role || 'N/A'}". isStockAdmin: false`);
        }

        // 1. 학생 문서 구독 (자산, 주식 평가액)
        const studentDocRef = doc(db, "classes", classId, "students", authUser.uid);
        const unsubscribeStudentDoc = onSnapshot(studentDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const studentData = docSnap.data();
                const assets = studentData.assets || {};
                setBalanceBIL(assets.cash === undefined ? 0 : Number(assets.cash));
                setBalanceUSD(assets.usdBalance === undefined ? 0 : Number(assets.usdBalance));
                setPortfolioValuation(studentData.stockValue && typeof studentData.stockValue === 'object' ? studentData.stockValue : null);
            } else {
                console.warn(`[useStockUserData] Student document not found for assets: classes/${classId}/students/${authUser.uid}.`);
                setBalanceBIL(0); setBalanceUSD(0); setPortfolioValuation(null);
            }
            // setIsLoading(false); // 포트폴리오 로딩 후 최종적으로 false로 설정
        }, (err) => {
            console.error(`[useStockUserData] Error in studentDoc onSnapshot:`, err);
            setError("학생 자산 정보 조회 오류");
            setIsLoading(false);
        });

        // 2. 학생 포트폴리오 구독
        const portfolioColRef = collection(db, "classes", classId, "students", authUser.uid, "stockPortfolio");
        const unsubscribePortfolio = onSnapshot(query(portfolioColRef), (portfolioSnap) => {
            const loadedPortfolio = {};
            portfolioSnap.forEach(stockDoc => {
                loadedPortfolio[stockDoc.id] = stockDoc.data();
            });
            setPortfolio(loadedPortfolio);
            setIsLoading(false); // ★ 모든 데이터 구독 설정 후 로딩 완료
        }, (err) => {
            console.error(`[useStockUserData] Error in stockPortfolio onSnapshot:`, err);
            setError("보유 주식 정보 조회 오류");
            setPortfolio({});
            setIsLoading(false);
        });

        return () => {
            console.log(`[useStockUserData] Cleaning up listeners for user ${authUser?.uid || 'N/A'} in class ${classId}`);
            unsubscribeStudentDoc();
            unsubscribePortfolio();
        };
        // studentDataFromContext도 의존성에 추가하여, 컨텍스트에서 이 값이 변경될 때 isStockAdmin 재평가
    }, [authUser, authLoading, authError, classId, studentDataFromContext, contextLoading]);

    return {
        authUser,
        balanceBIL,
        balanceUSD,
        portfolio,
        portfolioValuation,
        isStockAdmin, // ★ 이 값이 UserContext의 role='teacher'에 따라 설정됨
        isLoading,
        error,
    };
};

export default useStockUserData;