// src/pages/bank/Bank.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useUser } from "../../contexts/UserContext";
import { useFeedback } from "../../contexts/FeedbackContext";   // ✅ 전역 피드백

// UI
import { Button, Spinner, Tabs, Card } from "../../components/ui";
import AppLayout from "../../components/layout/AppLayout";

// 모달들
import DepositHistoryModal from "./modals/DepositHistoryModal";
import LoanHistoryModal from "./modals/LoanHistoryModal";
import RepayModal from "./modals/RepayModal";
import DepositConfirmationModal from "./modals/DepositConfirmationModal";
import LoanConfirmationModal from "./modals/LoanConfirmationModal";
import DepositProductManagementModal from "./bankadmin/modals/DepositProductManagementModal";
import LoanProductManagementModal from "./bankadmin/modals/LoanProductManagementModal";
import TierRateAdjustmentModal from "./bankadmin/modals/TierRateAdjustmentModal";
import ApprovalModal from "./bankadmin/modals/ApprovalModal";

// 탭 컴포넌트
import BankMainTab from './tabs/BankMainTab';
import BankDepositTab from './tabs/BankDepositTab';
import BankLoanTab from './tabs/BankLoanTab';
import BankAdminTab from './bankadmin/BankAdminTab';

// 아이콘
import {
    WalletIcon,
    ArrowDownCircleIcon,
    ArrowUpCircleIcon,
    ExclamationTriangleIcon,
    UserCircleIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";

// 커스텀 훅
import useBankSettings from "./hooks/useBankSettings";
import useStudentBankData from "./hooks/useStudentBankData";
import useDepositActions from "./hooks/useDepositActions";
import useLoanActions from "./hooks/useLoanActions";
import useSavingsManagement from "./hooks/useSavingsManagement";
import useLoanRepayment from "./hooks/useLoanRepayment";
import useTierLogic from "./hooks/useTierLogic";

export default function Bank({ uid: propUid, classId: propClassId }) {
    const navigate = useNavigate();
    const { showFeedback } = useFeedback();                    // ✅

    /** -------- 사용자 / 학급 컨텍스트 -------- */
    const {
        userData,
        classData,
        isTeacher,
        isBankManager,
        loading: userContextLoading,
        hasPermission
    } = useUser();

    // props 우선, 없으면 컨텍스트 사용
    const uid = propUid || userData?.uid;
    const classId = propClassId || classData?.classId;
    console.log("[Bank.jsx] userData:", userData);
    console.log("[Bank.jsx] classData:", classData);
    console.log("[Bank.jsx] resolved uid:", uid);
    console.log("[Bank.jsx] resolved classId:", classId);

    /** -------- 로깅 -------- */
    useEffect(() => {
        console.log(
            `%c[Bank.jsx] MOUNTED. classId:${classId}, uid:${uid}`,
            "color:blue;font-weight:bold;"
        );
        return () =>
            console.log(
                `%c[Bank.jsx] UNMOUNTING! classId:${classId}, uid:${uid}`,
                "color:red;font-weight:bold;"
            );
    }, [classId, uid]);

    /** -------- 권한 확인 -------- */
    const isAdminRoleConfirmed = !!(isTeacher || isBankManager);
    const isMyBankPage = uid && uid === userData?.uid;

    /** -------- 은행 설정 / 학생 데이터 로딩 -------- */
    const { bankSettings, tierCriteria, isLoadingSettings, settingsError } =
        useBankSettings(classId);

    // 예 금·대출 정렬
    const [savingsSortOrder, setSavingsSortOrder] = useState("desc");
    const [loansSortOrder, setLoansSortOrder] = useState("desc");

    const {
        studentAssets,
        studentInfo,
        creditScore,
        savings,
        loans,
        isLoadingStudentData,
        studentDataError,
        refreshStudentData,
    } = useStudentBankData(uid, classId, savingsSortOrder, loansSortOrder);

    const isLoadingPage =
        isLoadingSettings || isLoadingStudentData || userContextLoading || !bankSettings;

    /** -------- 탭 & 모달 상태 -------- */
    const [activeTabKey, setActiveTabKey] = useState("main");

    const [showDepositHistoryModal, setShowDepositHistoryModal] = useState(false);
    const [showLoanHistoryModal, setShowLoanHistoryModal] = useState(false);

    const [showDepositProductModal, setShowDepositProductModal] = useState(false);
    const [showLoanProductModal, setShowLoanProductModal] = useState(false);
    const [showTierRateModal_Bank, setShowTierRateModal_Bank] = useState(false);
    const [showApprovalModal_Bank, setShowApprovalModal_Bank] = useState(false);
    const [approvalActiveTab, setApprovalActiveTab] = useState("savings");

    /** -------- 알림 (기존 alertInfo → 전역 피드백) -------- */
    const [alertInfo, setAlertInfo] = useState({
        open: false,
        type: "info",
        message: "",
    });

    // alertInfo.open → 전역 피드백으로 전달
    useEffect(() => {
        if (alertInfo.open) {
            showFeedback({ type: alertInfo.type, message: alertInfo.message });
            setAlertInfo((prev) => ({ ...prev, open: false }));
        }
    }, [alertInfo, showFeedback]);

    /** -------- 티어 로직 -------- */
    const isTierDataLoading =
        isLoadingStudentData || isLoadingSettings || !bankSettings;

    const { currentTierInfo, currentRateModifiers } = useTierLogic(
        creditScore,
        tierCriteria,
        bankSettings?.bankTierRateAdjustments,
        isTierDataLoading
    );

    /** -------- 액션 훅들 -------- */
    const depositActions = useDepositActions({
        studentAssets,
        bankSettings,
        uid,
        classId,
        currencyUnit: classData?.currencyUnit || "캐시",
        refreshStudentData,
        setAlertInfo,
        currentTierInfo,
        isLoadingSettings: isLoadingPage,
    });

    const loanActions = useLoanActions({
        bankSettings,
        creditScore,
        currentTierInfo,
        uid,
        classId,
        isMyBankPage,
        currencyUnit: classData?.currencyUnit || "캐시",
        refreshStudentData,
        setAlertInfo,
    });

    const savingsManagement = useSavingsManagement({
        savings,
        uid,
        classId,
        isMyBankPage,
        currencyUnit: classData?.currencyUnit || "캐시",
        refreshStudentData,
        setAlertInfo,
    });

    const loanRepayment = useLoanRepayment({
        loans,
        studentAssets,
        studentInfo,
        uid,
        classId,
        isMyBankPage,
        isTeacher,
        isBankManager,
        currencyUnit: classData?.currencyUnit || "캐시",
        refreshStudentData,
        setAlertInfo,
    });

    /** -------- 은행 관리자 승인 모달 -------- */
    const handleOpenApprovalModalWithTab = useCallback(
        (tabType = "savings") => {
            console.log(`[Bank.jsx] Opening ApprovalModal with initial tab: ${tabType}`);
            setApprovalActiveTab(tabType);
            setShowApprovalModal_Bank(true);
        },
        []
    );

    /** -------- 관리자 작업 후 새로고침 -------- */
    const handleAdminActionProcessed = useCallback(() => {
        console.log("[Bank.jsx] handleAdminActionProcessed → refresh data");
        refreshStudentData?.();
        showFeedback({ type: "success", message: "관리 작업이 처리되었습니다." });
    }, [refreshStudentData, showFeedback]);

    /** -------- 탭 정의 -------- */
    const TABS_CONFIG = [
        { id: "main", label: "메인", icon: WalletIcon },
        {
            id: "deposit_apply",
            label: "예금",
            icon: ArrowDownCircleIcon,
            condition: () => isMyBankPage,
        },
        {
            id: "loan_apply",
            label: "대출",
            icon: ArrowUpCircleIcon,
            condition: () => isMyBankPage,
        },
        {
            id: "admin_management",
            label: "은행 관리",
            icon: Cog6ToothIcon,
            condition: () => hasPermission('bank_admin'),
        },
    ];

    /** =================================================================
     * 렌더 단계: 로딩 & 오류 처리
     * ================================================================= */
    if (isLoadingPage) {
        return (
            <AppLayout title="은행 서비스 로딩 중...">
                <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                    <Spinner size="lg" />
                    <p className="ml-3 text-slate-600">데이터 로딩 중...</p>
                </div>
            </AppLayout>
        );
    }

    if ((!uid || !classId) && !isLoadingPage) {
        return (
            <AppLayout title="정보 부족">
                <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4 text-center">
                    <Card title="정보 부족" icon={ExclamationTriangleIcon} titleColor="text-orange-600">
                        <p>페이지 표시에 필요한 사용자(uid) 또는 학급(classId) 정보가 없습니다.</p>
                        <Button onClick={() => navigate("/")}>홈으로</Button>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    if (settingsError) {
        return (
            <AppLayout title="오류">
                <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4 text-center">
                    <Card title="오류" icon={ExclamationTriangleIcon} titleColor="text-red-600">
                        은행 설정 로딩 오류: {settingsError.message}
                    </Card>
                </div>
            </AppLayout>
        );
    }

    if (studentDataError && uid) {
        return (
            <AppLayout title="오류">
                <div className="flex justify-center items-center min-h-[calc(100vh-200px)] p-4 text-center">
                    <Card title="오류" icon={ExclamationTriangleIcon} titleColor="text-red-600">
                        학생 은행 정보 로딩 오류: {studentDataError.message}
                    </Card>
                </div>
            </AppLayout>
        );
    }

    /** =================================================================
     * 실제 페이지 본문
     * ================================================================= */
    const currencyUnit = classData?.currencyUnit || "캐시";
    const studentName = userData?.name || "학생";
    const className = classData?.className || "소속 학급";

    return (
        <AppLayout showDefaultHeader={false}>
            <div className="p-4 sm:p-6 lg:p-8">
                {/* --- 헤더 --- */}
                <header className="mb-8 p-6 rounded-2xl shadow-lg bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
                    <div className="flex items-center justify-between">
                        {/* 왼쪽: 프로필 */}
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/20 rounded-full flex-shrink-0">
                                <UserCircleIcon className="h-12 w-12 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold">안녕하세요, {studentName}님!</h1>
                                <p className="text-sm text-indigo-200 mt-1">{className}의 은행에 오신 것을 환영합니다.</p>
                            </div>
                        </div>
                        {/* 오른쪽: 날짜 */}
                        <div className="text-right hidden sm:block">
                            <p className="text-lg font-medium">
                                {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                            </p>
                            <p className="text-sm text-white/70">
                                {new Date().toLocaleDateString("ko-KR", { weekday: "long" })}
                            </p>
                        </div>
                    </div>
                </header>

                {/* --- 탭 --- */}
                <Tabs
                    tabs={TABS_CONFIG.filter((t) =>
                        typeof t.condition === "function" ? t.condition() : true
                    )}
                    activeTabId={activeTabKey}
                    onTabChange={setActiveTabKey}
                    tabListClassName="bg-gradient-to-r from-slate-50 to-gray-100 shadow-md rounded-xl p-1.5"
                    tabButtonClassName="flex-1 sm:flex-none px-4 py-2 text-[15px] font-bold rounded-lg transition-all data-[headlessui-state=selected]:text-white data-[headlessui-state=selected]:bg-gradient-to-r data-[headlessui-state=selected]:from-indigo-500 data-[headlessui-state=selected]:to-purple-600"
                />

                {/* --- 탭별 내용 --- */}
                <div className="mt-6">
                    {activeTabKey === "main" && (
                        <BankMainTab
                            studentAssets={studentAssets}
                            creditScore={creditScore}
                            studentInfo={studentInfo}
                            currencyUnit={currencyUnit}
                            isMyBankPage={isMyBankPage}
                            classId={classId}
                            currentStudentUid={uid}
                            onTransferSuccess={() => {
                                refreshStudentData?.();
                                showFeedback({ type: "success", message: "송금이 완료되었습니다." });
                            }}
                            setAlertInfo={setAlertInfo}
                            currentTierInfo={currentTierInfo}
                            currentRateModifiers={currentRateModifiers}
                            hasPermission={hasPermission}
                        />
                    )}

                    {activeTabKey === "deposit_apply" && isMyBankPage && (
                        <BankDepositTab
                            isMyBankPage={isMyBankPage}
                            bankSettings={bankSettings}
                            depositAmount={depositActions.depositAmount}
                            setDepositAmount={depositActions.setDepositAmount}
                            selectedDepositProductId={depositActions.selectedDepositProductId}
                            setSelectedDepositProductId={depositActions.setSelectedDepositProductId}
                            handleOpenDepositConfirmModal={depositActions.handleOpenDepositConfirmModal}
                            setShowDepositHistoryModal={setShowDepositHistoryModal}
                            studentInfo={studentInfo}
                            isTeacher={isTeacher}
                            currencyUnit={currencyUnit}
                            isSubmitting={depositActions.isSubmittingDeposit}
                            studentTierName={currentTierInfo?.name}
                            currentRateModifiers={currentRateModifiers}
                        />
                    )}

                    {activeTabKey === "loan_apply" && isMyBankPage && (
                        <BankLoanTab
                            isMyBankPage={isMyBankPage}
                            bankSettings={bankSettings}
                            loanAmount={loanActions.loanAmount}
                            setLoanAmount={loanActions.setLoanAmount}
                            selectedLoanProductId={loanActions.selectedLoanProductId}
                            setSelectedLoanProductId={loanActions.setSelectedLoanProductId}
                            handleOpenLoanConfirmModal={loanActions.handleOpenLoanConfirmModal}
                            setShowLoanHistoryModal={setShowLoanHistoryModal}
                            studentInfo={studentInfo}
                            isTeacher={isTeacher}
                            currencyUnit={currencyUnit}
                            creditScore={creditScore}
                            isSubmitting={loanActions.isSubmittingLoan}
                            studentTierName={currentTierInfo?.name}
                            currentRateModifiers={currentRateModifiers}
                        />
                    )}

                    {activeTabKey === "admin_management" && hasPermission('bank_admin') && (
                        <BankAdminTab
                            classId={classId}
                            onActionProcessed={handleAdminActionProcessed}
                            onOpenDepositProductModal={() => setShowDepositProductModal(true)}
                            onOpenLoanProductModal={() => setShowLoanProductModal(true)}
                            onOpenTierRateModal={() => setShowTierRateModal_Bank(true)}
                            onOpenApprovalModal={handleOpenApprovalModalWithTab}
                        />
                    )}
                </div>
            </div>

            {/* ---------------- Modals ---------------- */}
            {/* 1) 예금 신청 확인 */}
            {depositActions.showDepositConfirmModal && depositActions.depositConfirmDetails && (
                <DepositConfirmationModal
                    isOpen={depositActions.showDepositConfirmModal}
                    onClose={() => depositActions.setShowDepositConfirmModal(false)}
                    onConfirm={depositActions.executeDepositApplication}
                    {...depositActions.depositConfirmDetails}
                    currencyUnit={currencyUnit}
                    isSubmitting={depositActions.isSubmittingDeposit}
                />
            )}

            {/* 2) 대출 신청 확인 */}
            {loanActions.showLoanConfirmModal && loanActions.loanConfirmDetails && (
                <LoanConfirmationModal
                    isOpen={loanActions.showLoanConfirmModal}
                    onClose={() => loanActions.setShowLoanConfirmModal(false)}
                    onConfirm={loanActions.executeLoanApplication}
                    product={loanActions.loanConfirmDetails.product}
                    loanAmount={loanActions.loanConfirmDetails.loanAmount}
                    studentCreditInfo={loanActions.loanConfirmDetails.studentCreditInfo}
                    rateModifiers={loanActions.loanConfirmDetails.rateModifiers}
                    finalCalculations={loanActions.loanConfirmDetails.finalCalculations}
                    currencyUnit={currencyUnit}
                    isSubmitting={loanActions.isSubmittingLoan}
                />
            )}

            {/* 3) 예금/대출 내역 모달 */}
            {showDepositHistoryModal && (
                <DepositHistoryModal
                    open={showDepositHistoryModal}
                    onClose={() => setShowDepositHistoryModal(false)}
                    studentName={studentInfo?.name || "학생"}
                    processSavingAction={savingsManagement.processSavingAction}
                    isMyBankPage={isMyBankPage}
                    currencyUnit={currencyUnit}
                    uid={uid}
                    classId={classId}
                />
            )}

            {showLoanHistoryModal && (
                <LoanHistoryModal
                    open={showLoanHistoryModal}
                    onClose={() => setShowLoanHistoryModal(false)}
                    uid={uid}
                    classId={classId}
                    studentName={studentInfo?.name || "학생"}
                    onOpenRepayModal={loanRepayment.handleOpenRepayModal}
                    isMyBankPage={isMyBankPage}
                    currencyUnit={currencyUnit}
                    calculateEarlyRepaymentInterest={loanRepayment.calculateEarlyRepaymentInterest}
                />
            )}

            {/* 4) 상환 모달 */}
            {loanRepayment.showRepayModal && loanRepayment.selectedLoanId && (() => {
                const sel = loans.find((l) => l.id === loanRepayment.selectedLoanId);
                return (
                    <RepayModal
                        isOpen={loanRepayment.showRepayModal}
                        onClose={loanRepayment.handleCloseRepayModal}
                        loan={sel}
                        studentCashBalance={studentAssets?.cash ?? 0}
                        onRepay={(loanObj, amt) => loanRepayment.handleRepayLoan(loanObj.id, amt)}
                        currencyUnit={currencyUnit}
                        calculateEarlyRepaymentInterest={loanRepayment.calculateEarlyRepaymentInterest}
                    />
                );
            })()}

            {/* 5) 관리자용 상품/티어/승인 모달 */}
            {hasPermission('bank_admin') && showDepositProductModal && (
                <DepositProductManagementModal
                    isOpen={showDepositProductModal}
                    onClose={() => setShowDepositProductModal(false)}
                    classId={classId}
                />
            )}

            {hasPermission('bank_admin') && showLoanProductModal && (
                <LoanProductManagementModal
                    isOpen={showLoanProductModal}
                    onClose={() => setShowLoanProductModal(false)}
                    classId={classId}
                />
            )}

            {showTierRateModal_Bank && (
                <TierRateAdjustmentModal
                    isOpen={showTierRateModal_Bank}
                    onClose={() => setShowTierRateModal_Bank(false)}
                    classId={classId}
                />
            )}

            {showApprovalModal_Bank && (
                <ApprovalModal
                    isOpen={showApprovalModal_Bank}
                    onClose={() => setShowApprovalModal_Bank(false)}
                    classId={classId}
                    currencyUnit={currencyUnit}
                    activeSubTab={approvalActiveTab}
                    onSubTabChange={setApprovalActiveTab}
                />
            )}
        </AppLayout>
    );
} // Bank 컴포넌트 끝
