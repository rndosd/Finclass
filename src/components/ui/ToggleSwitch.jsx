// src/components/ui/ToggleSwitch.jsx
import React from 'react';

export default function ToggleSwitch({ id, label, checked, onChange, disabled = false, className = '', srLabel = 'Toggle' }) {
    return (
        <div className={`flex items-center ${className}`}>
            <button
                type="button"
                id={id}
                onClick={() => !disabled && onChange(!checked)}
                disabled={disabled}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                    ${checked ? 'bg-indigo-600' : 'bg-gray-200'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
                role="switch"
                aria-checked={checked}
                aria-labelledby={label && id ? `${id}-label` : undefined}
            >
                <span className="sr-only">{srLabel}</span>
                <span
                    aria-hidden="true"
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
                      ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
                />
            </button>
            {label && (
                <span className={`ml-3 text-sm ${disabled ? 'text-gray-400' : 'text-gray-900'}`} id={id ? `${id}-label` : undefined}>
                    {label}
                </span>
            )}
        </div>
    );
}