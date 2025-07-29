// src/pages/bank/components/TransferCard.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import {
    doc, collection, getDocs, query, where,
    writeBatch, increment
} from 'firebase/firestore';

import { Button, Card, InputField, SelectField } from '../../../components/ui';
import { PaperAirplaneIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { logTransfer } from '../../../utils/logUtils';
import TransferHistoryModal from '../modals/TransferHistoryModal';
import { useFeedback } from '../../../contexts/FeedbackContext';   // ✅ 전역 피드백

function TransferCard({
    classId,
    currentStudentUid,
    currentStudentCash,
    studentInfo,
    onTransferSuccess,
    currencyUnit
}) {
    const [recipients, setRecipients] = useState([]);
    const [selectedRecipient, setSelectedRecipient] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
    const [showTransferHistoryModal, setShowTransferHistoryModal] = useState(false);

    const { showFeedback } = useFeedback();                       // ✅

    /* -------- 수신자 목록 로드 -------- */
    useEffect(() => {
        const fetchRecipients = async () => {
            if (!classId) return;
            setIsLoadingRecipients(true);
            try {
                const q = query(
                    collection(db, `classes/${classId}/students`),
                    where('__name__', '!=', currentStudentUid)
                );
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({
                    uid: d.id,
                    name: d.data().name || `학생 ${d.id.slice(0, 5)}`
                }));
                setRecipients(list);
            } catch (err) {
                console.error('학생 수신자 목록 오류:', err);
                showFeedback('수신자 목록을 불러오지 못했습니다.', 'error');   // ✅
            } finally {
                setIsLoadingRecipients(false);
            }
        };
        fetchRecipients();
    }, [classId, currentStudentUid, showFeedback]);

    /* -------- 송금 실행 -------- */
    const handleTransfer = async () => {
        const amountNum = Number(transferAmount);

        // 기본 검증
        if (!selectedRecipient || !amountNum || amountNum <= 0) {
            showFeedback('수신자와 금액을 올바르게 입력하세요.', 'warning');  // ✅
            return;
        }
        if (amountNum > currentStudentCash) {
            showFeedback('현금 잔액이 부족합니다.', 'error');                // ✅
            return;
        }

        const recipient = recipients.find(r => r.uid === selectedRecipient);
        if (!recipient) {
            showFeedback('수신자 정보를 찾을 수 없습니다.', 'error');          // ✅
            return;
        }

        const senderName = studentInfo?.name || `학생 ${currentStudentUid.slice(0, 5)}`;
        const receiverName = recipient.name;

        if (!window.confirm(
            `${receiverName}님에게 ${amountNum.toLocaleString()} ${currencyUnit}을(를) 송금하시겠습니까?`
        )) return;

        try {
            /* 자산 업데이트 */
            const batch = writeBatch(db);
            batch.update(doc(db, `classes/${classId}/students/${currentStudentUid}`),
                { 'assets.cash': increment(-amountNum) });
            batch.update(doc(db, `classes/${classId}/students/${recipient.uid}`),
                { 'assets.cash': increment(amountNum) });
            await batch.commit();

            /* 로그 기록 */
            await logTransfer({
                classId,
                senderUid: currentStudentUid,
                receiverUid: recipient.uid,
                amount: amountNum,
                currency: currencyUnit,
                senderName,
                receiverName
            });

            showFeedback('송금이 완료되었습니다.', 'success');               // ✅
            setTransferAmount('');
            setSelectedRecipient('');
            onTransferSuccess?.();
        } catch (err) {
            console.error('송금 오류:', err);
            showFeedback(`송금 중 오류가 발생했습니다: ${err.message}`, 'error'); // ✅
        }
    };

    return (
        <>
            <Card
                title="송금하기"
                icon={PaperAirplaneIcon}
                titleColor="text-cyan-700"
                className="bg-cyan-50/50 border-cyan-200 h-full"
            >
                <div className="space-y-4 flex flex-col flex-grow">
                    <SelectField
                        id="recipient"
                        label="송금할 학생 선택"
                        value={selectedRecipient}
                        onChange={e => setSelectedRecipient(e.target.value)}
                        disabled={isLoadingRecipients}
                    >
                        {isLoadingRecipients && <option>로딩 중...</option>}
                        {!isLoadingRecipients && recipients.length === 0 && (
                            <option>송금 대상 없음</option>
                        )}
                        {!isLoadingRecipients && recipients.length > 0 && (
                            <>
                                <option value="">-- 선택 --</option>
                                {recipients.map(r => (
                                    <option key={r.uid} value={r.uid}>{r.name}</option>
                                ))}
                            </>
                        )}
                    </SelectField>

                    <InputField
                        id="transferAmount"
                        label={`송금액 (${currencyUnit})`}
                        type="number"
                        value={transferAmount}
                        onChange={e => setTransferAmount(e.target.value)}
                        min="1"
                        placeholder="금액 입력"
                    />

                    <div className="mt-auto pt-4 flex space-x-2">
                        <Button
                            onClick={handleTransfer}
                            color="cyan"
                            className="flex-1"
                            icon={PaperAirplaneIcon}
                            disabled={!selectedRecipient || !transferAmount || Number(transferAmount) <= 0 || isLoadingRecipients}
                        >
                            송금 실행
                        </Button>
                        <Button
                            onClick={() => setShowTransferHistoryModal(true)}
                            color="gray"
                            variant="outline"
                            className="flex-1"
                            icon={ListBulletIcon}
                        >
                            송금 내역
                        </Button>
                    </div>
                </div>
            </Card>

            {showTransferHistoryModal && (
                <TransferHistoryModal
                    isOpen={showTransferHistoryModal}
                    onClose={() => setShowTransferHistoryModal(false)}
                    classId={classId}
                    uid={currentStudentUid}
                    currencyUnit={currencyUnit}
                />
            )}
        </>
    );
}

export default TransferCard;
