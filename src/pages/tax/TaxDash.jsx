import React, { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useUser } from '../../contexts/UserContext';
import { Spinner, Alert, Card } from '../../components/ui';
import { Landmark } from 'lucide-react';
import { TaxProvider } from '../../contexts/TaxContext';

import TaxRuleTab from './tabs/TaxRuleTab';
import JobDefinitionTab from './tabs/JobDefinitionTab';
import PayrollTab from './tabs/PayrollTab';
import TaxFinanceTab from './tabs/TaxFinanceTab';

const TABS = [
    {
        id: 'taxRules',
        label: '세금 규칙 관리',
        Component: TaxRuleTab
        // 모든 사용자 접근 가능 (기본)
    },
    {
        id: 'taxFinance',
        label: '학급 재정 현황',
        Component: TaxFinanceTab,
        requiredPermissions: ['tax_admin'] // 국세청 관리자 또는 교사만
    },
    {
        id: 'jobDefinitions',
        label: '직업 정의 관리',
        Component: JobDefinitionTab,
        teacherOnly: true // 교사만
    },
    {
        id: 'payroll',
        label: '학생 급여 관리',
        Component: PayrollTab,
        teacherOnly: true // 교사만
    },
];

// ✅ 추가 가능한 권한 유형들 제거
// const PERMISSION_TYPES = { ... }

const TaxDash = () => {
    const { isTeacher, loading, classId, userData, hasPermission } = useUser(); // ✅ 올바른 속성명 사용

    // ✅ 권한 확인 함수 (수정)
    const hasTabAccess = (tab) => {
        // 디버깅용 로그
        console.log('=== 탭 권한 확인 ===');
        console.log('탭:', tab.label);
        console.log('isTeacher:', isTeacher);
        console.log('userData:', userData);
        console.log('userData.permissions:', userData?.permissions);
        console.log('tab.requiredPermissions:', tab.requiredPermissions);
        console.log('tab.teacherOnly:', tab.teacherOnly);

        // 교사는 모든 탭 접근 가능
        if (isTeacher) {
            console.log('✅ 교사 권한으로 접근 허용');
            return true;
        }

        // teacherOnly 탭은 교사만
        if (tab.teacherOnly) {
            console.log('❌ 교사 전용 탭');
            return false;
        }

        // requiredPermissions 확인 (UserContext의 hasPermission 함수 사용)
        if (tab.requiredPermissions) {
            const hasRequiredPermission = tab.requiredPermissions.some(permission => {
                const result = hasPermission(permission);
                console.log(`권한 '${permission}' 확인:`, result);
                return result;
            });
            console.log('최종 권한 확인 결과:', hasRequiredPermission);
            return hasRequiredPermission;
        }

        // 기본적으로 접근 가능
        console.log('✅ 기본 접근 허용');
        return true;
    };

    // ✅ 권한에 따른 탭 필터링
    const visibleTabs = TABS.filter(hasTabAccess);

    const [activeTab, setActiveTab] = useState(() =>
        visibleTabs[0]?.id || 'taxRules' // ✅ 학생은 세금 규칙이 기본
    );

    if (loading) {
        return (
            <AppLayout title="로딩 중...">
                <div className="flex justify-center items-center h-full">
                    <Spinner />
                </div>
            </AppLayout>
        );
    }

    const ActiveTabComponent = visibleTabs.find(tab => tab.id === activeTab)?.Component;
    const activeTabInfo = visibleTabs.find(tab => tab.id === activeTab);

    return (
        <AppLayout showDefaultHeader={false}>
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Landmark className="h-8 w-8 text-indigo-500" />
                        세금 및 급여 관리
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        학급의 세금 규칙, 직업, 급여 등 경제 시스템의 핵심을 관리합니다.
                    </p>
                </header>

                {/* ✅ 권한 안내 제거 */}

                {/* 탭 네비게이션 */}
                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {visibleTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors
                                    ${activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* 탭 콘텐츠 */}
                <main className="mt-6">
                    {!classId ? (
                        <Card>
                            <Card.Content>
                                <Alert type="warning" message="관리할 학급이 선택되지 않았습니다." />
                            </Card.Content>
                        </Card>
                    ) : (
                        ActiveTabComponent && (
                            <TaxProvider>
                                <ActiveTabComponent />
                            </TaxProvider>
                        )
                    )}
                </main>
            </div>
        </AppLayout>
    );
};

export default TaxDash;