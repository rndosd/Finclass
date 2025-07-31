import React from 'react';
import { formatCurrency } from '../utils/propertyCalculations';

const MarketTab = ({ properties = [] }) => {
  // 매물만 필터링
  const availableProperties = properties.filter(prop => !prop.owner);
  
  // 시세별 정렬
  const sortedByPrice = [...properties].sort((a, b) => b.price - a.price);
  
  // 평균 시세 계산
  const averagePrice = properties.length > 0 
    ? Math.floor(properties.reduce((sum, prop) => sum + prop.price, 0) / properties.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* 시장 현황 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{properties.length}</div>
          <div className="text-sm text-gray-600">전체 매물</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{availableProperties.length}</div>
          <div className="text-sm text-gray-600">매물</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(averagePrice)}
          </div>
          <div className="text-sm text-gray-600">평균 시세</div>
        </div>
      </div>

      {/* 현재 매물 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">🏠 현재 매물</h3>
        {availableProperties.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-2">😔</div>
            <p className="text-gray-600">현재 판매 중인 매물이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableProperties.map((property) => (
              <div key={property.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">
                      {property.type === 'window' ? '🪟' : 
                       property.type === 'front' ? '📝' : '🪑'}
                    </div>
                    <div>
                      <div className="font-semibold">{property.id}</div>
                      <div className="text-sm text-gray-600">
                        {property.type === 'window' ? '창가석' :
                         property.type === 'front' ? '앞자리' : '일반석'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {formatCurrency(property.price)}
                    </div>
                    <div className="text-xs text-gray-500">매물</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 시세 랭킹 */}
      <div>
        <h3 className="text-lg font-semibold mb-3">📊 시세 랭킹</h3>
        <div className="space-y-2">
          {sortedByPrice.slice(0, 10).map((property, index) => (
            <div key={property.id} className="flex justify-between items-center p-3 bg-white border rounded">
              <div className="flex items-center space-x-3">
                <div className="w-6 text-center font-bold text-gray-600">
                  {index + 1}
                </div>
                <div className="text-lg">
                  {property.type === 'window' ? '🪟' : 
                   property.type === 'front' ? '📝' : '🪑'}
                </div>
                <div>
                  <span className="font-medium">{property.id}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {property.owner ? () : '(매물)'}
                  </span>
                </div>
              </div>
              <div className="font-bold text-green-600">
                {formatCurrency(property.price)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketTab;
