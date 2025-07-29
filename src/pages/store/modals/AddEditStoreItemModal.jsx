// src/pages/store/modals/AddEditStoreItemModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, InputField, ToggleSwitch, Alert, SelectField } from '../../../components/ui';
import { doc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';
import useStoreData from '../hooks/useStoreData';

const AddEditStoreItemModal = ({ isOpen, onClose, selectedCategoryId, itemToEdit = null }) => {
    const { classId } = useUser();
    const { categories } = useStoreData();

    const [categoryId, setCategoryId] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // ⭐ 수정 모드 시 기존 데이터 채우기
    useEffect(() => {
        if (itemToEdit) {
            setCategoryId(itemToEdit.categoryId || '');
            setName(itemToEdit.name || '');
            setDescription(itemToEdit.description || '');
            setPrice(itemToEdit.price?.toString() || '');
            setStock(itemToEdit.stock === -1 ? '' : itemToEdit.stock?.toString() || '');
            setImageUrl(itemToEdit.imageUrl || '');
            setIsActive(itemToEdit.isActive ?? true);
        } else {
            setCategoryId(selectedCategoryId || '');
            setName('');
            setDescription('');
            setPrice('');
            setStock('');
            setImageUrl('');
            setIsActive(true);
        }
        setErrorMessage('');
    }, [itemToEdit, selectedCategoryId, isOpen]);

    const handleSubmit = async () => {
        if (!classId) {
            setErrorMessage('학급 정보가 없습니다. 다시 시도해주세요.');
            return;
        }
        if (!categoryId) {
            setErrorMessage('카테고리를 선택해주세요.');
            return;
        }
        if (!name.trim()) {
            setErrorMessage('상품명을 입력해주세요.');
            return;
        }
        if (!price || isNaN(Number(price)) || Number(price) <= 0) {
            setErrorMessage('유효한 가격을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            if (itemToEdit?.id) {
                // ⭐ 수정 (update)
                const itemDocRef = doc(db, 'classes', classId, 'storeItems', itemToEdit.id);
                await updateDoc(itemDocRef, {
                    categoryId,
                    name: name.trim(),
                    description: description.trim(),
                    price: Number(price),
                    stock: stock === '' ? -1 : Number(stock),
                    imageUrl: imageUrl.trim(),
                    isActive,
                });
            } else {
                // ⭐ 추가 (add)
                const itemRef = collection(db, 'classes', classId, 'storeItems');
                await addDoc(itemRef, {
                    categoryId,
                    name: name.trim(),
                    description: description.trim(),
                    price: Number(price),
                    stock: stock === '' ? -1 : Number(stock),
                    imageUrl: imageUrl.trim(),
                    isActive,
                    createdAt: serverTimestamp(),
                });
            }

            // 성공 시 → 모달 닫기
            onClose();
        } catch (err) {
            console.error('[AddEditStoreItemModal] Error saving store item:', err);
            setErrorMessage('상품 저장 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title={itemToEdit ? '상품 수정' : '상품 추가'} onClose={handleClose} size="md">
            <div className="space-y-4">
                <SelectField
                    label="카테고리 선택"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    disabled={isSubmitting}
                >
                    <option value="">카테고리 선택</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name} {cat.isActive ? '' : '(비활성)'}
                        </option>
                    ))}
                </SelectField>

                <InputField
                    label="상품명"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="예: 초코파이, 연필세트"
                    disabled={isSubmitting}
                />

                <InputField
                    label="설명"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="상품 설명을 입력하세요"
                    disabled={isSubmitting}
                />

                <InputField
                    label="가격 (숫자, 단위: 학급 화폐)"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    type="number"
                    min="1"
                    disabled={isSubmitting}
                />

                <InputField
                    label="재고 (빈칸 또는 -1 → 무제한)"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    type="number"
                    disabled={isSubmitting}
                />

                <InputField
                    label="상품 이미지 URL (선택)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.png"
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
                        {isSubmitting ? '저장 중...' : (itemToEdit ? '수정' : '저장')}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default AddEditStoreItemModal;
