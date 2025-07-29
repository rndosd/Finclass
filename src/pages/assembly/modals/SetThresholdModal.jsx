import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Modal, Button, InputField, Spinner } from '../../../components/ui';
import { useFeedback } from '../../../contexts/FeedbackContext';

/**
 * A modal for teachers/admins to set the passing threshold for assembly bills.
 */
export default function SetThresholdModal({ isOpen, onClose, classId }) {
    const [threshold, setThreshold] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const { showFeedback } = useFeedback();

    // Fetch the current threshold value when the modal opens
    useEffect(() => {
        if (!isOpen || !classId) return;

        const fetchThreshold = async () => {
            setIsLoading(true);
            try {
                const classRef = doc(db, 'classes', classId);
                const classSnap = await getDoc(classRef);
                if (classSnap.exists()) {
                    setThreshold(classSnap.data().assemblyPassThreshold || '');
                }
            } catch (error) {
                showFeedback("투표 기준을 불러오는 중 오류가 발생했습니다.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchThreshold();
    }, [isOpen, classId, showFeedback]);

    // Handle saving the new threshold value
    const handleSave = async () => {
        const numThreshold = Number(threshold);
        if (!Number.isInteger(numThreshold) || numThreshold <= 0) {
            showFeedback('유효한 정수 값을 입력해주세요.', 'warning');
            return;
        }
        setIsSaving(true);
        try {
            const classRef = doc(db, 'classes', classId);
            await updateDoc(classRef, { assemblyPassThreshold: numThreshold });
            showFeedback('투표 통과 기준이 저장되었습니다.', 'success');
            onClose(); // Close modal after saving
        } catch (error) {
            showFeedback('저장 중 오류가 발생했습니다: ' + error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="투표 가결 기준 설정">
            {isLoading ? (
                <div className="p-8 text-center"><Spinner /></div>
            ) : (
                <div className="space-y-4">
                    <InputField
                        label="찬성 득표수 기준"
                        type="number"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        placeholder="예: 15"
                        min="1"
                    />
                    <p className="text-xs text-slate-500">
                        입력된 숫자 이상의 찬성표를 얻으면 법안이 '가결'됩니다.
                    </p>
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
                            저장하기
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}