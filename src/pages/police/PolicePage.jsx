// src/pages/police/PolicePage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

import { Button, Modal, Spinner } from '../../components/ui';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

import PoliceRuleTab from './tabs/PoliceRuleTab';
import ReportListTab from './tabs/ReportListTab';
import FineHistoryTab from './tabs/FineHistoryTab';
import ReportForm from './components/ReportForm';
import FineFormModal from './modals/FineFormModal';

import AppLayout from '../../components/layout/AppLayout';
import { getPolicePath } from './utils/policePathUtils';
import { useFineHistory } from './hooks/useFineHistory';

const LOCAL_STORAGE_ACTIVE_POLICE_TAB_KEY = 'finclassPoliceActiveTab';

const PolicePage = () => {
    const {
        userData, classId, classData, loading: userContextLoading,
        isTeacher, hasPermission,
    } = useUser();
    const { showFeedback } = useFeedback();

    const [activeTab, setActiveTab] = useState('');
    const [allStudents, setAllStudents] = useState([]);
    const [policeRules, setPoliceRules] = useState([]);
    const [isLoadingPageData, setIsLoadingPageData] = useState(true);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportListRefreshKey, setReportListRefreshKey] = useState(0);

    const fineHistoryHook = useFineHistory({ allStudents, policeRules });

    const TABS_CONFIG = useMemo(() => [
        {
            id: 'rulesAndStudents',
            label: '학급 규칙',
            component: PoliceRuleTab,
            requiredPermission: () => true,
        },
        {
            id: 'reports',
            label: '신고 접수 내역',
            component: ReportListTab,
            requiredPermission: () => isTeacher || hasPermission('permission_group_police'),
        },
        {
            id: 'fineHistory',
            label: '벌금/처벌 내역',
            component: FineHistoryTab,
            requiredPermission: () => isTeacher || hasPermission('permission_group_police'),
        },
    ], [isTeacher, hasPermission]);

    const fetchInitialDataForPolicePage = useCallback(async () => {
        if (!classId) {
            setIsLoadingPageData(false);
            return;
        }
        setIsLoadingPageData(true);
        try {
            const studentsSnapshot = await getDocs(query(
                collection(db, getPolicePath('students', classId)),
                orderBy("studentNumber")
            ));
            const rulesSnapshot = await getDocs(query(
                collection(db, getPolicePath('policeRulesCollection', classId)),
                orderBy("order")
            ));

            const fetchedStudents = studentsSnapshot.docs.map(d => ({
                uid: d.id,
                ...d.data()
            }));
            const fetchedRules = rulesSnapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            }));

            setAllStudents(fetchedStudents);
            setPoliceRules(fetchedRules);
        } catch (error) {
            console.error("초기 데이터 로딩 실패:", error);
            showFeedback("경찰청 초기 데이터를 불러오는 중 오류 발생: " + error.message, 'error');
        } finally {
            setIsLoadingPageData(false);
        }
    }, [classId, showFeedback]);

    useEffect(() => {
        if (!userContextLoading && classId) {
            fetchInitialDataForPolicePage();
        } else if (!classId) {
            setAllStudents([]);
            setPoliceRules([]);
            setIsLoadingPageData(false);
        }
    }, [userContextLoading, classId, fetchInitialDataForPolicePage]);

    useEffect(() => {
        if (!userContextLoading && classId && !activeTab) {
            setActiveTab('rulesAndStudents');
        }
    }, [userContextLoading, classId, activeTab]);

    useEffect(() => {
        if (!userContextLoading && classId && activeTab) {
            localStorage.setItem(LOCAL_STORAGE_ACTIVE_POLICE_TAB_KEY, activeTab);
        }
    }, [activeTab, userContextLoading, classId]);

    const handleReportSubmitSuccess = (message) => {
        showFeedback(message, 'success');
        setShowReportModal(false);
        if (activeTab === 'reports') {
            setReportListRefreshKey(prev => prev + 1);
        }
    };

    const renderTabContent = () => {
        if (isLoadingPageData) return <p className="text-center p-8 text-slate-500">학급 학생 및 규칙 정보 로딩 중...</p>;
        const currentTab = TABS_CONFIG.find(tab => tab.id === activeTab);
        if (!currentTab) return <p className="text-center p-8 text-red-500">유효하지 않은 탭입니다.</p>;
        if (!currentTab.requiredPermission()) return <p className="text-center p-8 text-red-500">권한이 없습니다.</p>;

        const TabComponent = currentTab.component;
        return (
            <TabComponent
                key={activeTab === 'reports' ? reportListRefreshKey : activeTab}
                allStudentsFromPage={allStudents}
                policeRulesFromPage={policeRules}
                classId={classId}
                currencyUnit={classData?.currencyUnit || '단위'}
                userData={userData}
            />
        );
    };

    return (
        <AppLayout showDefaultHeader={false}>
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <ShieldCheck className="h-8 w-8 text-blue-600" />
                            경찰청
                        </h1>
                        <p className="text-sm text-slate-500 mt-2">
                            학급의 규칙을 확인하고, 비매너 행위를 신고하거나 접수된 내역을 관리합니다.
                        </p>
                    </div>

                    <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2 sm:gap-3">
                        <Button
                            onClick={() => setShowReportModal(true)}
                            color="red"
                            variant="primary"
                            className="w-full sm:w-auto flex-shrink-0"
                        >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            비매너 행위 신고하기
                        </Button>

                        {hasPermission('permission_group_police') && (
                            <Button
                                onClick={() => fineHistoryHook.setShowFineForm(true)}
                                color="blue"
                                variant="secondary"
                                className="w-full sm:w-auto flex-shrink-0"
                            >
                                직접 벌금 부과
                            </Button>
                        )}
                    </div>
                </header>

                <div className="border-b border-slate-200">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        {TABS_CONFIG.map(tab => {
                            if (!tab.requiredPermission()) return null;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                                        ${activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-6">
                    {isLoadingPageData ? (
                        <div className="text-center p-8"><Spinner /></div>
                    ) : renderTabContent()}
                </div>

                {showReportModal && (
                    <Modal isOpen={showReportModal} title="🚨 비매너 행위 신고" onClose={() => setShowReportModal(false)}>
                        <ReportForm
                            allStudents={allStudents}
                            policeRules={policeRules}
                            onSubmitSuccess={handleReportSubmitSuccess}
                            onCancel={() => setShowReportModal(false)}
                        />
                    </Modal>
                )}

                {fineHistoryHook.showFineForm && (
                    <FineFormModal
                        allStudents={allStudents}
                        policeRules={policeRules}
                        fineForm={fineHistoryHook.fineForm}
                        setFineForm={fineHistoryHook.setFineForm}
                        onClose={() => fineHistoryHook.setShowFineForm(false)}
                        onSubmit={fineHistoryHook.handleApplyDirectFine}
                    />
                )}
            </div>
        </AppLayout>
    );
};

export default PolicePage;
