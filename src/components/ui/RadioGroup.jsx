import React from 'react';

const RadioGroup = ({ label, value, onChange, children, className }) => {
    // ⭐ 시작: children을 안전하게 배열로 변환
    const options = React.Children.toArray(children);
    // ⭐ 끝: 수정된 부분

    return (
        <div>
            {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
            <div className={`flex flex-wrap gap-x-4 gap-y-2 ${className}`}>
                {/* ⭐ 배열로 변환된 options를 사용 */}
                {options.map((radio) => {
                    return React.cloneElement(radio, {
                        key: radio.props.value,
                        checked: value === radio.props.value,
                        onChange: () => onChange(radio.props.value),
                    });
                })}
            </div>
        </div>
    );
};

export const Radio = ({ checked, onChange, children, value }) => {
    return (
        <label className="flex items-center space-x-2 cursor-pointer">
            <input
                type="radio"
                className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                value={value}
                checked={checked}
                onChange={onChange}
            />
            <span className="text-sm text-slate-800">{children}</span>
        </label>
    );
};

export default RadioGroup;