// src/hooks/useClassroomLayout.js

import { useState, useEffect, useCallback } from 'react';

// 기본 배치 데이터 (필요시 사용)
const getDefaultProperties = () => {
    // ... (기존과 동일)
    return [
        { id: 'A-1', owner: '김철수', price: 150, position: { row: 0, col: 0 }, type: 'window' },
        // ... 타입과 가격을 다양하게 설정해주는 것이 좋습니다.
    ];
};


export const useClassroomLayout = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);

    // ✨ 코드 중복을 막기 위해 로직을 하나의 함수로 통합합니다.
    // useCallback으로 불필요한 재생성을 방지합니다.
    const loadLayout = useCallback(() => {
        setLoading(true);
        try {
            const savedLayoutJSON = localStorage.getItem('classroomLayout');

            if (savedLayoutJSON) {
                const savedLayout = JSON.parse(savedLayoutJSON);
                let gridData = {};

                // ✅ 1. 새로운 데이터 구조를 올바르게 해석합니다.
                // savedLayout에 gridData 속성이 있는지 확인합니다.
                if (savedLayout.gridData) {
                    gridData = savedLayout.gridData;
                } else {
                    // 이전 방식 데이터와의 호환을 위해 남겨둡니다.
                    gridData = savedLayout;
                }

                // ✅ 2. 'window', 'front' 타입도 포함하도록 필터를 수정합니다.
                const propertiesArray = Object.values(gridData).filter(seat =>
                    seat && ['normal', 'window', 'front'].includes(seat.type)
                );

                setProperties(propertiesArray);

            } else {
                console.log('저장된 배치가 없음 - 기본 배치 사용');
                setProperties(getDefaultProperties());
            }
        } catch (error) {
            console.error('배치 불러오기 실패:', error);
            setProperties(getDefaultProperties());
        } finally {
            setLoading(false);
        }
    }, []); // 의존성 배열이 비어있으므로 이 함수는 한 번만 생성됩니다.

    // 컴포넌트 마운트 시 레이아웃을 불러옵니다.
    useEffect(() => {
        loadLayout();
    }, [loadLayout]);

    return {
        properties,
        loading,
        refreshLayout: loadLayout // 새로고침 함수로 통합된 함수를 사용합니다.
    };
};