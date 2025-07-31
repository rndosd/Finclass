import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import GridCell from './GridCell';
import SeatTypePalette from './SeatTypePalette';
import GridSizeConfigurator from './GridSizeConfigurator';

const SeatLayoutEditor = () => {
    const navigate = useNavigate();

    // --- 상태 관리 ---
    const [selectedTool, setSelectedTool] = useState('normal');
    const [gridData, setGridData] = useState({});
    const [hasChanges, setHasChanges] = useState(false);
    const [isGridConfigExpanded, setIsGridConfigExpanded] = useState(false);

    // --- 동적 그리드 설정 ---
    const [gridRows, setGridRows] = useState(7);
    const [gridCols, setGridCols] = useState(11);
    const TOTAL_CELLS = gridRows * gridCols;

    // 수정됨: localStorage에서 데이터를 한 번만 로드하도록 useEffect 사용
    // 렌더링마다 상태 업데이트가 일어나는 것을 방지
    useEffect(() => {
        try {
            const savedLayoutJSON = localStorage.getItem('classroomLayout');
            if (savedLayoutJSON) {
                const savedLayout = JSON.parse(savedLayoutJSON);

                // 저장된 객체에서 데이터와 크기를 모두 불러오는지 확인
                if (savedLayout.gridData && savedLayout.dimensions) {

                    // 1. 좌석 데이터 설정
                    setGridData(savedLayout.gridData);

                    // 2. 그리드 크기(dimensions) 설정 (이 부분이 추가되었습니다)
                    setGridRows(savedLayout.dimensions.rows);
                    setGridCols(savedLayout.dimensions.cols);

                } else {
                    // 이전 방식으로 저장된 데이터가 있을 경우를 위한 호환 코드
                    setGridData(savedLayout);
                }
            }
        } catch (error) {
            console.error('편집기 데이터 로드 실패:', error);
            setGridData({});
        }
    }, []); // 마운트 시 한 번만 실행

    // --- 그리드 크기 변경 핸들러 ---
    const handleGridSizeChange = (newRows, newCols) => {
        if (!window.confirm('그리드 크기를 변경하면 일부 좌석이 삭제될 수 있습니다. 계속하시겠습니까?')) {
            return;
        }

        setGridRows(newRows);
        setGridCols(newCols);

        // 새 그리드 경계를 벗어나는 좌석들 제거
        const newGridData = {};
        Object.entries(gridData).forEach(([key, value]) => {
            const [row, col] = key.split('-').map(Number);
            if (row < newRows && col < newCols) {
                newGridData[key] = value;
            }
        });

        setGridData(newGridData);
        setHasChanges(true);
    };

    // --- 셀 클릭 핸들러 ---
    // 수정됨: 버그가 있던 `seatCounter` 상태 의존성 제거
    // 그리드에서 기존 좌석을 확인하여 좌석 ID를 견고하게 생성
    const handleCellClick = (position, tool, existingContent) => {
        const { row, col } = position;
        const cellKey = `${row}-${col}`;

        setGridData(prevGrid => {
            const newGrid = { ...prevGrid };

            if (tool === 'delete') {
                if (existingContent) delete newGrid[cellKey];
            } else if (existingContent && tool === existingContent.type) {
                // 같은 도구로 클릭하면 토글 해제
                delete newGrid[cellKey];
            } else {
                let seatId;

                if (existingContent) {
                    // 좌석 타입만 변경할 때는 기존 ID 유지
                    seatId = existingContent.id;
                } else {
                    // 새 좌석을 위해 새롭고 고유한 ID 생성
                    const rowLetter = String.fromCharCode(65 + row);
                    // 현재 행의 모든 기존 좌석 번호 찾기
                    const seatsInRow = Object.values(prevGrid).filter(
                        seat => seat.position.row === row
                    );
                    const existingNumbers = seatsInRow.map(seat => {
                        const parts = seat.id.split('-');
                        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
                    });
                    // 새 ID는 기존 최고 번호보다 1 큰 값
                    const maxNumber = existingNumbers.length > 0 ? Math.max(0, ...existingNumbers) : 0;
                    seatId = `${rowLetter}-${maxNumber + 1}`;
                }

                newGrid[cellKey] = {
                    id: seatId,
                    type: tool,
                    position: { row, col },
                    owner: null,
                    price: getDefaultPrice(tool),
                };
            }

            setHasChanges(true);
            return newGrid;
        });
    };

    // --- 헬퍼 함수 및 핸들러 ---

    const getDefaultPrice = (type) => {
        return 100; // 모든 좌석 동일 가격
    };

    // 수정됨: 더 이상 `seatCounter` 관리 불필요
    const handleReset = () => {
        if (window.confirm('모든 좌석 배치를 초기화하시겠습니까?')) {
            setGridData({});
            setHasChanges(true);
        }
    };

    const handleSave = () => {
        try {
            // ✅ 좌석 데이터와 그리드 크기를 함께 묶음
            const layoutToSave = {
                gridData: gridData,
                dimensions: {
                    rows: gridRows,
                    cols: gridCols,
                },
            };

            // ✅ 통합된 객체를 localStorage에 저장
            localStorage.setItem('classroomLayout', JSON.stringify(layoutToSave));

            alert('좌석 배치가 저장되었습니다!');
            setHasChanges(false);
        } catch (error) {
            console.error('저장 실패:', error);
            alert(`저장에 실패했습니다: ${error.message}`);
        }
    };

    const handlePreview = () => navigate('/realestate');

    const handleGoBack = () => {
        if (hasChanges && !window.confirm('저장되지 않은 변경사항이 있습니다. 정말 나가시겠습니까?')) {
            return;
        }
        navigate('/realestate');
    };

    // --- 템플릿 적용 ---
    const applyTemplate = (templateName) => {
        if (!window.confirm('템플릿을 적용하면 현재 배치가 초기화됩니다. 계속하시겠습니까?')) {
            return;
        }

        let templateData = {};
        // 템플릿은 더 나은 맞춤을 위해 그리드 크기도 조정할 수 있음
        let newRows = 7, newCols = 11;

        switch (templateName) {
            case 'basic':
                templateData = generateBasicTemplate(newRows, newCols);
                break;
            case 'classroom':
                templateData = generateClassroomTemplate(newRows, newCols);
                break;
            default:
                return;
        }

        setGridRows(newRows);
        setGridCols(newCols);
        setGridData(templateData);
        setHasChanges(true);
    };

    const generateBasicTemplate = (rows, cols) => {
        const template = {};
        for (let row = 0; row < rows - 2; row++) {
            let seatNumInRow = 1;
            for (let col = 0; col < cols - 1; col++) {
                if (col === 3 || col === 7) continue; // 복도
                template[`${row}-${col}`] = {
                    id: `${String.fromCharCode(65 + row)}-${seatNumInRow++}`,
                    type: 'normal',
                    position: { row, col },
                    owner: null,
                    price: getDefaultPrice('normal'),
                };
            }
        }
        return template;
    };

    const generateClassroomTemplate = (rows, cols) => {
        const template = {};
        for (let row = 0; row < rows - 1; row++) {
            if (row > 4 && row < rows - 2) continue; // 간격
            for (let col = 0; col < cols; col += 2) {
                template[`${row}-${col}`] = {
                    id: `${String.fromCharCode(65 + row)}-${col / 2 + 1}`,
                    type: 'normal',
                    position: { row, col },
                    owner: null,
                    price: getDefaultPrice('normal'),
                };
            }
        }
        return template;
    };

    // 최적화됨: 통계는 gridData가 변경될 때만 계산되며, 모든 렌더링마다 계산되지 않음
    const stats = useMemo(() => {
        const seats = Object.values(gridData);
        return {
            total: seats.length,
            byType: {
                normal: seats.filter(s => s.type === 'normal').length,
            },
        };
    }, [gridData]);

    // --- 그리드 렌더링 ---
    const renderGrid = () => {
        const cells = [];
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const row = Math.floor(i / gridCols);
            const col = i % gridCols;
            const cellKey = `${row}-${col}`;
            const content = gridData[cellKey] || null;

            cells.push(
                <GridCell
                    key={cellKey}
                    position={{ row, col }}
                    content={content}
                    isEditMode={true}
                    selectedTool={selectedTool}
                    onCellClick={handleCellClick}
                />
            );
        }
        return cells;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* 헤더 */}
                <div className="mb-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <button onClick={handleGoBack} className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                                <span>←</span>
                                <span>돌아가기</span>
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">🛠️ 교실 배치 편집기</h1>
                                <p className="text-gray-600">{gridCols}×{gridRows} 그리드에서 자유롭게 좌석을 배치하세요</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">총 좌석: <span className="font-bold text-blue-600">{stats.total}개</span></div>
                            {hasChanges && <div className="text-sm text-orange-600 font-medium">⚠️ 저장되지 않은 변경사항</div>}
                        </div>
                    </div>
                </div>

                {/* 그리드 크기 설정기 */}
                <GridSizeConfigurator currentRows={gridRows} currentCols={gridCols} onSizeChange={handleGridSizeChange} isExpanded={isGridConfigExpanded} onToggle={() => setIsGridConfigExpanded(!isGridConfigExpanded)} />

                {/* 도구 팔레트 */}
                <SeatTypePalette selectedTool={selectedTool} onToolChange={setSelectedTool} />

                {/* 제어 버튼들 */}
                <div className="mb-6 flex flex-wrap gap-3">
                    <button onClick={handleSave} disabled={!hasChanges} className={`px-4 py-2 rounded-lg ${hasChanges ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                        💾 저장하기 {hasChanges ? '●' : ''}
                    </button>
                    <button onClick={handlePreview} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">👁️ 학생 보기로 이동</button>
                    <button onClick={handleReset} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">🗑️ 전체 초기화</button>
                    <div className="flex gap-2">
                        <button onClick={() => applyTemplate('basic')} className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">📐 기본 템플릿</button>
                        <button onClick={() => applyTemplate('classroom')} className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm">🏫 교실 템플릿</button>
                    </div>
                </div>

                {/* 통계 */}
                <div className="mb-6 bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">📊 좌석 현황</h3>
                        <div className="flex space-x-6 text-sm">
                            <span>🪑 좌석: <strong>{stats.byType.normal}개</strong></span>
                        </div>
                    </div>
                </div>

                {/* 메인 그리드 */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="mb-4 text-center">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">교실 배치도 ({gridCols}×{gridRows})</h2>
                        <div className="text-sm text-gray-500">클릭하여 좌석을 배치하거나 제거하세요</div>
                    </div>
                    <div className="grid gap-1 max-w-fit mx-auto" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
                        {renderGrid()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeatLayoutEditor;