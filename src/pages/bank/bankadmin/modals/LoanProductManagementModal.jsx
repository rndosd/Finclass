// src/pages/bank/bankadmin/modals/LoanProductManagementModal.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button, Modal, Spinner, Alert } from '../../../../components/ui';
import ProductForm from './ProductForm';

export default function LoanProductManagementModal({ isOpen, onClose, classId }) {
    const [loanProducts, setLoanProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [alertInfo, setAlertInfo] = useState({ open: false, message: '', type: 'info' });

    useEffect(() => {
        if (!isOpen || !classId) {
            setIsLoading(false);
            setLoanProducts([]);
            return;
        }
        const fetchLoanProducts = async () => {
            setIsLoading(true);
            const configDocRef = doc(db, "classes", classId, "config", "classSettings");
            const docSnap = await getDoc(configDocRef);
            if (docSnap.exists()) {
                const loanProductsData = docSnap.data()?.bankProductSettings?.loanProducts || [];
                setLoanProducts(loanProductsData.map(p => ({ ...p, active: p.active === undefined ? true : p.active })));
            } else {
                setLoanProducts([]);
            }
            setIsLoading(false);
        };
        fetchLoanProducts();
    }, [isOpen, classId]);

    const handleProductChange = (index, updatedProduct) => {
        setLoanProducts(prev => prev.map((p, i) => i === index ? updatedProduct : p));
    };

    const handleAddProduct = () => {
        const autoId = `lp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        setLoanProducts(prev => [
            ...prev,
            { id: autoId, label: '', days: 7, periodRate: 0, maxLoanProductLimit: null, minCreditScore: null, active: true, isNew: true, tempId: autoId }
        ]);
    };

    const handleRemoveProduct = (index) => {
        if (!window.confirm("해당 대출 상품을 삭제하시겠습니까? '저장' 버튼을 눌러야 DB에 반영됩니다.")) return;
        setLoanProducts(prev => prev.filter((_, i) => i !== index));
    };

    const saveProducts = async () => {
        if (!classId) return;

        // ✅ 상품명 비어있는지 검사
        const emptyLabelProduct = loanProducts.find(p => !p.label || p.label.trim() === '');
        if (emptyLabelProduct) {
            setAlertInfo({
                open: true,
                message: `❌ 상품명 입력이 비어있는 상품이 있습니다. 모든 상품명은 반드시 입력해야 합니다.`,
                type: "error"
            });
            return;
        }

        if (!window.confirm(`'${classId}' 학급 대출 상품 설정을 저장하시겠습니까?`)) return;

        setIsLoading(true);
        try {
            const cleanProducts = loanProducts.map(p => {
                const { isNew, tempId, ...rest } = p;
                return {
                    ...rest,
                    active: p.active === undefined ? true : p.active,
                    days: Number(rest.days) || 7,
                    periodRate: Number(rest.periodRate) || 0,
                    maxLoanProductLimit: rest.maxLoanProductLimit !== null ? Number(rest.maxLoanProductLimit) : null,
                    minCreditScore: rest.minCreditScore !== null ? Number(rest.minCreditScore) : null,
                };
            });
            const configDocRef = doc(db, "classes", classId, "config", "classSettings");
            await setDoc(configDocRef, { bankProductSettings: { loanProducts: cleanProducts } }, { merge: true });
            setAlertInfo({
                open: true,
                message: "✅ 대출 상품 설정이 저장되었습니다.",
                type: "success"
            });
        } catch (error) {
            console.error("대출 상품 저장 오류:", error);
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
        <Modal isOpen={isOpen} onClose={onClose} title="💳 대출 상품 관리">
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
                    {loanProducts.map((product, index) => (
                        <ProductForm
                            key={product.tempId || product.id}
                            product={product}
                            onChange={(p) => handleProductChange(index, p)}
                            onRemove={() => handleRemoveProduct(index)}
                            type="loanProducts"
                        />
                    ))}
                    <div className="mt-4 flex justify-between">
                        <Button onClick={handleAddProduct} color="blue">새 대출 상품 추가</Button>
                        <Button onClick={saveProducts} color="indigo">저장</Button>
                    </div>
                </>
            )}
        </Modal>
    );
}
