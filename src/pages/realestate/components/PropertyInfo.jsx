import React from 'react';

const PropertyInfo = ({ property }) => {
  const getLocationDescription = () => {
    switch (property?.type) {
      case 'window':
        return '창가석 - 채광이 좋고 조용한 자리입니다';
      case 'front':
        return '앞자리 - 선생님과 가까운 자리입니다';
      default:
        return '일반석 - 표준적인 교실 자리입니다';
    }
  };

  const getExpectedRent = () => {
    if (!property?.price) return 0;
    return Math.floor(property.price * 0.03); // 시세의 3%
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        🏠 매물 정보
      </h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">좌석 번호:</span>
          <span className="font-bold text-lg">{property?.id}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">위치 특성:</span>
          <span className="font-medium text-sm text-blue-600">
            {getLocationDescription()}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">현재 소유자:</span>
          <span className="font-medium">
            {property?.owner ? (
              <span className="text-blue-600">{property.owner}</span>
            ) : (
              <span className="text-green-600">매물 중</span>
            )}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">현재 시세:</span>
          <span className="font-bold text-green-600 text-lg">{property?.price}빌</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">예상 임대료:</span>
          <span className="font-medium text-orange-600">{getExpectedRent()}빌/주</span>
        </div>

        <div className="border-t pt-2 mt-3">
          <div className="text-xs text-gray-500">
            💡 임대료는 시세의 약 3% 수준으로 책정됩니다
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyInfo;
