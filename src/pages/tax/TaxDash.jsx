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
    { id: 'taxFinance', label: '학급 재정 현황', Component: TaxFinanceTab },
    { id: 'taxRules', label: '세금 규칙 관리', Component: TaxRuleTab },
    { id: 'jobDefinitions', label: '직업 정의 관리', Component: JobDefinitionTab, adminOnly: true },
    { id: 'payroll', label: '학생 급여 관리', Component: PayrollTab },
];

const TaxDash = () => {
    const { isTeacher, loading, classId } = useUser();

    const visibleTabs = TABS.filter(tab => !tab.adminOnly || isTeacher);
    const [activeTab, setActiveTab] = useState(() =>
        visibleTabs[0]?.id || 'taxFinance'
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
