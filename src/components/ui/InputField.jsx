// src/components/ui/InputField.jsx
import React from 'react';

export default function InputField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  min,
  step,
  required = false,
  className = '',
  readOnly = false,
  ...props // 나머지 HTML input 속성들을 받을 수 있도록 추가
}) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        step={step}
        required={required}
        readOnly={readOnly}
        className={`
          w-full p-2 border border-gray-300 rounded-lg shadow-sm 
          focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
          outline-none 
          ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''} 
          ${className}
        `}
        {...props} // 여기에 나머지 props 전달
      />
    </div>
  );
}