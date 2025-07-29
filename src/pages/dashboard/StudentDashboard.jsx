// src/pages/dashboard/StudentDashboard.jsx
import React, { useEffect, useState } from 'react';
import AppLayout from '../../components/layout/AppLayout'; // ⭐️ 추가
import HomeAssetCard from './components/HomeAssetCard';
import HomeTaxCard from './components/HomeTaxCard';
import HomeCreditCard from './components/HomeCreditCard';
import HomeDonationCard from './components/HomeDonationCard';
import HomeNotice from './components/HomeNotice';
import CreditTierModal from '../credit/modals/CreditTierModal';
import CreditLogModal from '../credit/modals/CreditLogModal';
import { getTierInfoByScore } from '../../utils/tierUtils';
import { db } from '../../firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useUser } from '../../contexts/UserContext';

const StudentDashboard = () => {
    // useUser 훅에서 userData를 currentUser라는 이름으로 받아옵니다.
    const { userData: currentUser, classId, classData, loading: userLoading } = useUser();

    // ⭐ 2. 'userData'가 아닌, 위에서 지정한 'currentUser' 변수를 사용해야 합니다.
    const currencyUnit = classData?.currencyUnit || '단위'; // 여기서 선언
    const studentName = currentUser?.name || '학생';
    const className = classData?.className || '소속 학급';

    const [creditScore, setCreditScore] = useState(0);
    const [tierCriteria, setTierCriteria] = useState([]);
    const [showTierModal, setShowTierModal] = useState(false);
    const [showCreditLogModal, setShowCreditLogModal] = useState(false);

    const tierInfo = getTierInfoByScore(creditScore, tierCriteria);

    // creditScore 실시간 구독
    useEffect(() => {
        if (!currentUser?.uid || !classId) {
            console.log('[StudentDashboard] onSnapshot skip — currentUser or classId missing');
            return;
        }

        const studentDocRef = doc(db, `classes/${classId}/students/${currentUser.uid}`);
        console.log('[StudentDashboard] onSnapshot 등록:', `classes/${classId}/students/${currentUser.uid}`);

        const unsubscribe = onSnapshot(studentDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('[StudentDashboard] onSnapshot data:', data);
                setCreditScore(data.creditScore ?? 0);
            } else {
                console.warn('[StudentDashboard] 학생 문서 없음');
                setCreditScore(0);
            }
        });

        return () => {
            console.log('[StudentDashboard] onSnapshot cleanup');
            unsubscribe();
        };
    }, [currentUser?.uid, classId]);

    // tierCriteria fetch
    useEffect(() => {
        const fetchTierCriteria = async () => {
            if (!classId) return;

            try {
                const tierRef = doc(db, `classes/${classId}/tierCriteria/default`);
                const tierSnap = await getDoc(tierRef);
                if (tierSnap.exists()) {
                    const d = tierSnap.data();
                    console.log('[StudentDashboard] tierCriteria 불러오기 성공:', d.tiers);
                    setTierCriteria(Array.isArray(d.tiers) ? d.tiers.sort((a, b) => a.minScore - b.minScore) : []);
                }
            } catch (error) {
                console.error('tierCriteria 불러오기 오류:', error);
            }
        };

        fetchTierCriteria();
    }, [classId]);




    if (userLoading || !currentUser || !classId) {
        console.log('[StudentDashboard] 아직 userLoading 중 또는 currentUser/classId 없음 → 화면 표시 안함');
        return null;
    }



    return (
        // ⭐ 1. AppLayout의 title prop 제거 -> 기본 흰색 헤더 바 사라짐
        <AppLayout showSidebar={true} showDefaultHeader={false}>
            {/* 페이지 전체의 패딩과 요소 간 간격을 설정합니다. */}
            <div className="p-4 sm:p-6 lg:p-8 space-y-8">

                {/* ⭐ 2. 우리가 디자인한 새로운 헤더를 여기에 추가합니다. */}
                <header className="flex items-center justify-between border-b border-slate-200 pb-5">
                    <div>
                        <p className="text-base font-semibold text-indigo-600">
                            {className} {/* useUser 훅에서 가져온 학급명 */}
                        </p>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight mt-1">
                            {studentName}님, 환영합니다! {/* useUser 훅에서 가져온 학생 이름 */}
                        </h1>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-lg font-medium text-slate-600">
                            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-slate-400">
                            {new Date().toLocaleDateString('ko-KR', { weekday: 'long' })}
                        </p>
                    </div>
                </header>

                {/* 상단 공지사항 */}
                <HomeNotice />

                {/* 2x2 그리드 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* ⭐️ 수정 적용: assets 통째로 넘기기 */}
                    <HomeAssetCard
                        jobTitle={currentUser?.job || '직업 없음'}
                        salary={currentUser?.job?.salary ?? 0}
                        assets={currentUser?.assets || {}}
                        currencyUnit={currencyUnit}
                    />
                    <HomeTaxCard />
                    <HomeCreditCard
                        creditScore={creditScore}
                        tierCriteria={tierCriteria}
                        tierInfo={tierInfo}
                        isAdmin={true} // 테스트용
                        onShowTier={() => setShowTierModal(true)}
                        onShowTierSettings={() => { }}
                        onShowCreditLog={() => setShowCreditLogModal(true)}
                    />
                    <HomeDonationCard />
                </div>

                {/* 티어표 모달 */}
                {showTierModal && (
                    <CreditTierModal
                        isOpen={showTierModal}
                        onClose={() => setShowTierModal(false)}
                        criteria={tierCriteria}
                        isAdmin={true}
                    />
                )}

                {/* 변동내역 모달 */}
                {showCreditLogModal && (
                    <CreditLogModal
                        student={{
                            uid: currentUser.uid,
                            name: currentUser.name || '이름 없음',
                            studentNumber: currentUser.studentNumber || '-',
                        }}
                        onClose={() => setShowCreditLogModal(false)}
                    />
                )}
            </div>
        </AppLayout>
    );
};

export default StudentDashboard;
