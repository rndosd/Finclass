// src/pages/store/components/StoreItemList.jsx
import React from 'react';
import StoreItemCard from './StoreItemCard';
import { Spinner } from '../../../components/ui';

const StoreItemList = ({
    items,
    currencyUnit,
    onBuyItem,
    isLoadingItems,
    categoryName,
    onEditItem, // ⭐ 추가 (관리자용)
    onDeleteItem, // ⭐ 추가 (관리자용)
    isTeacher, // ⭐ 추가 (관리자 여부)
}) => {
    if (isLoadingItems) {
        return (
            <div className="text-center py-10">
                <Spinner size="lg" />
                <p className="mt-2 text-sm text-slate-500">{categoryName ? `"${categoryName}" 상품 로딩 중...` : "상품 로딩 중..."}</p>
            </div>
        );
    }

    if (!items || items.length === 0) {
        return <p className="text-center py-10 text-slate-500">{categoryName ? `"${categoryName}" 카테고리에 상품이 없습니다.` : "표시할 상품이 없습니다."}</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 md:gap-6">
            {items.map(item => (
                <StoreItemCard
                    key={item.id}
                    item={item}
                    currencyUnit={currencyUnit}
                    onBuyItem={onBuyItem}
                    onEditItem={onEditItem} // ⭐ 추가
                    onDeleteItem={onDeleteItem} // ⭐ 추가
                    isTeacher={isTeacher} // ⭐ 추가
                />
            ))}
        </div>
    );
};

export default StoreItemList;
