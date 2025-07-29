// src/components/ui/Alert.jsx
import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'; // 아이콘 크기를 위해 solid 사용 또는 outline 사용 후 크기 조절

export default function Alert({ type = 'info', message, onClose, className = '' }) {
    const baseStyle = "p-4 rounded-md flex items-start gap-3 shadow-md";
    let typeStyle = "";
    let IconComponent;

    switch (type) {
        case 'success':
            typeStyle = "bg-green-50 border border-green-300 text-green-700";
            IconComponent = CheckCircleIcon;
            break;
        case 'error':
            typeStyle = "bg-red-50 border border-red-300 text-red-700";
            IconComponent = XCircleIcon;
            break;
        case 'warning':
            typeStyle = "bg-yellow-50 border border-yellow-300 text-yellow-700";
            IconComponent = ExclamationTriangleIcon;
            break;
        case 'info':
        default:
            typeStyle = "bg-blue-50 border border-blue-300 text-blue-700";
            IconComponent = InformationCircleIcon;
            break;
    }

    return (
        <div className={`${baseStyle} ${typeStyle} ${className}`} role="alert">
            <div className="flex-shrink-0">
                <IconComponent className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="flex-1">
                <p className="text-sm">{message}</p>
            </div>
            {onClose && (
                <div className="flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`-mx-1.5 -my-1.5 p-1.5 rounded-md inline-flex focus:outline-none focus:ring-2 focus:ring-offset-2 
                        ${type === 'success' ? 'hover:bg-green-100 focus:ring-offset-green-50 focus:ring-green-600' : ''}
                        ${type === 'error' ? 'hover:bg-red-100 focus:ring-offset-red-50 focus:ring-red-600' : ''}
                        ${type === 'warning' ? 'hover:bg-yellow-100 focus:ring-offset-yellow-50 focus:ring-yellow-600' : ''}
                        ${type === 'info' ? 'hover:bg-blue-100 focus:ring-offset-blue-50 focus:ring-blue-600' : ''}
            `}
                        aria-label="Dismiss"
                    >
                        <span className="sr-only">Dismiss</span>
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
}