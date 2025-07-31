import React, { useState } from 'react';
import PropertyCard from './PropertyCard';
import PropertyDetailModal from '../modals/PropertyDetailModal';
import { useClassroomLayout } from '../hooks/useClassroomLayout';

const PropertyGrid = () => {
  const { properties, loading, refreshLayout } = useClassroomLayout();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  // 매물 구매 처리
  const handlePurchase = async (propertyId, newOwner, price) => {
    try {
      const savedLayoutJSON = localStorage.getItem('classroomLayout');
      if (!savedLayoutJSON) return;

      const savedLayout = JSON.parse(savedLayoutJSON);

      // 해당 좌석의 소유자 변경
      Object.keys(savedLayout.gridData).forEach(key => {
        if (savedLayout.gridData[key].id === propertyId) {
          savedLayout.gridData[key].owner = newOwner;
          // 거래 기록 추가 (선택사항)
          savedLayout.gridData[key].lastSold = new Date().toISOString();
          savedLayout.gridData[key].lastSoldPrice = price;
        }
      });

      // 저장 및 새로고침
      localStorage.setItem('classroomLayout', JSON.stringify(savedLayout));
      refreshLayout();

      console.log(`${propertyId} 구매 완료: ${newOwner}, ${price}빌`);
    } catch (error) {
      console.error('구매 처리 실패:', error);
      throw error;
    }
  };

  // 임대 처리 (임시적이므로 별도 처리)
  const handleRent = async (propertyId, renter, amount) => {
    try {
      // 임대는 소유권 변경 없이 기록만
      console.log(`${propertyId} 임대: ${renter}, ${amount}빌`);

      // 임대 기록을 별도 저장소에 보관할 수도 있음
      const rentRecord = {
        propertyId,
        renter,
        amount,
        date: new Date().toISOString(),
        duration: '1week'
      };

      // localStorage에 임대 기록 저장
      const existingRents = JSON.parse(localStorage.getItem('rentHistory') || '[]');
      existingRents.push(rentRecord);
      localStorage.setItem('rentHistory', JSON.stringify(existingRents));

    } catch (error) {
      console.error('임대 처리 실패:', error);
      throw error;
    }
  };

  // 건물 업그레이드 처리
  const handleBuildingUpgrade = async (propertyId, buildingData) => {
    try {
      const savedLayoutJSON = localStorage.getItem('classroomLayout');
      if (!savedLayoutJSON) return;

      const savedLayout = JSON.parse(savedLayoutJSON);

      // 해당 좌석의 건물 데이터 업데이트
      Object.keys(savedLayout.gridData).forEach(key => {
        if (savedLayout.gridData[key].id === propertyId) {
          savedLayout.gridData[key].building = {
            ...savedLayout.gridData[key].building,
            ...buildingData
          };
        }
      });

      // 저장 및 새로고침
      localStorage.setItem('classroomLayout', JSON.stringify(savedLayout));
      refreshLayout();

      console.log(`${propertyId} 건물 업그레이드 완료:`, buildingData);
    } catch (error) {
      console.error('건물 업그레이드 실패:', error);
      throw error;
    }
  };

  // 건물이 있는 좌석의 임대료 계산
  const calculateRentWithBuilding = (property) => {
    const baseRate = 5; // 기본 5%
    let totalRate = baseRate;

    if (property.building && property.building.level > 0) {
      const buildingBonuses = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 11 };
      const buildingBonus = buildingBonuses[property.building.level] || 0;
      totalRate = baseRate + buildingBonus;
    }

    return Math.floor(property.price * totalRate / 100);
  };

  // 그리드 렌더링 함수
  const renderLayoutGrid = () => {
    if (properties.length === 0) {
      return (
        <div className="col-span-full text-center py-8">
          <div className="mb-4 text-4xl">🏗️</div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            아직 교실 배치가 설정되지 않았습니다
          </h3>
          <p className="text-sm text-gray-500">
            교사가 배치 편집기에서 좌석을 설정해주세요
          </p>
        </div>
      );
    }

    // 각 좌석에 건물 정보가 포함된 임대료 계산 결과 추가
    const propertiesWithRent = properties.map(property => ({
      ...property,
      currentRent: calculateRentWithBuilding(property)
    }));

    return propertiesWithRent.map(property => (
      <div
        key={property.id}
        className="aspect-square"
        style={{
          gridRowStart: property.position.row + 1,
          gridColumnStart: property.position.col + 1,
        }}
      >
        <PropertyCard
          property={property}
          onClick={() => handlePropertyClick(property)}
        />
      </div>
    ));
  };

  // 통계 계산
  const getStatistics = () => {
    const totalProperties = properties.length;
    const ownedProperties = properties.filter(p => p.owner).length;
    const buildingCount = properties.filter(p => p.building && p.building.level > 0).length;
    const avgPrice = properties.length > 0
      ? Math.round(properties.reduce((sum, p) => sum + p.price, 0) / properties.length)
      : 0;

    // 레벨별 건물 통계
    const buildingsByLevel = {};
    properties.forEach(p => {
      if (p.building && p.building.level > 0) {
        buildingsByLevel[p.building.level] = (buildingsByLevel[p.building.level] || 0) + 1;
      }
    });

    return {
      totalProperties,
      ownedProperties,
      buildingCount,
      avgPrice,
      buildingsByLevel
    };
  };

  const stats = getStatistics();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg text-gray-600">배치 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-8 bg-slate-100 rounded-xl">
      {/* 통계 정보 */}
      {properties.length > 0 && (
        <div className="w-full max-w-4xl mb-6 bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-lg font-semibold mb-3">📊 부동산 시장 현황</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalProperties}</div>
              <div className="text-gray-600">총 매물</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.ownedProperties}</div>
              <div className="text-gray-600">거래 완료</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.buildingCount}</div>
              <div className="text-gray-600">건물 보유</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.avgPrice}</div>
              <div className="text-gray-600">평균 시세</div>
            </div>
          </div>

          {/* 건물 레벨별 통계 */}
          {Object.keys(stats.buildingsByLevel).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600 mb-2">건물 레벨별 현황:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.buildingsByLevel).map(([level, count]) => {
                  const icons = { 1: '🏠', 2: '🏢', 3: '🏬', 4: '🏨', 5: '🏦' };
                  return (
                    <span key={level} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                      {icons[level]} Lv.{level}: {count}개
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 원근 효과를 적용하기 위한 부모 요소 */}
      <div style={{ perspective: '1200px' }}>
        {/* 입체 효과를 적용할 내부 컨테이너 */}
        <div
          className="bg-white p-6 shadow-xl rounded-lg border border-slate-200 transition-transform duration-500 ease-in-out"
          style={{ transform: 'rotateX(45deg)', transformStyle: 'preserve-3d' }}
        >
          {/* 칠판 표시 */}
          {properties.length > 0 && (
            <div className="mb-4 text-center">
              <div className="inline-block rounded-lg border-2 border-green-300 bg-green-100 py-2 px-4 shadow-md">
                📚 칠판
              </div>
            </div>
          )}

          {/* 동적 그리드 컨테이너 */}
          {(() => {
            const maxCol = properties.length > 0
              ? Math.max(...properties.map(p => p.position.col)) + 1
              : 5;

            return (
              <div
                className="grid max-w-fit gap-4 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`,
                }}
              >
                {renderLayoutGrid()}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 입구 등 장식용 디테일 */}
      <div className="w-1/3 h-4 mt-4 bg-slate-300 rounded-t-md border-x border-t border-slate-400"></div>
      <div className="text-xs font-bold text-slate-500 mt-1">ENTRANCE</div>

      {/* 하단 정보 텍스트 */}
      {properties.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          💡 좌석을 클릭하면 상세 정보를 확인하고 건물을 관리할 수 있습니다
        </div>
      )}

      {/* 모달 */}
      {isModalOpen && selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onPurchase={handlePurchase}
          onRent={handleRent}
          onBuildingUpgrade={handleBuildingUpgrade}
        />
      )}
    </div>
  );
};

export default PropertyGrid;