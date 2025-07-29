// src/components/ui/SelectField.jsx
import React from 'react';

export default function SelectField({
  id,
  label,
  value,
  onChange,
  disabled,
  children, // <option> 태그들이 이 children으로 전달됩니다.
  className = ''
}) {
  return (
    <div>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full p-2.5 border border-gray-300 rounded-lg shadow-sm 
          focus:ring-2 focus:ring-indigo-500 focus:border-transparent 
          outline-none bg-white 
          disabled:bg-gray-100 
          ${className}
        `}
      >
        {children}
      </select>
    </div>
  );
}