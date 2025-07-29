// src/components/ui/TabButton.jsx
import React from 'react';

const TabButton = ({ children, onClick, isActive, icon: Icon, className = '' }) => ( // icon 및 className prop 추가
    <button
        onClick={onClick}
        className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 ${isActive
                ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' // 활성 탭 스타일
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-700' // 비활성 탭 스타일
            } ${className}`} // 외부에서 추가적인 스타일링 가능하도록
    >
        {Icon && <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />} {/* 아이콘 스타일 조정 */}
        {children}
    </button>
);

export default TabButton;