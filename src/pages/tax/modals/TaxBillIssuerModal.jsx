// src/pages/tax/modals/TaxBillIssuerModal.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import {
    collection, getDocs, doc, writeBatch, serverTimestamp, Timestamp,
    query, orderBy
} from "firebase/firestore";
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { getPath } from '../../tax/utils/taxPathUtils';
import { logTaxAssessed } from '../../../utils/logUtils';
import StudentSelector from '../../../components/ui/StudentSelector';
import { Modal, Button, InputField, Textarea, Spinner } from '../../../components/ui';

const TaxBillIssuerModal = ({ isOpen, onClose }) => {
    const { userData, classId, classData, loading: userContextLoading } = useUser();
    const { showFeedback } = useFeedback();
    const currencyUnit = classData?.currencyUnit || '단위';

    const [students, setStudents] = useState([]);
    const [selectedStudentUids, setSelectedStudentUids] = useState(new Set());
    const [billDetails, setBillDetails] = useState({ name: '', amount: '', reason: '', dueDate: '' });
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isIssuing, setIsIssuing] = useState(false);

    const fetchStudents = useCallback(async () => {
        if (!classId) return;
        setIsLoadingStudents(true);
        try {
            const studentsPath = getPath('students', classId);
            const q = query(collection(db, studentsPath), orderBy("name"));
            const studentsSnapshot = await getDocs(q);
            const fetchedStudents = studentsSnapshot.docs.map(d => {
                const data = d.data();
                const role = data.role || 'student';
                const studentNumberLabel = role === 'teacher' ? '선생님' : (data.studentNumber ? `${data.studentNumber}번` : '번호 없음');
                return {
                    uid: d.id,
                    name: data.name || `학생 ${d.id.substring(0, 5)}`,
                    displayLabel: `${data.name} (${studentNumberLabel})`,
                };
            });
            setStudents(fetchedStudents);
        } catch (err) {
            console.error("Error fetching students in TaxBillIssuerModal:", err);
            showFeedback("학생 목록을 불러오는데 실패했습니다: " + err.message, 'error');
        } finally {
            setIsLoadingStudents(false);
        }
    }, [classId, showFeedback]);

    useEffect(() => {
        if (isOpen && !userContextLoading && classId) {
            fetchStudents();
            setBillDetails({ name: '', amount: '', reason: '', dueDate: '' });
            setSelectedStudentUids(new Set());
        }
    }, [isOpen, userContextLoading, classId, fetchStudents]);

    const handleBillDetailChange = (e) => {
        const { name, value } = e.target;
        setBillDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedStudentUids.size === 0) {
            showFeedback("고지서를 발급할 학생을 선택해주세요.", 'error'); return;
        }
        const amountValue = parseFloat(billDetails.amount);
        if (!billDetails.name || isNaN(amountValue) || amountValue <= 0 || !billDetails.dueDate) {
            showFeedback("이름, 금액, 납부 기한을 정확히 입력해주세요.", 'error'); return;
        }

        setIsIssuing(true);
        showFeedback('고지서 발급 중...', 'info');

        const batch = writeBatch(db);
        const dueDateTimestamp = Timestamp.fromDate(new Date(billDetails.dueDate));

        const billBase = {
            name: billDetails.name.trim(),
            amount: amountValue,
            reason: billDetails.reason.trim() || null,
            dueDate: dueDateTimestamp,
            currencyUnit,
            isPaid: false,
            issuedAt: serverTimestamp(),
            paidAt: null,
            paymentId: null,
            classId,
            issuedBy: userData?.uid,
        };

        let successCount = 0;
        for (const uid of selectedStudentUids) {
            const path = getPath('studentTaxBillCollection', classId, { studentUid: uid });
            console.log('[issuer] new bill path:', path);
            const newDocRef = doc(collection(db, path));
            batch.set(newDocRef, { ...billBase, studentUid: uid });
            console.log('[issuer] newDocRef.id =', newDocRef.id);
            await logTaxAssessed({
                classId,
                studentUid: uid,
                actorUid: userData?.uid,
                assessedAmount: amountValue,
                currency: currencyUnit,
                taxTypeDescription: billDetails.name,
                relatedDocId: newDocRef.id,
                batchObject: batch
            });
            successCount++;
        }

        try {
            if (successCount > 0) console.log('[issuer] successCount:', successCount); await batch.commit(); console.log('[issuer] batch committed 👍');
            showFeedback(`${successCount}명의 학생에게 고지서를 발급했습니다.`, 'success');
            onClose();
        } catch (err) {
            console.error("Batch error:", err);
            showFeedback(`오류 발생: ${err.message}`, 'error');
        } finally {
            setIsIssuing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="세금 고지서 발급">
            <form onSubmit={handleSubmit} className="space-y-4">
                {isLoadingStudents ? <Spinner message="학생 목록 로딩 중..." /> : (
                    <StudentSelector
                        allStudents={students}
                        selectedStudentUids={selectedStudentUids}
                        onSelectionChange={setSelectedStudentUids}
                        listTitle="대상 학생 선택"
                        showSelectAll
                        initiallyExpanded
                        getLabel={(s) => s.displayLabel}
                    />
                )}

                <InputField
                    label="고지서 이름"
                    name="name"
                    value={billDetails.name}
                    onChange={handleBillDetailChange}
                    required
                />
                <InputField
                    label={`청구 금액 (${currencyUnit})`}
                    name="amount"
                    type="number"
                    value={billDetails.amount}
                    onChange={handleBillDetailChange}
                    min="0.01"
                    step="any"
                    required
                />
                <Textarea
                    label="상세 사유"
                    name="reason"
                    value={billDetails.reason}
                    onChange={handleBillDetailChange}
                />
                <InputField
                    label="납부 기한"
                    name="dueDate"
                    type="date"
                    value={billDetails.dueDate}
                    onChange={handleBillDetailChange}
                    required
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" onClick={onClose} variant="secondary">취소</Button>
                    <Button type="submit" disabled={isIssuing || selectedStudentUids.size === 0}>
                        {isIssuing ? '발급 중...' : `${selectedStudentUids.size}명에게 발급`}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default TaxBillIssuerModal;
