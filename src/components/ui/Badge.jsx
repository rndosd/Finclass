import React from 'react';

const Badge = ({ children, color = 'gray', size = 'md', className = '' }) => {
    // ⭐ 1. 색상에 따른 Tailwind CSS 클래스를 미리 정의합니다.
    const colorVariants = {
        gray: 'bg-slate-100 text-slate-600',
        green: 'bg-green-100 text-green-700',
        red: 'bg-red-100 text-red-700',
        blue: 'bg-blue-100 text-blue-700',
        indigo: 'bg-indigo-100 text-indigo-700',
        purple: 'bg-purple-100 text-purple-700',
        pink: 'bg-pink-100 text-pink-700',
        orange: 'bg-orange-100 text-orange-700',
        sky: 'bg-sky-100 text-sky-700',
        rose: 'bg-rose-100 text-rose-700',

        // ✅ 누락된 색상 추가
        yellow: 'bg-yellow-100 text-yellow-700',
        fuchsia: 'bg-fuchsia-100 text-fuchsia-700',
        cyan: 'bg-cyan-100 text-cyan-700', // 혹시 다시 쓸 일 있을까봐 같이 넣자
    };

    const sizeVariants = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm',
    };

    // ⭐ 2. prop으로 받은 color 값에 해당하는 클래스를 사용합니다.
    const badgeClasses = `
        inline-flex items-center font-semibold rounded-full
        ${colorVariants[color] || colorVariants.gray}
        ${sizeVariants[size] || sizeVariants.md}
        ${className}
    `;

    return (
        <span className={badgeClasses}>
            {children}
        </span>
    );
};

export default Badge;