// src/pages/store/modals/BuyItemModal.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Button, InputField, Alert, Spinner } from '../../../components/ui';
import { ShoppingCart, Minus, Plus } from 'lucide-react';

const BuyItemModal = ({
    isOpen,
    onClose,
    itemToBuy,
    currencyUnit,
    studentClassCurrencyBalance,
    onSubmitPurchase,
    isSubmitting
}) => {
    const [quantity, setQuantity] = useState(1);
    const [errorMessage, setErrorMessage] = useState('');

    // 모달이 열릴 때마다 수량과 에러 메시지를 초기화합니다.
    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            setErrorMessage('');
        }
    }, [isOpen]);

    // 필요한 값들을 itemToBuy에서 안전하게 추출합니다.
    const itemPrice = Number(itemToBuy?.price) || 0;
    const currentStock = itemToBuy?.stock; // null 또는 -1은 무제한 재고를 의미합니다.

    // 총 결제 금액을 계산합니다.
    const totalCost = useMemo(() => itemPrice * quantity, [itemPrice, quantity]);

    // 구매 가능 여부를 판단하는 변수들입니다 (UI 피드백용).
    const canAfford = typeof studentClassCurrencyBalance === 'number' && studentClassCurrencyBalance >= totalCost;
    const hasEnoughStock = currentStock === null || currentStock === -1 || (typeof currentStock === 'number' && currentStock >= quantity);
    const canPurchase = itemToBuy?.isActive && canAfford && hasEnoughStock && quantity > 0;

    // 수량 입력 필드 변경 핸들러
    const handleQuantityChange = (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) {
            val = 1;
        }
        // 재고가 유한할 경우, 최대 재고를 넘지 못하게 함
        if (currentStock !== null && currentStock !== -1 && val > currentStock) {
            val = currentStock;
        }
        setQuantity(val);
        setErrorMessage(''); // 수량 변경 시 에러 메시지 초기화
    };

    // 수량 증가/감소 버튼 핸들러
    const incrementQuantity = () => {
        const newQuantity = quantity + 1;
        if (currentStock === -1 || newQuantity <= currentStock) {
            setQuantity(newQuantity);
            setErrorMessage('');
        }
    };
    const decrementQuantity = () => {
        setQuantity(prev => Math.max(1, prev - 1));
        setErrorMessage('');
    };

    // 최종 "구매 확정" 버튼 클릭 핸들러
    const handleSubmit = async (e) => {
        e.preventDefault(); // form의 기본 제출 동작(새로고침) 방지

        // 최종 유효성 검사
        if (!canPurchase) {
            if (!canAfford) setErrorMessage("보유한 현금이 부족합니다.");
            else if (!hasEnoughStock) setErrorMessage("상품의 재고가 부족합니다.");
            else setErrorMessage("현재 구매할 수 없는 상품입니다.");
            return;
        }
        setErrorMessage('');

        // 부모 컴포넌트(Store.jsx)로부터 받은 구매 실행 함수를 호출합니다.
        // itemToBuy와 quantity를 인자로 전달합니다.
        await onSubmitPurchase(itemToBuy, quantity);
    };

    // 모달이 열려있지 않거나 대상 아이템이 없으면 아무것도 렌더링하지 않음
    if (!isOpen || !itemToBuy) return null;

    return (
        <Modal isOpen={isOpen} title={`"${itemToBuy.name}" 구매하기`} onClose={onClose} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {itemToBuy.imageUrl && (
                    <div className="w-full h-40 bg-slate-100 rounded-md flex items-center justify-center p-2">
                        <img src={itemToBuy.imageUrl} alt={itemToBuy.name} className="max-w-full max-h-full object-contain" />
                    </div>
                )}

                <div className="text-sm text-slate-700">
                    <p><strong className="font-semibold">상품명:</strong> {itemToBuy.name}</p>
                    <p><strong className="font-semibold">개당 가격:</strong> {itemPrice.toLocaleString()} {currencyUnit}</p>
                </div>

                {/* 재고가 0인 경우를 제외하고 수량 선택 UI 표시 */}
                {(currentStock === -1 || currentStock > 0) && (
                    <div>
                        <label htmlFor="buyItemQuantity" className="block text-sm font-medium text-slate-700 mb-1">
                            구매 수량 {currentStock !== -1 ? `(최대: ${currentStock}개)` : '(재고 무제한)'}
                        </label>
                        <div className="flex items-center gap-2">
                            <Button type="button" onClick={decrementQuantity} variant="outline" size="sm" icon={Minus} disabled={quantity <= 1 || isSubmitting} />
                            <InputField
                                id="buyItemQuantity" type="number" value={quantity.toString()}
                                onChange={handleQuantityChange}
                                min="1" max={currentStock !== -1 ? currentStock.toString() : undefined}
                                className="text-center w-20" disabled={isSubmitting}
                            />
                            <Button type="button" onClick={incrementQuantity} variant="outline" size="sm" icon={Plus} disabled={(currentStock !== -1 && quantity >= currentStock) || isSubmitting} />
                        </div>
                    </div>
                )}

                {/* 품절 메시지 */}
                {currentStock === 0 && (
                    <Alert type="warning" message="이 상품은 현재 품절되었습니다." />
                )}

                {/* 결제 정보 요약 */}
                <div className="p-3 bg-indigo-50 rounded-md text-sm space-y-1 border border-indigo-200">
                    <div className={`flex justify-between text-xs ${canAfford ? 'text-slate-500' : 'text-red-500 font-semibold'}`}>
                        <span>보유 현금:</span>
                        <span>{studentClassCurrencyBalance.toLocaleString()} {currencyUnit}</span>
                    </div>
                    <div className="flex justify-between text-base">
                        <strong>총 결제 금액:</strong>
                        <strong className="text-indigo-700">{totalCost.toLocaleString()} {currencyUnit}</strong>
                    </div>
                </div>

                {errorMessage && <Alert type="error" message={errorMessage} className="mt-2" />}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 mt-5">
                    <Button type="button" onClick={onClose} variant="secondary" disabled={isSubmitting}>취소</Button>
                    <Button type="submit" icon={ShoppingCart} disabled={isSubmitting || !canPurchase}>
                        {isSubmitting ? '구매 중...' : '구매 확정'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default BuyItemModal;