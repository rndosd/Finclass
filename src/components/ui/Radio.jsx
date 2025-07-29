import React from 'react';

const Radio = ({
    value,
    checked,
    onChange,
    children,
    description,
    className = '',
}) => {
    return (
        <label className={`flex flex-col items-start cursor-pointer ${className}`}>
            <div className="flex items-center space-x-2">
                <input
                    type="radio"
                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    value={value}
                    checked={checked}
                    onChange={onChange}
                />
                <span className="text-sm font-medium text-slate-800">{children}</span>
            </div>
            {description && (
                <p className="text-xs text-slate-500 pl-6">{description}</p>
            )}
        </label>
    );
};

export default Radio;
