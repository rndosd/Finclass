// src/pages/bank/bankadmin/modals/ProductManagementModal.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase'; // Firebase 경로 확인
import { doc, getDoc, setDoc } from 'firebase/firestore';

// 공용 UI 컴포넌트 import (경로 확인)
import { Button, Card, InputField, Alert, Spinner, Modal } from '../../../../components/ui';
import { PlusCircleIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

// ProductForm
function ProductForm({ product, onChange, onRemove, type }) {
    const handleInputChange = (field, value) => {
        onChange({ ...product, [field]: value });
    };

    const handleWeeksInputChange = (value) => {
        const numWeeks = value === '' ? '' : parseInt(value, 10);
        if (value === '' || (!isNaN(numWeeks) && numWeeks >= 0)) {
            onChange({
                ...product,
                days: value === '' ? undefined : numWeeks * 7
            });
        }
    };

    const handleNumericInputChange = (field, value) => {
        const numValue = value === '' ? '' : Number(value);
        if (value === '' || !isNaN(numValue)) {
            onChange({ ...product, [field]: value === '' ? undefined : numValue });
        }
    };

    const displayWeeks = product.days === undefined || product.days === null || isNaN(Number(product.days))
        ? ''
        : Number(product.days) / 7;

    return (
        <div className="border p-3 my-2 rounded bg-slate-50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
            <InputField
                id={`pm-id-${product.tempId || product.id}`}
                label="상품 ID"
                type="text"
                placeholder="자동 생성"
                value={product.id || ""}
                readOnly
                className="bg-gray-100 text-gray-500 text-xs"
            />
            <InputField
                id={`pm-label-${product.tempId || product.id}`}
                label="상품명"
                type="text"
                placeholder={type === "depositProducts" ? "예: 2주 만기 예금" : "예: 단기 응원 대출"}
                value={product.label || ""}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="text-xs"
            />
            <InputField
                id={`pm-weeks-${product.tempId || product.id}`}
                label="기간 (주)"
                type="number"
                min="1"
                placeholder="예: 2 (2주)"
                value={displayWeeks}
                onChange={(e) => handleWeeksInputChange(e.target.value)}
                className="text-xs"
            />
            <InputField
                id={`pm-rate-${product.tempId || product.id}`}
                label="해당 기간 금리(%)" // 레이블은 이미 "해당 기간 금리"로 정확했음
                type="number" step="0.01" min="0" placeholder="예: 1.5"
                value={(type === "depositProducts" ? product.rate : product.periodRate) === undefined ? '' : (type === "depositProducts" ? product.rate : product.periodRate)}
                onChange={(e) => handleNumericInputChange(type === "depositProducts" ? 'rate' : 'periodRate', e.target.value)}
                className="text-xs"
            />

            {type === "depositProducts" && (
                <InputField
                    id={`pm-max-deposit-amount-${product.tempId || product.id}`}
                    label="최대 예치 한도액"
                    type="number"
                    min="0"
                    placeholder="비워두면 한도 없음"
                    value={product.maxDepositAmount === undefined || product.maxDepositAmount === null ? '' : product.maxDepositAmount}
                    onChange={(e) => handleNumericInputChange('maxDepositAmount', e.target.value)}
                    className="text-xs"
                />
            )}
            {type === "loanProducts" && (
                <>
                    <InputField
                        id={`pm-max-loan-limit-${product.tempId || product.id}`}
                        label="상품 최대 한도액"
                        type="number"
                        min="0"
                        placeholder="비워두면 한도 없음"
                        value={product.maxLoanProductLimit === undefined || product.maxLoanProductLimit === null ? '' : product.maxLoanProductLimit}
                        onChange={(e) => handleNumericInputChange('maxLoanProductLimit', e.target.value)}
                        className="text-xs"
                    />
                    <InputField
                        id={`pm-min-credit-score-${product.tempId || product.id}`}
                        label="최소 신용점수 조건"
                        type="number"
                        min="0"
                        placeholder="비워두면 조건 없음"
                        value={product.minCreditScore === undefined || product.minCreditScore === null ? '' : product.minCreditScore}
                        onChange={(e) => handleNumericInputChange('minCreditScore', e.target.value)}
                        className="text-xs"
                    />
                </>
            )}

            <div className={`flex items-center space-x-3 pt-5 ${type === "depositProducts" ? 'md:col-start-3' : ''}`}>
                <label className="flex items-center text-xs text-gray-700 cursor-pointer select-none">
                    <input type="checkbox" checked={product.active === undefined ? true : product.active}
                        onChange={(e) => handleInputChange('active', e.target.checked)}
                        className="mr-1.5 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    /> 활성
                </label>
                {onRemove && (<Button onClick={onRemove} variant="tertiary" color="red" size="xs" icon={TrashIcon} className="p-1">삭제</Button>)}
            </div>
        </div>
    );
}

export default function ProductManagementModal({ isOpen, onClose, classId }) {
    const [bankProducts, setBankProducts] = useState({ depositProducts: [], loanProducts: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [alertInfo, setAlertInfo] = useState({ open: false, message: '', type: 'info' });

    useEffect(() => {
        if (!isOpen || !classId) {
            setIsLoading(false);
            setBankProducts({ depositProducts: [], loanProducts: [] });
            return;
        }
        const fetchClassBankProducts = async () => {
            setIsLoading(true);
            setAlertInfo({ open: false, message: '' });
            const configDocRef = doc(db, "classes", classId, "config", "classSettings");
            const docSnap = await getDoc(configDocRef);

            if (docSnap.exists()) {
                const productSettingsData = docSnap.data()?.bankProductSettings || {};
                setBankProducts({
                    depositProducts: productSettingsData.depositProducts?.map(p => ({ ...p, active: p.active === undefined ? true : p.active })) || [],
                    loanProducts: productSettingsData.loanProducts?.map(p => {
                        const newP = { ...p, active: p.active === undefined ? true : p.active };
                        // 기존 데이터 호환성: Firestore에 annualRate로 저장된 경우 periodRate로 옮기고 annualRate 삭제
                        if (newP.annualRate !== undefined && newP.periodRate === undefined) {
                            newP.periodRate = newP.annualRate;
                            delete newP.annualRate;
                        }
                        return newP;
                    }) || [],
                });
            } else {
                setBankProducts({ depositProducts: [], loanProducts: [] });
            }
            setIsLoading(false);
        };
        fetchClassBankProducts();
    }, [isOpen, classId]);

    const handleProductChange = (productType, index, updatedProduct) => {
        setBankProducts(prev => ({ ...prev, [productType]: prev[productType].map((p, i) => i === index ? updatedProduct : p) }));
    };

    const handleAddProduct = (productType) => {
        const autoGeneratedId = `${productType === "depositProducts" ? 'dp' : 'lp'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newProductScaffold = productType === "depositProducts"
            ? { id: autoGeneratedId, label: "", days: 7, rate: undefined, maxDepositAmount: undefined, active: true, isNew: true, tempId: autoGeneratedId }
            // ✨ 대출 상품 스캐폴드에서 annualRate를 periodRate로 변경
            : { id: autoGeneratedId, label: "", days: 7, periodRate: undefined, maxLoanProductLimit: undefined, minCreditScore: undefined, active: true, isNew: true, tempId: autoGeneratedId };
        setBankProducts(prev => ({ ...prev, [productType]: [...prev[productType], newProductScaffold] }));
    };

    const handleRemoveProduct = (productType, index) => {
        if (!window.confirm("해당 상품을 목록에서 삭제하시겠습니까? '저장하기'를 눌러야 DB에 반영됩니다.")) return;
        setBankProducts(prev => ({ ...prev, [productType]: prev[productType].filter((_, i) => i !== index) }));
    };

    const saveBankSettings = async () => {
        if (!classId) {
            setAlertInfo({ open: true, message: "학급 ID가 없어 상품 설정을 저장할 수 없습니다.", type: "error" });
            return;
        }

        const cleanProductData = (product, productType) => {
            const { isNew, tempId, ...restOfProductData } = product;
            let cleanedProduct = { ...restOfProductData };

            cleanedProduct.active = product.active === undefined ? true : product.active;

            const daysNum = Number(cleanedProduct.days);
            cleanedProduct.days = (!isNaN(daysNum) && daysNum > 0) ? daysNum : 0;

            if (productType === "depositProducts") {
                const rateNum = Number(cleanedProduct.rate);
                cleanedProduct.rate = (!isNaN(rateNum) && rateNum >= 0) ? rateNum : 0;

                if (cleanedProduct.maxDepositAmount !== undefined && cleanedProduct.maxDepositAmount !== null) {
                    const maxAmountNum = Number(cleanedProduct.maxDepositAmount);
                    cleanedProduct.maxDepositAmount = (!isNaN(maxAmountNum) && maxAmountNum >= 0) ? maxAmountNum : null;
                } else {
                    cleanedProduct.maxDepositAmount = null;
                }
            } else { // loanProducts
                // ✨ annualRate를 periodRate로 변경하여 처리
                const periodRateNum = Number(cleanedProduct.periodRate);
                cleanedProduct.periodRate = (!isNaN(periodRateNum) && periodRateNum >= 0) ? periodRateNum : 0;

                if (cleanedProduct.maxLoanProductLimit !== undefined && cleanedProduct.maxLoanProductLimit !== null) {
                    const maxLoanLimitNum = Number(cleanedProduct.maxLoanProductLimit);
                    cleanedProduct.maxLoanProductLimit = (!isNaN(maxLoanLimitNum) && maxLoanLimitNum >= 0) ? maxLoanLimitNum : null;
                } else {
                    cleanedProduct.maxLoanProductLimit = null;
                }

                if (cleanedProduct.minCreditScore !== undefined && cleanedProduct.minCreditScore !== null) {
                    const minCreditNum = Number(cleanedProduct.minCreditScore);
                    cleanedProduct.minCreditScore = (!isNaN(minCreditNum) && minCreditNum >= 0) ? minCreditNum : null;
                } else {
                    cleanedProduct.minCreditScore = null;
                }
            }
            return cleanedProduct;
        };

        const productsToSave = {
            depositProducts: bankProducts.depositProducts.map(p => cleanProductData(p, "depositProducts")),
            loanProducts: bankProducts.loanProducts.map(p => cleanProductData(p, "loanProducts")),
        };

        let isValid = true;
        let errorMessage = "";

        const validateProductFields = (p, prodTypeStr) => {
            if (!p.id || !p.id.trim()) return `상품 목록에 ID가 없는 상품이 있습니다. (상품명: ${p.label || '이름없음'})`;
            if (!p.label || !p.label.trim()) return `상품 ID '${p.id}'의 상품명이 비어있습니다.`;
            if (typeof p.days !== 'number' || p.days <= 0) {
                return `'${p.label}' 상품의 기간은 1주(7일) 이상이어야 합니다. (현재: ${p.days / 7}주)`;
            }

            if (prodTypeStr === "depositProducts") {
                if (typeof p.rate !== 'number' || p.rate < 0) {
                    return `'${p.label}' 예금 상품의 이율은 0 이상이어야 합니다. (현재: ${p.rate})`;
                }
                if (p.maxDepositAmount !== null && (typeof p.maxDepositAmount !== 'number' || p.maxDepositAmount < 0)) {
                    return `'${p.label}' 예금 상품의 최대 예치 한도액은 0 이상이거나 설정하지 않아야 합니다. (현재: ${p.maxDepositAmount})`;
                }
            } else if (prodTypeStr === "loanProducts") {
                // ✨ annualRate를 periodRate로 변경하고, 오류 메시지도 "기간 이율"로 수정
                if (typeof p.periodRate !== 'number' || p.periodRate < 0) {
                    return `'${p.label}' 대출 상품의 기간 이율은 0 이상이어야 합니다. (현재: ${p.periodRate})`;
                }
                if (p.minCreditScore !== null && (typeof p.minCreditScore !== 'number' || p.minCreditScore < 0)) {
                    return `'${p.label}' 대출 상품의 최소 신용점수는 0 이상이거나 설정하지 않아야 합니다. (현재: ${p.minCreditScore})`;
                }
                if (p.maxLoanProductLimit !== null && (typeof p.maxLoanProductLimit !== 'number' || p.maxLoanProductLimit < 0)) {
                    return `'${p.label}' 대출 상품의 상품 최대 한도액은 0 이상이거나 설정하지 않아야 합니다. (현재: ${p.maxLoanProductLimit})`;
                }
            }
            return null;
        };

        for (const p of productsToSave.depositProducts) {
            errorMessage = validateProductFields(p, "depositProducts");
            if (errorMessage) { isValid = false; break; }
        }
        if (isValid) {
            for (const p of productsToSave.loanProducts) {
                errorMessage = validateProductFields(p, "loanProducts");
                if (errorMessage) { isValid = false; break; }
            }
        }

        if (isValid) {
            const allDepositIds = productsToSave.depositProducts.map(p => p.id.trim());
            const allLoanIds = productsToSave.loanProducts.map(p => p.id.trim());
            if (new Set(allDepositIds).size !== allDepositIds.length) {
                errorMessage = "예금 상품 ID가 중복되었습니다. 모든 예금 상품 ID는 고유해야 합니다.";
                isValid = false;
            }
            if (isValid && new Set(allLoanIds).size !== allLoanIds.length) {
                errorMessage = "대출 상품 ID가 중복되었습니다. 모든 대출 상품 ID는 고유해야 합니다.";
                isValid = false;
            }
        }

        if (!isValid) {
            setAlertInfo({ open: true, message: `입력 오류: ${errorMessage}`, type: "error" });
            return;
        }

        if (!window.confirm(`'${classId}' 학급의 은행 상품 설정을 Firestore에 저장하시겠습니까?`)) return;

        setIsLoading(true);
        try {
            const configDocRef = doc(db, "classes", classId, "config", "classSettings");
            await setDoc(configDocRef,
                { bankProductSettings: productsToSave },
                { merge: true }
            );
            setAlertInfo({ open: true, message: "✅ 학급 은행 상품 설정이 저장되었습니다.", type: "success" });
            setBankProducts({
                depositProducts: productsToSave.depositProducts,
                loanProducts: productsToSave.loanProducts,
            });
        } catch (e) {
            console.error("학급 상품 설정 저장 오류: ", e);
            setAlertInfo({ open: true, message: `학급 상품 설정 저장 실패: ${e.message}`, type: "error" });
        }
        finally { setIsLoading(false); }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="🏦 은행 상품 목록 관리">
            {alertInfo.open && <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))} className="mb-4" />}
            {isLoading ? (
                <div className="flex justify-center items-center py-10"><Spinner size="lg" /><p className="ml-2">상품 설정 로딩 중...</p></div>
            ) : (
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    {/* 예금 상품 섹션 */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-green-700">💰 예금 상품</h3>
                            <Button onClick={() => handleAddProduct('depositProducts')} size="sm" color="green" icon={PlusCircleIcon}>새 예금 상품</Button>
                        </div>
                        {bankProducts.depositProducts.length > 0 ?
                            bankProducts.depositProducts.map((product, index) => (
                                <ProductForm key={product.tempId || product.id} product={product} onChange={(p) => handleProductChange('depositProducts', index, p)} onRemove={() => handleRemoveProduct('depositProducts', index)} type="depositProducts" />
                            )) : <p className="text-sm text-slate-500 pl-1 py-2">등록된 예금 상품이 없습니다.</p>
                        }
                    </div>
                    {/* 대출 상품 섹션 */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-blue-700">💳 대출 상품</h3>
                            <Button onClick={() => handleAddProduct('loanProducts')} size="sm" color="blue" icon={PlusCircleIcon}>새 대출 상품</Button>
                        </div>
                        {bankProducts.loanProducts.length > 0 ?
                            bankProducts.loanProducts.map((product, index) => (
                                <ProductForm key={product.tempId || product.id} product={product} onChange={(p) => handleProductChange('loanProducts', index, p)} onRemove={() => handleRemoveProduct('loanProducts', index)} type="loanProducts" />
                            )) : <p className="text-sm text-slate-500 pl-1 py-2">등록된 대출 상품이 없습니다.</p>
                        }
                    </div>
                    <div className="mt-8 border-t pt-6 text-center sticky bottom-0 bg-white py-4 shadow-inner">
                        <Button onClick={saveBankSettings} color="indigo" size="lg" icon={ArrowDownTrayIcon} className="font-bold shadow-md hover:shadow-lg transition-shadow">상품 목록 저장</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}