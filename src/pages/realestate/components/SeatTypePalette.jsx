import React from 'react';

const SeatTypePalette = ({ selectedTool, onToolChange }) => {
    // 도구 목록 정의
    const tools = [
        {
            id: 'normal',
            icon: '🪑',
            label: '좌석',
            description: '교실 자리',
            color: 'blue'
        },
        {
            id: 'delete',
            icon: '🗑️',
            label: '지우기',
            description: '좌석 제거',
            color: 'red'
        }
    ];

    // 도구별 스타일 생성
    const getToolStyle = (tool) => {
        const isSelected = selectedTool === tool.id;
        const baseStyle = 'flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md';

        if (isSelected) {
            // 선택된 도구 스타일
            switch (tool.color) {
                case 'blue':
                    return `${baseStyle} bg-blue-100 border-blue-400 text-blue-800`;
                case 'yellow':
                    return `${baseStyle} bg-yellow-100 border-yellow-400 text-yellow-800`;
                case 'red':
                    return `${baseStyle} bg-red-100 border-red-400 text-red-800`;
                case 'gray':
                    return `${baseStyle} bg-gray-100 border-gray-400 text-gray-800`;
                default:
                    return `${baseStyle} bg-gray-100 border-gray-400 text-gray-800`;
            }
        } else {
            // 선택되지 않은 도구 스타일
            return `${baseStyle} bg-white border-gray-300 text-gray-600 hover:border-gray-400`;
        }
    };

    // 키보드 단축키 처리
    const getShortcutKey = (toolId) => {
        const shortcuts = {
            normal: '1',
            delete: 'X'
        };
        return shortcuts[toolId];
    };

    // 키보드 이벤트 처리 (나중에 상위 컴포넌트에서 구현)
    React.useEffect(() => {
        const handleKeyPress = (e) => {
            const key = e.key.toUpperCase();
            const toolMap = {
                '1': 'normal',
                'X': 'delete'
            };

            if (toolMap[key]) {
                onToolChange(toolMap[key]);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onToolChange]);

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                    🛠️ 배치 도구
                </h3>
                <div className="text-sm text-gray-500">
                    선택된 도구: <span className="font-medium">{tools.find(t => t.id === selectedTool)?.label}</span>
                </div>
            </div>

            {/* 도구 버튼들 */}
            <div className="grid grid-cols-2 gap-3">
                {tools.map((tool) => (
                    <button
                        key={tool.id}
                        className={getToolStyle(tool)}
                        onClick={() => onToolChange(tool.id)}
                        title={`${tool.label} - ${tool.description} (단축키: ${getShortcutKey(tool.id)})`}
                    >
                        {/* 아이콘 */}
                        <div className="text-2xl mb-2">
                            {tool.icon}
                        </div>

                        {/* 라벨 */}
                        <div className="text-sm font-medium text-center">
                            {tool.label}
                        </div>

                        {/* 단축키 표시 */}
                        <div className="text-xs mt-1 opacity-70">
                            {getShortcutKey(tool.id)}
                        </div>
                    </button>
                ))}
            </div>

            {/* 사용법 안내 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-2">
                    <div className="text-lg">💡</div>
                    <div className="text-sm text-gray-600">
                        <div className="font-medium mb-1">사용법:</div>
                        <ul className="space-y-1">
                            <li>• 원하는 도구를 선택한 후 그리드를 클릭하세요</li>
                            <li>• 키보드 단축키로 빠른 선택이 가능합니다</li>
                            <li>• 같은 자리를 다시 클릭하면 제거됩니다</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* 현재 선택된 도구 미리보기 */}
            {selectedTool && (
                <div className="mt-3 flex items-center justify-center p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <span className="text-lg">
                            {tools.find(t => t.id === selectedTool)?.icon}
                        </span>
                        <span className="text-sm font-medium text-blue-800">
                            {tools.find(t => t.id === selectedTool)?.label} 선택됨
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeatTypePalette;