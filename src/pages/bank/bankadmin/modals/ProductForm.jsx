// src/pages/bank/bankadmin/modals/ProductForm.jsx
import React from 'react';
import { InputField, Button } from '../../../../components/ui';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function ProductForm({ product, onChange, onRemove, type }) {
    // 디버깅용 로그
    console.log('ProductForm render:', { product, type });

    const handleInputChange = (field, value) => {
        console.log('handleInputChange:', { field, value, product });
        const updatedProduct = { ...product, [field]: value };
        console.log('Calling onChange with:', updatedProduct);
        onChange(updatedProduct);
    };

    const handleWeeksInputChange = (value) => {
        console.log('handleWeeksInputChange:', { value });

        // 빈 값 처리
        if (value === '') {
            onChange({ ...product, days: '' });
            return;
        }

        const numWeeks = parseInt(value, 10);
        if (!isNaN(numWeeks) && numWeeks >= 0) {
            onChange({
                ...product,
                days: numWeeks * 7
            });
        }
    };

    const handleNumericInputChange = (field, value) => {
        console.log('handleNumericInputChange:', { field, value });

        // 빈 값이면 빈 문자열로 저장 (undefined 대신)
        if (value === '') {
            onChange({ ...product, [field]: '' });
            return;
        }

        const numValue = Number(value);
        if (!isNaN(numValue)) {
            onChange({ ...product, [field]: numValue });
        }
    };

    // 주 단위 표시 계산 개선
    const getDisplayWeeks = () => {
        if (product.days === '' || product.days === null || product.days === undefined) {
            return '';
        }
        const days = Number(product.days);
        if (isNaN(days)) return '';
        return days / 7;
    };

    // 안전한 value 처리 함수들
    const getInputValue = (fieldName, defaultValue = '') => {
        const value = product[fieldName];
        if (value === null || value === undefined) return defaultValue;
        return value;
    };

    const getNumericInputValue = (fieldName) => {
        const value = product[fieldName];
        if (value === null || value === undefined || value === '') return '';
        return value;
    };

    return (
        <div className="border p-3 my-2 rounded bg-slate-50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
            {/* 상품 ID */}
            <InputField
                id={`pm-id-${product.tempId || product.id}`}
                label="상품 ID"
                type="text"
                placeholder="자동 생성"
                value={getInputValue('id')}
                readOnly
                className="bg-gray-100 text-gray-500 text-xs"
            />

            {/* 상품명 */}
            <InputField
                id={`pm-label-${product.tempId || product.id}`}
                label="상품명 *"
                type="text"
                placeholder={type === "depositProducts" ? "예: 2주 만기 예금" : "예: 단기 응원 대출"}
                value={getInputValue('label')}
                onChange={(e) => handleInputChange('label', e.target.value)}
                className="text-xs"
            />

            {/* 기간 (주) */}
            <InputField
                id={`pm-weeks-${product.tempId || product.id}`}
                label="기간 (주)"
                type="number"
                min="1"
                placeholder="예: 2 (2주)"
                value={getDisplayWeeks()}
                onChange={(e) => handleWeeksInputChange(e.target.value)}
                className="text-xs"
            />

            {/* 금리 */}
            <InputField
                id={`pm-rate-${product.tempId || product.id}`}
                label="해당 기간 금리(%)"
                type="number"
                step="0.01"
                min="0"
                placeholder="예: 1.5"
                value={getNumericInputValue(type === "depositProducts" ? 'rate' : 'periodRate')}
                onChange={(e) =>
                    handleNumericInputChange(
                        type === "depositProducts" ? 'rate' : 'periodRate',
                        e.target.value
                    )
                }
                className="text-xs"
            />

            {/* 예금 상품 전용 필드 */}
            {type === "depositProducts" && (
                <InputField
                    id={`pm-max-deposit-amount-${product.tempId || product.id}`}
                    label="최대 예치 한도액"
                    type="number"
                    min="0"
                    placeholder="비워두면 한도 없음"
                    value={getNumericInputValue('maxDepositAmount')}
                    onChange={(e) => handleNumericInputChange('maxDepositAmount', e.target.value)}
                    className="text-xs"
                />
            )}

            {/* 대출 상품 전용 필드들 */}
            {type === "loanProducts" && (
                <>
                    <InputField
                        id={`pm-max-loan-limit-${product.tempId || product.id}`}
                        label="상품 최대 한도액"
                        type="number"
                        min="0"
                        placeholder="비워두면 한도 없음"
                        value={getNumericInputValue('maxLoanProductLimit')}
                        onChange={(e) => handleNumericInputChange('maxLoanProductLimit', e.target.value)}
                        className="text-xs"
                    />
                    <InputField
                        id={`pm-min-credit-score-${product.tempId || product.id}`}
                        label="최소 신용점수 조건"
                        type="number"
                        min="0"
                        placeholder="비워두면 조건 없음"
                        value={getNumericInputValue('minCreditScore')}
                        onChange={(e) => handleNumericInputChange('minCreditScore', e.target.value)}
                        className="text-xs"
                    />
                </>
            )}

            {/* 활성/비활성 및 삭제 버튼 */}
            <div className={`flex items-center space-x-3 pt-5 ${type === "depositProducts" ? 'md:col-start-3' : ''}`}>
                <label className="flex items-center text-xs text-gray-700 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={product.active === undefined ? true : Boolean(product.active)}
                        onChange={(e) => handleInputChange('active', e.target.checked)}
                        className="mr-1.5 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    /> 활성
                </label>
                {onRemove && (
                    <Button
                        onClick={onRemove}
                        variant="tertiary"
                        color="red"
                        size="xs"
                        icon={TrashIcon}
                        className="p-1"
                    >
                        삭제
                    </Button>
                )}
            </div>
        </div>
    );
}