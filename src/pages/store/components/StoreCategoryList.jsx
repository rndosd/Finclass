// src/pages/store/components/StoreCategoryList.jsx
import React from 'react';
import { Button } from '../../../components/ui'; // 경로 확인

const StoreCategoryList = ({ categories, selectedCategoryId, onSelectCategory, isLoading }) => {
    if (isLoading) {
        return (
            <div className="mb-4 p-3 bg-white rounded-lg shadow animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="flex space-x-2">
                    <div className="h-8 bg-slate-200 rounded w-20"></div>
                    <div className="h-8 bg-slate-200 rounded w-20"></div>
                    <div className="h-8 bg-slate-200 rounded w-20"></div>
                </div>
            </div>
        );
    }

    if (categories.length === 0) {
        return <p className="mb-4 text-sm text-slate-500">표시할 상점 카테고리가 없습니다.</p>;
    }

    return (
        <div className="mb-6 p-3 sm:p-4 bg-white rounded-xl shadow-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3 tracking-wider">카테고리</h3>
            <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                    <Button
                        key={category.id}
                        variant={selectedCategoryId === category.id ? 'primary' : 'secondary'}
                        color={selectedCategoryId === category.id ? 'indigo' : 'slate'}
                        onClick={() => onSelectCategory(category.id)}
                        size="sm"
                        disabled={!category.isActive} // 비활성 카테고리 비활성화
                        title={!category.isActive ? "현재 비활성화된 카테고리입니다." : category.description}
                    >
                        {category.name}
                        {!category.isActive && <span className="ml-1.5 text-xs">(비활성)</span>}
                    </Button>
                ))}
            </div>
        </div>
    );
};

export default StoreCategoryList;