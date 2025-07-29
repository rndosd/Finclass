// src/pages/bank/bankadmin/modals/DepositProductManagementModal.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button, Modal, Spinner, Alert } from '../../../../components/ui';
import ProductForm from './ProductForm';

export default function DepositProductManagementModal({ isOpen, onClose, classId }) {
    const [depositProducts, setDepositProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [alertInfo, setAlertInfo] = useState({ open: false, message: '', type: 'info' });

    useEffect(() => {
        if (!isOpen || !classId) {
            setIsLoading(false);
            setDepositProducts([]);
            return;
        }
        const fetchDepositProducts = async () => {
            setIsLoading(true);
            const configDocRef = doc(db, "classes", classId, "config", "classSettings");
            const docSnap = await getDoc(configDocRef);
            if (docSnap.exists()) {
                const depositProductsData = docSnap.data()?.bankProductSettings?.depositProducts || [];
                setDepositProducts(depositProductsData.map(p => ({ ...p, active: p.active === undefined ? true : p.active })));
            } else {
                setDepositProducts([]);
            }
            setIsLoading(false);
        };
        fetchDepositProducts();
    }, [isOpen, classId]);

    const handleProductChange = (index, updatedProduct) => {
        setDepositProducts(prev => prev.map((p, i) => i === index ? updatedProduct : p));
    };

    const handleAddProduct = () => {
        const autoId = `dp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        setDepositProducts(prev => [
            ...prev,
            { id: autoId, label: '', days: 7, rate: 0, maxDepositAmount: null, active: true, isNew: true, tempId: autoId }
        ]);
    };

    const handleRemoveProduct = (index) => {
        if (!window.confirm("해당 예금 상품을 삭제하시겠습니까? '저장' 버튼을 눌러야 DB에 반영됩니다.")) return;
        setDepositProducts(prev => prev.filter((_, i) => i !== index));
    };

    const saveProducts = async () => {
        if (!classId) return;

        // ✅ 상품명 비어있는지 검사
        const emptyLabelProduct = depositProducts.find(p => !p.label || p.label.trim() === '');
        if (emptyLabelProduct) {
            setAlertInfo({
                open: true,
                message: `❌ 상품명 입력이 비어있는 상품이 있습니다. 모든 상품명은 반드시 입력해야 합니다.`,
                type: "error"
            });
            return;
        }

        if (!window.confirm(`'${classId}' 학급 예금 상품 설정을 저장하시겠습니까?`)) return;

        setIsLoading(true);
        try {
            const cleanProducts = depositProducts.map(p => {
                const { isNew, tempId, ...rest } = p;
                return {
                    ...rest,
                    active: p.active === undefined ? true : p.active,
                    days: Number(rest.days) || 7,
                    rate: Number(rest.rate) || 0,
                    maxDepositAmount: rest.maxDepositAmount !== null ? Number(rest.maxDepositAmount) : null,
                };
            });
            const configDocRef = doc(db, "classes", classId, "config", "classSettings");
            await setDoc(configDocRef, { bankProductSettings: { depositProducts: cleanProducts } }, { merge: true });
            setAlertInfo({
                open: true,
                message: "✅ 예금 상품 설정이 저장되었습니다.",
                type: "success"
            });
        } catch (error) {
            console.error("예금 상품 저장 오류:", error);
            setAlertInfo({
                open: true,
                message: `저장 실패: ${error.message}`,
                type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="💰 예금 상품 관리">
            {alertInfo.open && (
                <Alert
                    type={alertInfo.type}
                    message={alertInfo.message}
                    onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))}
                />
            )}
            {isLoading ? (
                <div className="flex justify-center py-10"><Spinner /><p className="ml-2">로딩 중...</p></div>
            ) : (
                <>
                    {depositProducts.map((product, index) => (
                        <ProductForm
                            key={product.tempId || product.id}
                            product={product}
                            onChange={(p) => handleProductChange(index, p)}
                            onRemove={() => handleRemoveProduct(index)}
                            type="depositProducts"
                        />
                    ))}
                    <div className="mt-4 flex justify-between">
                        <Button onClick={handleAddProduct} color="green">새 예금 상품 추가</Button>
                        <Button onClick={saveProducts} color="indigo">저장</Button>
                    </div>
                </>
            )}
        </Modal>
    );
}
