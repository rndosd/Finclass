// src/pages/store/modals/AddEditCategoryModal.jsx
import React, { useState } from 'react';
import { Modal, Button, InputField, ToggleSwitch, Alert } from '../../../components/ui';
import { doc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';

const AddEditCategoryModal = ({ isOpen, onClose }) => {
    const { classId } = useUser();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async () => {
        if (!classId) {
            setErrorMessage('학급 정보가 없습니다. 다시 시도해주세요.');
            return;
        }
        if (!name.trim()) {
            setErrorMessage('카테고리명을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const categoryRef = collection(db, 'classes', classId, 'storeCategories');
            await addDoc(categoryRef, {
                name: name.trim(),
                description: description.trim(),
                isActive,
                createdAt: serverTimestamp(),
            });

            // 성공 시 → 모달 닫기
            onClose();
        } catch (err) {
            console.error('[AddEditCategoryModal] Error adding category:', err);
            setErrorMessage('카테고리 저장 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setName('');
        setDescription('');
        setIsActive(true);
        setErrorMessage('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title="카테고리 추가" onClose={handleClose} size="md">
            <div className="space-y-4">
                <InputField
                    label="카테고리명"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 과자, 음료, 학용품"
                    disabled={isSubmitting}
                />

                <InputField
                    label="설명"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="카테고리에 대한 설명을 입력하세요"
                    disabled={isSubmitting}
                />

                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">활성화 여부</label>
                    <ToggleSwitch
                        checked={isActive}
                        onChange={setIsActive}
                        disabled={isSubmitting}
                    />
                </div>

                {errorMessage && <Alert type="error" message={errorMessage} />}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-5">
                    <Button onClick={handleClose} variant="secondary" color="gray" disabled={isSubmitting}>취소</Button>
                    <Button onClick={handleSubmit} color="indigo" isLoading={isSubmitting}>
                        {isSubmitting ? '저장 중...' : '저장'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AddEditCategoryModal;
