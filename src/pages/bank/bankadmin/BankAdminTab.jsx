// src/pages/bank/tabs/BankAdminTab.jsx

import React, { useEffect } from "react";
import { Button, Card } from '../../../components/ui';
import {
    Cog8ToothIcon,
    AdjustmentsHorizontalIcon,
    BuildingLibraryIcon,
} from '@heroicons/react/24/outline';
import { useUser } from '../../../contexts/UserContext';

export default function BankAdminTab({
    onOpenDepositProductModal,
    onOpenLoanProductModal,
    onOpenTierRateModal,
    onOpenApprovalModal,
}) {
    const { isTeacher } = useUser(); // 🟣 교사 여부 판별

    useEffect(() => {
        console.log("[BankAdminTab] Mounted.");
        return () => {
            console.log("[BankAdminTab] Unmounted!");
        };
    }, []);

    return (
        <div className="space-y-6">

            {/* ✅ 1. 예금/대출 상품 관리 */}
            <Card title="은행 상품 관리" icon={Cog8ToothIcon} titleColor="text-blue-700">
                <p className="text-sm text-slate-600 mb-4">
                    예금 및 대출 상품을 별도로 관리할 수 있습니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        color="green"
                        onClick={onOpenDepositProductModal}
                        icon={Cog8ToothIcon}
                        className="flex-1"
                    >
                        예금 상품 관리 열기
                    </Button>
                    <Button
                        color="blue"
                        onClick={onOpenLoanProductModal}
                        icon={Cog8ToothIcon}
                        className="flex-1"
                    >
                        대출 상품 관리 열기
                    </Button>
                </div>
            </Card>

            {/* ✅ 2. 예금/대출 승인 관리 */}
            <Card title="은행 거래 승인 관리" icon={BuildingLibraryIcon} titleColor="text-green-700">
                <p className="text-sm text-slate-600 mb-4">
                    학생들이 신청한 예금 및 대출 거래 내역을 확인하고 승인 또는 거절 처리를 합니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                        color="green"
                        onClick={() => {
                            if (typeof onOpenApprovalModal === 'function') {
                                onOpenApprovalModal('savings');
                            } else {
                                console.error("[BankAdminTab] onOpenApprovalModal is not a function!");
                            }
                        }}
                        icon={BuildingLibraryIcon}
                        className="flex-1"
                    >
                        예금 승인 관리 열기
                    </Button>
                    <Button
                        color="sky"
                        onClick={() => {
                            if (typeof onOpenApprovalModal === 'function') {
                                onOpenApprovalModal('loans');
                            } else {
                                console.error("[BankAdminTab] onOpenApprovalModal is not a function!");
                            }
                        }}
                        icon={BuildingLibraryIcon}
                        className="flex-1"
                    >
                        대출 승인 관리 열기
                    </Button>
                </div>
            </Card>

            {/* ✅ 3. 신용등급별 이율 보정 관리 (오직 교사만!) */}
            {isTeacher && (
                <Card
                    title="신용등급별 이율 보정 관리"
                    icon={AdjustmentsHorizontalIcon}
                    titleColor="text-purple-700"
                >
                    <p className="text-sm text-slate-600 mb-4">
                        학급에 정의된 신용등급(티어)에 따라 예금 및 대출 상품의 이자율에 적용될 주간 보정치(%p)를 설정합니다.
                    </p>
                    <Button
                        color="purple"
                        onClick={onOpenTierRateModal}
                        icon={AdjustmentsHorizontalIcon}
                    >
                        등급별 이율 보정 설정 열기
                    </Button>
                </Card>
            )}

        </div>
    );
}
