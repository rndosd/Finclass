// src/components/ui/Button.jsx

import React, { forwardRef } from 'react';
import Spinner from './Spinner';

const Button = forwardRef(({
    children,
    type = 'button',
    variant = 'primary',
    color = 'indigo',
    size = 'md',
    className = '',
    icon: Icon,
    isLoading = false,
    disabled = false,
    ...props
}, ref) => {

    const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

    const sizeStyles = {
        xs: 'px-2.5 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
        'icon-xs': 'p-1',
    };

    const colorStyles = {
        primary: {
            indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
            red: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
            blue: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
            green: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
        },
        secondary: {
            gray: 'bg-slate-200 hover:bg-slate-300 text-slate-700 focus:ring-indigo-500 border border-slate-300',
        },
        outline: {
            red: 'border border-red-600 text-red-600 hover:bg-red-50',
            indigo: 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50',
        }
    };

    const selectedColorStyle = colorStyles[variant]?.[color] || colorStyles.primary.indigo;
    const finalClassName = `${baseStyle} ${sizeStyles[size]} ${selectedColorStyle} ${className}`;
    const iconSizeClass = size === 'xs' || size === 'icon-xs' ? 'h-3.5 w-3.5' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

    return (
        <button
            ref={ref}
            type={type}
            className={finalClassName}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Spinner size="xs" className={children ? "mr-2" : ""} />}
            {Icon && !isLoading && <Icon className={`${iconSizeClass} ${children ? 'mr-1.5' : ''}`} />}
            {children}
        </button>
    );
});

export default Button;
