// src/components/ui/Spinner.jsx
import React from 'react';

export default function Spinner({ size = 'md', color = 'text-indigo-600', className = '' }) {
    let sizeClasses = '';
    switch (size) {
        case 'sm':
            sizeClasses = 'h-6 w-6 border-2';
            break;
        case 'lg':
            sizeClasses = 'h-12 w-12 border-4';
            break;
        case 'md':
        default:
            sizeClasses = 'h-8 w-8 border-[3px]';
            break;
    }

    return (
        <div className="flex justify-center items-center">
            <div
                className={`animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${sizeClasses} ${color} ${className}`}
                role="status"
            >
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                </span>
            </div>
        </div>
    );
}