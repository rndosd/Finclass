import React from 'react';
import { usePropertyOwnership } from '../hooks/useProperties';
import { formatCurrency, propertyCalculations } from '../utils/propertyCalculations';

const MyPropertiesTab = ({ userId }) => {
  const { ownedProperties, totalValue, propertyCount } = usePropertyOwnership(userId);

  if (propertyCount === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🏠</div>
        <h3 className="text-lg font-medium text-gray-600 mb-2">
          소유하신 부동산이 없습니다
        </h3>
        <p className="text-sm text-gray-500">
          교실 부동산을 구매해서 투자를 시작해보세요!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 소유 현황 요약 */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">
          📊 내 부동산 포트폴리오
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{propertyCount}</div>
            <div className="text-sm text-gray-600">보유 매물</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalValue)}
            </div>
            <div className="text-sm text-gray-600">총 자산가치</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(
                ownedProperties.reduce((sum, prop) => 
                  sum + propertyCalculations.calculateRent(prop.price), 0
                )
              )}
            </div>
            <div className="text-sm text-gray-600">주간 임대수익</div>
          </div>
        </div>
      </div>

      {/* 보유 매물 목록 */}
      <div>
        <h4 className="text-md font-medium text-gray-800 mb-3">보유 매물 목록</h4>
        <div className="space-y-3">
          {ownedProperties.map((property) => (
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
                  <div className="text-sm text-orange-600">
                    임대료: {formatCurrency(propertyCalculations.calculateRent(property.price))}/주
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyPropertiesTab;
