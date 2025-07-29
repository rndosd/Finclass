// src/pages/bank/tabs/BankMainTab.jsx

import React from 'react';
import AssetSummaryCard from '../components/AssetSummaryCard';
import TransferCard from '../components/TransferCard';
import { Card } from '../../../components/ui';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { AlertCircle } from 'lucide-react';

function BankMainTab({
    studentAssets,
    creditScore,
    currentTierInfo,
    currentRateModifiers,
    currencyUnit,
    isMyBankPage,
    classId,
    currentStudentUid,
    studentInfo,
    onTransferSuccess,
    hasPermission // ⭐ prop으로 hasPermission 함수를 받습니다.
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <AssetSummaryCard
                studentAssets={studentAssets}
                creditScore={creditScore}
                currentTierInfo={currentTierInfo}
                currentRateModifiers={currentRateModifiers}
                currencyUnit={currencyUnit}
            />

            {/* ⭐ 시작: 권한에 따른 조건부 렌더링 */}
            {hasPermission('action_bank_transfer') ? (
                // 송금 권한이 있는 경우
                <TransferCard
                    classId={classId}
                    currentStudentUid={currentStudentUid}
                    currentStudentCash={studentAssets.cash}
                    studentInfo={studentInfo}
                    onTransferSuccess={onTransferSuccess}
                    currencyUnit={currencyUnit}
                />
            ) : (
                // 송금 권한이 없는 경우
                <Card title="송금하기" icon={PaperAirplaneIcon} titleColor="text-cyan-700" className="h-full flex items-center justify-center">
                    <div className="text-center text-slate-500 py-4 flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-slate-400" />
                        <p>송금 기능에 대한 권한이 없습니다.</p>
                    </div>
                </Card>
            )}
            {/* ⭐ 끝: 수정된 부분 */}

        </div>
    );
}

export default BankMainTab;