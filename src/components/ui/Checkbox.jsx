import React, { useRef, useEffect } from 'react';

export default function Checkbox({
    label,
    id,
    name,
    checked,
    onChange,
    disabled = false,
    className = '',
    labelClassName = '',
    indeterminate = false // ✅ 추가
}) {
    const checkboxRef = useRef(null);

    useEffect(() => {
        if (checkboxRef.current) {
            checkboxRef.current.indeterminate = indeterminate;
        }
    }, [indeterminate]);

    return (
        <div className={`flex items-center ${className}`}>
            <input
                ref={checkboxRef}
                id={id || name}
                name={name}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {label && (
                <label
                    htmlFor={id || name}
                    className={`ml-2 block text-sm ${disabled ? 'text-gray-400' : 'text-gray-900'} ${labelClassName}`}
                >
                    {label}
                </label>
            )}
        </div>
    );
}
