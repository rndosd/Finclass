import React, { useState } from 'react';

const GridSizeConfigurator = ({
    currentRows,
    currentCols,
    onSizeChange,
    isExpanded = false,
    onToggle
}) => {
    const [tempRows, setTempRows] = useState(currentRows);
    const [tempCols, setTempCols] = useState(currentCols);

    // 제한값
    const MIN_ROWS = 3;
    const MAX_ROWS = 15;
    const MIN_COLS = 3;
    const MAX_COLS = 20;

    const handleApply = () => {
        if (tempRows !== currentRows || tempCols !== currentCols) {
            const confirmMessage = `교실 크기를 ${tempCols}×${tempRows}로 변경하시겠습니까?\n기존 배치가 초기화될 수 있습니다.`;
            if (window.confirm(confirmMessage)) {
                onSizeChange(tempRows, tempCols);
                onToggle(); // 설정 패널 닫기
            }
        } else {
            onToggle(); // 변경사항 없으면 그냥 닫기
        }
    };

    const handleReset = () => {
        setTempRows(7);
        setTempCols(11);
    };

    const adjustValue = (current, delta, min, max) => {
        return Math.max(min, Math.min(max, current + delta));
    };

    if (!isExpanded) {
        return (
            <button
                onClick={onToggle}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm"
            >
                <span>📐</span>
                <span>교실 크기: {currentCols}×{currentRows}</span>
                <span className="text-xs">({currentCols * currentRows}칸)</span>
            </button>
        );
    }

    return (
        <div className="bg-white border border-purple-200 rounded-lg shadow-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-purple-800">
                    📐 교실 크기 설정
                </h3>
                <button
                    onClick={onToggle}
                    className="text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* 가로 (열) 설정 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        가로 (열 수)
                    </label>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setTempCols(adjustValue(tempCols, -1, MIN_COLS, MAX_COLS))}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                            disabled={tempCols <= MIN_COLS}
                        >
                            −
                        </button>
                        <div className="w-16 text-center py-2 border border-gray-300 rounded">
                            {tempCols}
                        </div>
                        <button
                            onClick={() => setTempCols(adjustValue(tempCols, 1, MIN_COLS, MAX_COLS))}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                            disabled={tempCols >= MAX_COLS}
                        >
                            +
                        </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {MIN_COLS}~{MAX_COLS} 범위
                    </div>
                </div>

                {/* 세로 (행) 설정 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        세로 (행 수)
                    </label>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setTempRows(adjustValue(tempRows, -1, MIN_ROWS, MAX_ROWS))}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                            disabled={tempRows <= MIN_ROWS}
                        >
                            −
                        </button>
                        <div className="w-16 text-center py-2 border border-gray-300 rounded">
                            {tempRows}
                        </div>
                        <button
                            onClick={() => setTempRows(adjustValue(tempRows, 1, MIN_ROWS, MAX_ROWS))}
                            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                            disabled={tempRows >= MAX_ROWS}
                        >
                            +
                        </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {MIN_ROWS}~{MAX_ROWS} 범위
                    </div>
                </div>
            </div>

            {/* 미리보기 */}
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <div className="text-center">
                    <div className="text-lg font-bold text-purple-800">
                        {tempCols} × {tempRows} = {tempCols * tempRows}칸
                    </div>
                    <div className="text-sm text-purple-600 mt-1">
                        {tempCols * tempRows < 50 ? '🏠 작은 교실' :
                            tempCols * tempRows < 100 ? '🏫 표준 교실' : '🏢 큰 교실'}
                    </div>
                </div>
            </div>

            {/* 버튼들 */}
            <div className="flex space-x-3 mt-4">
                <button
                    onClick={handleApply}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
                >
                    ✅ 적용하기
                </button>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                    🔄 기본값 (11×7)
                </button>
            </div>

            {/* 주의사항 */}
            <div className="mt-3 text-xs text-gray-500">
                💡 크기 변경시 기존 배치가 초기화될 수 있습니다
            </div>
        </div>
    );
};

export default GridSizeConfigurator;