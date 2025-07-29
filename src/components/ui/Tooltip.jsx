// src/components/ui/Tooltip.jsx
import React, { useState } from 'react';

export default function Tooltip({ content, children, position = 'top', className = '' }) {
    const [visible, setVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'absolute left-1/2 -translate-x-1/2 top-full border-x-transparent border-x-4 border-t-black border-t-4',
        bottom: 'absolute left-1/2 -translate-x-1/2 bottom-full border-x-transparent border-x-4 border-b-black border-b-4',
        left: 'absolute top-1/2 -translate-y-1/2 left-full border-y-transparent border-y-4 border-l-black border-l-4',
        right: 'absolute top-1/2 -translate-y-1/2 right-full border-y-transparent border-y-4 border-r-black border-r-4',
    }

    return (
        <div
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            onFocus={() => setVisible(true)} // 키보드 접근성
            onBlur={() => setVisible(false)}  // 키보드 접근성
            tabIndex={0} // 키보드 포커스 가능하도록
        >
            {children}
            {visible && content && (
                <div
                    role="tooltip"
                    className={`absolute z-50 px-3 py-1.5 text-xs font-medium text-white bg-black rounded-md shadow-sm whitespace-nowrap transition-opacity duration-150 ${positionClasses[position]}`}
                >
                    {content}
                    <div className={arrowClasses[position]}></div>
                </div>
            )}
        </div>
    );
}