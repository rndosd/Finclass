import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Modal, Button, InputField } from '../../../components/ui';
import { useFeedback } from '../../../contexts/FeedbackContext';

const DEFAULT_LABELS = {
    3: { label: '❗ 중대한 위반', color: 'text-red-600' },
    2: { label: '⚠️ 주의가 필요한 행동', color: 'text-yellow-700' },
    1: { label: '📎 일반 생활 수칙', color: 'text-gray-700' },
};

const DangerLabelSettingsModal = ({ classId, onClose, hideColorSetting = false }) => {
    const { showFeedback } = useFeedback();
    const [labels, setLabels] = useState(DEFAULT_LABELS);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchLabels = async () => {
            try {
                const docRef = doc(db, `classes/${classId}/policeDangerLabels/settings`);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setLabels(snap.data());
                }
            } catch (err) {
                console.error('레이블 불러오기 실패:', err);
            }
        };
        if (classId) fetchLabels();
    }, [classId]);

    const handleChange = (level, field, value) => {
        setLabels(prev => ({
            ...prev,
            [level]: {
                ...prev[level],
                [field]: value,
            },
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docRef = doc(db, `classes/${classId}/policeDangerLabels/settings`);
            await setDoc(docRef, labels);
            showFeedback('위험도 레이블이 저장되었습니다.', 'success');
            onClose();
        } catch (err) {
            console.error('저장 실패:', err);
            showFeedback('저장 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal title="⚙️ 위험도 레이블 설정" isOpen onClose={onClose}>
            <div className="space-y-6">
                {[3, 2, 1].map(level => (
                    <div key={level}>
                        <h3 className="font-semibold text-sm mb-2">위험도 {level} 설정</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <InputField
                                label="레이블 이름"
                                value={labels[level]?.label || ''}
                                onChange={e => handleChange(level, 'label', e.target.value)}
                            />
                            {!hideColorSetting && (
                                <InputField
                                    label="Tailwind 색상 클래스"
                                    value={labels[level]?.color || ''}
                                    onChange={e => handleChange(level, 'color', e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 text-right">
                <Button onClick={handleSave} color="blue" disabled={isSaving}>
                    💾 저장하기
                </Button>
            </div>
        </Modal>
    );
};

export default DangerLabelSettingsModal;
