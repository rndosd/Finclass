// src/components/ui/CustomXAxisTick.jsx
import React from 'react';

const CustomXAxisTick = ({ x, y, payload }) => {
    if (payload && typeof payload.value === 'number') { // payload.value가 숫자(타임스탬프)인지 확인
        const date = new Date(payload.value);
        // 날짜 유효성 검사 추가
        if (isNaN(date.getTime())) {
            // console.warn("Invalid date for XAxisTick:", payload.value);
            return null; // 유효하지 않은 날짜면 렌더링 안 함
        }
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return (
            <g transform={`translate(<span class="math-inline">\{x\},</span>{y})`}>
                <text x={0} y={0} dy={12} textAnchor="middle" fill="#6B7280" fontSize="10px" fontWeight="500"> {/* dy, fontSize, fontWeight 등 스타일 조정 */}
                    {/* 날짜 포맷을 한 줄 또는 두 줄로 표시할지 선택 */}
                    <tspan x="0" dy="0em">{`<span class="math-inline">\{month\}/</span>{day}`}</tspan>
                    <tspan x="0" dy="1.1em">{`'${year}`}</tspan>
                </text>
            </g>
        );
    }
    return null;
};

export default CustomXAxisTick;