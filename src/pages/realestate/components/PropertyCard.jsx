import React from 'react';

const PropertyCard = ({ property, onClick }) => {
  const hasBuilding = property.building && property.building.level > 0;

  const getCardStyle = () => {
    let baseStyle = 'relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg transform hover:-translate-y-1';

    if (property.owner) {
      // 소유중인 자리
      if (hasBuilding) {
        // 건물이 있는 소유 자리는 그라데이션으로 표시
        return `${baseStyle} bg-gradient-to-t from-blue-200 to-blue-50 border-blue-400 hover:from-blue-300 hover:to-blue-100`;
      } else {
        return `${baseStyle} bg-blue-50 border-blue-300 hover:bg-blue-100`;
      }
    } else {
      // 매물 자리 - 건물 유무에 관계없이 동일
      return `${baseStyle} bg-gray-50 border-gray-300 hover:bg-gray-100`;
    }
  };

  // 임대료 색상 (건물 포함 임대료 기준)
  const getRentColor = () => {
    const rent = property.currentRent || getBasicRent();
    if (rent >= 30) return 'text-purple-600 font-bold';
    if (rent >= 20) return 'text-green-600 font-bold';
    if (rent >= 15) return 'text-blue-600 font-semibold';
    if (rent >= 10) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getBasicRent = () => {
    return Math.floor(property.price * 0.05); // 기본 5%
  };

  const getLocationIcon = () => {
    if (property.type === 'window') return '🪟';
    if (property.type === 'front') return '📝';
    return '🪑';
  };

  const getBuildingHeight = () => {
    if (!hasBuilding) return 'h-16'; // 기본 높이

    const level = property.building.level;
    const heights = {
      1: 'h-18', // 🏠
      2: 'h-20', // 🏢
      3: 'h-22', // 🏬
      4: 'h-24', // 🏨
      5: 'h-26'  // 🏦
    };
    return heights[level] || 'h-16';
  };

  const getBuildingIcon = () => {
    if (!hasBuilding) return getLocationIcon();

    const buildingIcons = {
      1: '🏠',
      2: '🏢',
      3: '🏬',
      4: '🏨',
      5: '🏦'
    };

    return buildingIcons[property.building.level] || '🏢';
  };

  const getBuildingName = () => {
    if (!hasBuilding) return null;
    return `${property.building.level}단계`;
  };

  return (
    <div className={`${getCardStyle()} ${getBuildingHeight()}`} onClick={onClick}>
      {/* 건물이 있을 때 그림자 효과 */}
      {hasBuilding && (
        <div className="absolute inset-0 bg-black opacity-10 rounded-lg transform translate-x-1 translate-y-1 -z-10"></div>
      )}

      <div className="text-center h-full flex flex-col justify-between">
        {/* 상단: 건물/위치 아이콘 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`${hasBuilding ? 'text-2xl' : 'text-lg'} mb-1`}>
              {getBuildingIcon()}
            </div>

            {/* 건물이 있으면 위치 아이콘도 작게 표시 */}
            {hasBuilding && (
              <div className="text-xs opacity-70">
                {getLocationIcon()}
              </div>
            )}
          </div>
        </div>

        {/* 중단: ID와 건물 정보 */}
        <div className="mb-1">
          <div className="font-bold text-sm text-gray-800">
            {property.id}
          </div>
          {hasBuilding && (
            <div className="text-xs text-purple-600 font-medium">
              {getBuildingName()}
            </div>
          )}
        </div>

        {/* 하단: 소유자/임대료 정보 */}
        <div>
          <div className="text-xs text-gray-600 mb-1">
            {property.owner ? (
              <span className="text-blue-600 font-medium truncate block">
                {property.owner}
              </span>
            ) : (
              <span className="text-gray-500">매물</span>
            )}
          </div>

          <div className={`text-sm ${getRentColor()}`}>
            {hasBuilding && property.currentRent ? (
              <>
                {property.currentRent}빌
                <span className="text-xs">/주</span>
              </>
            ) : (
              `${property.price}빌`
            )}
          </div>
        </div>

        {/* 하단 태그들 */}
        <div className="flex justify-center items-center mt-1 space-x-1 flex-wrap">
          {/* 위치 태그 (건물 없을 때만) */}
          {!hasBuilding && property.type === 'window' && (
            <span className="text-xs bg-yellow-200 text-yellow-800 px-1 rounded">창가</span>
          )}
          {!hasBuilding && property.type === 'front' && (
            <span className="text-xs bg-red-200 text-red-800 px-1 rounded">앞자리</span>
          )}

          {/* 건물 레벨 태그 */}
          {hasBuilding && (
            <span className="text-xs bg-purple-200 text-purple-800 px-1 rounded font-medium">
              Lv.{property.building.level}
            </span>
          )}

          {/* 최고 레벨 표시 */}
          {hasBuilding && property.building.level === 5 && (
            <span className="text-xs bg-gold-200 text-gold-800 px-1 rounded">
              ⭐ MAX
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;