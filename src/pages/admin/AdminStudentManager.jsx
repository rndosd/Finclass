import React, { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useUser } from '../../contexts/UserContext';
import useClassFinancials from './hooks/useClassFinancials';
import { Spinner, Alert, Button } from '../../components/ui';

// 탭 컴포넌트들을 import 합니다 (파일은 앞으로 생성해야 함)
import StockTradesTab from './tabs/StockTradesTab';
import BankStatusTab from './tabs/BankStatusTab';
import StorePurchasesTab from './tabs/StorePurchasesTab';
import StudentListTab from './tabs/StudentListTab';
import TransfersTab from './tabs/TransfersTab';

const AdminStudentManager = () => {
    const { classData, isTeacher, classId, loading: userContextLoading } = useUser();
    const [activeTab, setActiveTab] = useState('stockTrades'); // 기본 탭을 '주식 거래'로 설정


    // 커스텀 훅을 호출하여 학급 전체의 금융 데이터를 한번에 가져옵니다.
    const {
        stockTrades,
        storePurchases,
        bankStatusByStudent,
        isLoading: financialsLoading,
        error,
        refreshData,
        activeSavings,
        activeLoans,
        transferLogs,
    } = useClassFinancials();

    const isLoadingPage = userContextLoading || financialsLoading;

    // 탭에 따라 렌더링할 컴포넌트를 결정합니다.
    const renderTabContent = () => {
        switch (activeTab) {
            case 'stockTrades':
                return (
                    <StockTradesTab
                        trades={stockTrades}
                        currencyUnit={classData?.currencyUnit}
                    />
                );

            case 'bankStatus':
                return (
                    <BankStatusTab
                        studentsBankStatus={bankStatusByStudent}
                        allActiveSavings={activeSavings}
                        allActiveLoans={activeLoans}
                        currencyUnit={classData?.currencyUnit}
                        classId={classId}
                    />
                );

            case 'storePurchases':
                return (
                    <StorePurchasesTab
                        purchases={storePurchases}
                        currencyUnit={classData?.currencyUnit}
                    />
                );

            case 'transfers':
                return (
                    <TransfersTab
                        transfers={transferLogs}
                        currencyUnit={classData?.currencyUnit}
                    />
                ); {/* ✅ 세미콜론 뒤에서 줄 끊기 */ }

            default:
                return null;
        }
    };

    // ⭐ 4. 로딩 및 권한 확인 로직을 JSX return문 상단으로 옮겨 코드를 더 명확하게 합니다.
    if (isLoadingPage) {
        return <AppLayout showDefaultHeader={false}><div className="p-8 text-center"><Spinner message="데이터 로딩 중..." /></div></AppLayout>;
    }
    if (!isTeacher) {
        return <AppLayout showDefaultHeader={false}><div className="p-8 text-center"><Alert type="error" message="접근 권한이 없습니다." /></div></AppLayout>;
    }
    if (error) {
        return <AppLayout showDefaultHeader={false}><div className="p-8 text-center"><Alert type="error" message={error} /></div></AppLayout>;
    }

    return (
        <AppLayout showDefaultHeader={false}>
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">학생 관리 대시보드</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            {classData?.className || '학급'}의 전체 금융 활동을 주제별로 확인하고 관리합니다.
                        </p>
                    </div>
                    <div>
                        <Button onClick={refreshData} variant="outline" disabled={isLoadingPage}>
                            {isLoadingPage ? '새로고침 중...' : '데이터 새로고침'}
                        </Button>
                    </div>
                </header>

                {/* 탭 네비게이션 */}
                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto">
                        <button onClick={() => setActiveTab('transfers')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'transfers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            송금 내역
                        </button>
                        <button onClick={() => setActiveTab('bankStatus')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'bankStatus' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            예금/대출
                        </button>
                        <button onClick={() => setActiveTab('stockTrades')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'stockTrades' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            주식/환전
                        </button>

                        <button onClick={() => setActiveTab('storePurchases')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm ${activeTab === 'storePurchases' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            상점 소비
                        </button>

                    </nav>
                </div>

                {/* 탭 콘텐츠 표시 영역 */}
                <div className="mt-6">
                    {isLoadingPage ? (
                        <div className="text-center py-20"><Spinner size="lg" /></div>
                    ) : error ? (
                        <Alert type="error" message={error} />
                    ) : (
                        renderTabContent()
                    )}
                </div>
            </div>
        </AppLayout>
    );
};

export default AdminStudentManager;