import React from 'react';

const GridCell = ({
    position,
    content = null,
    isEditMode = false,
    selectedTool = null,
    onCellClick = () => { },
    onCellHover = () => { }
}) => {
    const { row, col } = position;

    // 셀 클릭 핸들러
    const handleClick = () => {
        if (isEditMode) {
            // 편집 모드: 선택된 도구에 따라 처리
            onCellClick(position, selectedTool, content);
        } else {
            // 보기 모드: 좌석이 있을 때만 클릭 가능
            if (content) {
                onCellClick(content);
            }
        }
    };

    // 셀 스타일 결정
    const getCellStyle = () => {
        let baseStyle = 'w-12 h-12 border border-gray-300 flex items-center justify-center text-sm font-medium cursor-pointer transition-all';

        if (isEditMode) {
            // 편집 모드 스타일
            if (content) {
                // 좌석이 있는 경우
                switch (content.type) {
                    case 'normal':
                        return `${baseStyle} bg-blue-100 border-blue-300 hover:bg-blue-200`;
                    default:
                        return `${baseStyle} bg-gray-100 border-gray-300 hover:bg-gray-200`;
                }
            } else {
                // 빈 칸
                return `${baseStyle} bg-white hover:bg-gray-50 border-dashed`;
            }
        } else {
            // 보기 모드 스타일 (기존 PropertyCard와 유사)
            if (content) {
                if (content.owner) {
                    // 소유중인 자리
                    return `${baseStyle} bg-blue-50 border-blue-300 hover:bg-blue-100 hover:shadow-md`;
                } else {
                    // 매물 자리 - 모두 동일한 스타일
                    return `${baseStyle} bg-gray-50 border-gray-300 hover:bg-gray-100 hover:shadow-md`;
                }
            } else {
                // 빈 공간 (클릭 불가)
                return `${baseStyle} bg-gray-100 border-gray-200 cursor-default opacity-50`;
            }
        }
    };

    // 셀 내용 표시
    const getCellContent = () => {
        if (!content) {
            if (isEditMode) {
                // 편집 모드: 좌표 표시
                return (
                    <span className="text-xs text-gray-400">
                        {row},{col}
                    </span>
                );
            }
            return null; // 보기 모드: 빈 공간
        }

        if (isEditMode) {
            // 편집 모드: 아이콘 + ID
            const icon = getTypeIcon(content.type);
            return (
                <div className="text-center">
                    <div className="text-lg">{icon}</div>
                    <div className="text-xs text-gray-600">{content.id}</div>
                </div>
            );
        } else {
            // 보기 모드: 아이콘 + 소유자/가격 정보
            const icon = getTypeIcon(content.type);
            return (
                <div className="text-center">
                    <div className="text-sm mb-1">{icon}</div>
                    <div className="text-xs font-bold">{content.id}</div>
                    {content.owner ? (
                        <div className="text-xs text-blue-600 truncate">
                            {content.owner}
                        </div>
                    ) : (
                        <div className="text-xs text-green-600">
                            {content.price}빌
                        </div>
                    )}
                </div>
            );
        }
    };

    // 타입별 아이콘
    const getTypeIcon = (type) => {
        return '🪑'; // 모든 좌석 동일한 아이콘
    };

    return (
        <div
            className={getCellStyle()}
            onClick={handleClick}
            onMouseEnter={() => onCellHover(position, content)}
            title={isEditMode ? `위치: ${row},${col}` : content?.id || '빈 공간'}
        >
            {getCellContent()}
        </div>
    );
};

export default GridCell;