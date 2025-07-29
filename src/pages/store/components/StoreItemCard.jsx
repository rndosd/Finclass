// src/pages/store/components/StoreItemCard.jsx
import React from 'react';
import { Button, Badge } from '../../../components/ui';
import { ShoppingCart } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import { PERMISSIONS } from '../../../constants/permissions';

const StoreItemCard = ({ item, currencyUnit, onBuyItem, onEditItem, onDeleteItem }) => {
    const { hasPermission } = useUser();
    const isStoreAdmin = hasPermission(PERMISSIONS.STORE_ADMIN);

    const isSoldOut = item.stock === 0 && item.stock !== null && item.stock !== -1;
    const canPurchase = item.isActive && !isSoldOut;

    if (!item) return null;

    return (
        <div
            className={`
                bg-white rounded-xl shadow-lg overflow-hidden flex flex-col group
                border transition-all duration-300 ease-in-out
                ${!item.isActive ? 'border-slate-300 opacity-60' : (isSoldOut ? 'border-red-200' : 'border-slate-200 hover:border-indigo-300 hover:shadow-2xl')}
            `}
        >
            {/* 이미지 */}
            <div className="w-full h-48 bg-slate-200 relative">
                {item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
                        <ShoppingCart size={56} strokeWidth={1} />
                    </div>
                )}
                {!item.isActive && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Badge color="gray" size="lg">판매 중지</Badge>
                    </div>
                )}
                {isSoldOut && item.isActive && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <Badge color="red" size="lg">품절</Badge>
                    </div>
                )}
            </div>

            {/* 정보 */}
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-md font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors" title={item.name}>
                    {item.name}
                </h3>
                {item.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2 flex-grow min-h-[2.5rem]">{item.description}</p>}
                {!item.description && <div className="flex-grow min-h-[2.5rem]"></div>}

                <div className="flex items-center justify-between mt-2">
                    <p className="text-xl font-extrabold text-indigo-700">
                        {(item.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-sm font-medium ml-0.5">{currencyUnit}</span>
                    </p>
                    {item.stock !== null && item.stock !== -1 && !isSoldOut && (
                        <Badge color={item.stock > 10 ? 'green' : 'yellow'} size="sm" className="ml-auto">
                            재고: {item.stock}개
                        </Badge>
                    )}
                </div>
            </div>

            {/* 학생 구매 버튼 */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                <Button
                    onClick={() => onBuyItem(item)}
                    color="indigo"
                    className="w-full transition-transform duration-150 group-hover:scale-105"
                    icon={ShoppingCart}
                    disabled={!canPurchase}
                    size="sm"
                >
                    {isSoldOut ? "품절" : (canPurchase ? "구매하기" : "구매 불가")}
                </Button>
            </div>

            {/* ⭐ 관리자 수정/삭제 버튼 */}
            {isStoreAdmin && (
                <div className="flex gap-2 p-3 border-t border-slate-100 bg-slate-50">
                    <Button
                        onClick={() => onEditItem(item)}
                        variant="outline"
                        size="sm"
                        color="sky"
                        className="flex-1"
                    >
                        수정
                    </Button>
                    <Button
                        onClick={() => {
                            if (window.confirm(`${item.name}을(를) 정말 삭제하시겠습니까?`)) {
                                onDeleteItem(item);
                            }
                        }}
                        variant="outline"
                        size="sm"
                        color="red"
                        className="flex-1"
                    >
                        삭제
                    </Button>
                </div>
            )}
        </div>
    );
};

export default StoreItemCard;
