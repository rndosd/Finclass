# FinClass 부동산 시스템 파일 생성 스크립트 (수정버전)
Write-Host "🏠 FinClass 부동산 시스템 파일 생성 중..." -ForegroundColor Green

# 현재 위치 확인
if (!(Test-Path "src")) {
    Write-Host "❌ 오류: src 폴더를 찾을 수 없습니다. 프로젝트 루트에서 실행해주세요." -ForegroundColor Red
    exit
}

# 기본 폴더 구조 생성
Write-Host "📁 폴더 구조 생성 중..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "src\pages\realestate" | Out-Null
New-Item -ItemType Directory -Force -Path "src\pages\realestate\components" | Out-Null
New-Item -ItemType Directory -Force -Path "src\pages\realestate\modals" | Out-Null
New-Item -ItemType Directory -Force -Path "src\pages\realestate\hooks" | Out-Null
New-Item -ItemType Directory -Force -Path "src\pages\realestate\services" | Out-Null
New-Item -ItemType Directory -Force -Path "src\pages\realestate\tabs" | Out-Null
New-Item -ItemType Directory -Force -Path "src\pages\realestate\utils" | Out-Null
New-Item -ItemType Directory -Force -Path "src\routes\realestate" | Out-Null

# 메인 페이지
Write-Host "🏢 메인 페이지 생성 중..." -ForegroundColor Cyan
@"
import React from 'react';
import PropertyGrid from './components/PropertyGrid';

const RealEstatePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏠 FinClass 부동산
          </h1>
          <p className="text-gray-600">
            교실 자리를 부동산으로! 매매와 임대를 통해 경제를 배워보세요.
          </p>
        </div>
        
        <PropertyGrid />
      </div>
    </div>
  );
};

export default RealEstatePage;
"@ | Out-File -FilePath "src\pages\realestate\index.jsx" -Encoding UTF8

# PropertyGrid 컴포넌트
Write-Host "🎨 PropertyGrid 컴포넌트 생성 중..." -ForegroundColor Cyan
@"
import React, { useState } from 'react';
import PropertyCard from './PropertyCard';
import PropertyDetailModal from '../modals/PropertyDetailModal';

const PropertyGrid = () => {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 임시 데이터 (나중에 Firebase에서 가져올 예정)
  const properties = [
    // 첫 번째 줄 (창가)
    { id: 'A-1', owner: '김철수', price: 150, position: { row: 0, col: 0 }, type: 'window' },
    { id: 'A-2', owner: '이영희', price: 145, position: { row: 0, col: 1 }, type: 'window' },
    { id: 'A-3', owner: null, price: 140, position: { row: 0, col: 2 }, type: 'window' },
    { id: 'A-4', owner: '박민수', price: 135, position: { row: 0, col: 3 }, type: 'window' },
    { id: 'A-5', owner: null, price: 130, position: { row: 0, col: 4 }, type: 'window' },
    
    // 두 번째 줄
    { id: 'B-1', owner: '정수아', price: 120, position: { row: 1, col: 0 }, type: 'normal' },
    { id: 'B-2', owner: null, price: 115, position: { row: 1, col: 1 }, type: 'normal' },
    { id: 'B-3', owner: '최동욱', price: 110, position: { row: 1, col: 2 }, type: 'normal' },
    { id: 'B-4', owner: null, price: 105, position: { row: 1, col: 3 }, type: 'normal' },
    { id: 'B-5', owner: '장미래', price: 100, position: { row: 1, col: 4 }, type: 'normal' },
    
    // 세 번째 줄
    { id: 'C-1', owner: null, price: 95, position: { row: 2, col: 0 }, type: 'normal' },
    { id: 'C-2', owner: '윤서준', price: 90, position: { row: 2, col: 1 }, type: 'normal' },
    { id: 'C-3', owner: null, price: 85, position: { row: 2, col: 2 }, type: 'normal' },
    { id: 'C-4', owner: '강하늘', price: 80, position: { row: 2, col: 3 }, type: 'normal' },
    { id: 'C-5', owner: null, price: 75, position: { row: 2, col: 4 }, type: 'normal' },
    
    // 네 번째 줄 (앞자리)
    { id: 'D-1', owner: null, price: 70, position: { row: 3, col: 0 }, type: 'front' },
    { id: 'D-2', owner: '송예린', price: 65, position: { row: 3, col: 1 }, type: 'front' },
    { id: 'D-3', owner: null, price: 60, position: { row: 3, col: 2 }, type: 'front' },
    { id: 'D-4', owner: null, price: 55, position: { row: 3, col: 3 }, type: 'front' },
    { id: 'D-5', owner: '임태현', price: 50, position: { row: 3, col: 4 }, type: 'front' },
  ];

  const handlePropertyClick = (property) => {
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">교실 부동산 배치도</h2>
        <div className="flex space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
            <span>소유중</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded mr-2"></div>
            <span>매물</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
            <span>창가석</span>
          </div>
        </div>
      </div>
      
      {/* 칠판 표시 */}
      <div className="text-center mb-4">
        <div className="bg-green-100 border-2 border-green-300 rounded-lg py-2 px-4 inline-block">
          📚 칠판
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-4 max-w-2xl mx-auto">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onClick={() => handlePropertyClick(property)}
          />
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        💡 좌석을 클릭하면 상세 정보를 확인할 수 있습니다
      </div>

      {isModalOpen && (
        <PropertyDetailModal
          property={selectedProperty}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default PropertyGrid;
"@ | Out-File -FilePath "src\pages\realestate\components\PropertyGrid.jsx" -Encoding UTF8

# PropertyCard 컴포넌트
Write-Host "🏠 PropertyCard 컴포넌트 생성 중..." -ForegroundColor Cyan
@"
import React from 'react';

const PropertyCard = ({ property, onClick }) => {
  const getCardStyle = () => {
    let baseStyle = 'p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md transform hover:-translate-y-1';
    
    if (property.owner) {
      // 소유중인 자리
      return `${baseStyle} bg-blue-50 border-blue-300 hover:bg-blue-100`;
    } else {
      // 매물 자리
      if (property.type === 'window') {
        return `${baseStyle} bg-yellow-50 border-yellow-300 hover:bg-yellow-100`;
      } else if (property.type === 'front') {
        return `${baseStyle} bg-red-50 border-red-300 hover:bg-red-100`;
      } else {
        return `${baseStyle} bg-gray-50 border-gray-300 hover:bg-gray-100`;
      }
    }
  };

  const getPriceColor = () => {
    if (property.price >= 130) return 'text-green-600 font-bold';
    if (property.price >= 100) return 'text-blue-600 font-semibold';
    if (property.price >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLocationIcon = () => {
    if (property.type === 'window') return '🪟';
    if (property.type === 'front') return '📝';
    return '🪑';
  };

  return (
    <div className={getCardStyle()} onClick={onClick}>
      <div className="text-center">
        <div className="text-lg mb-1">
          {getLocationIcon()}
        </div>
        <div className="font-bold text-lg text-gray-800">
          {property.id}
        </div>
        <div className="text-xs text-gray-600 mb-1">
          {property.owner ? (
            <span className="text-blue-600 font-medium">{property.owner}</span>
          ) : (
            <span className="text-gray-500">매물</span>
          )}
        </div>
        <div className={`text-sm ${getPriceColor()}`}>
          {property.price}빌
        </div>
        {property.type === 'window' && (
          <div className="text-xs text-yellow-600 mt-1">창가</div>
        )}
        {property.type === 'front' && (
          <div className="text-xs text-red-600 mt-1">앞자리</div>
        )}
      </div>
    </div>
  );
};

export default PropertyCard;
"@ | Out-File -FilePath "src\pages\realestate\components\PropertyCard.jsx" -Encoding UTF8

# PropertyInfo 컴포넌트
Write-Host "ℹ️ PropertyInfo 컴포넌트 생성 중..." -ForegroundColor Cyan
@"
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
"@ | Out-File -FilePath "src\pages\realestate\components\PropertyInfo.jsx" -Encoding UTF8

# PropertyDetailModal
Write-Host "🔧 PropertyDetailModal 생성 중..." -ForegroundColor Cyan
@"
import React from 'react';

const PropertyDetailModal = ({ property, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePurchase = () => {
    // TODO: 구매 로직 구현
    alert(`${property.id} 매물 구매 기능 구현 예정`);
    onClose();
  };

  const handleRent = () => {
    // TODO: 임대 로직 구현
    alert(`${property.id} 매물 임대 기능 구현 예정`);
    onClose();
  };

  const getExpectedRent = () => {
    if (!property?.price) return 0;
    return Math.floor(property.price * 0.03);
  };

  const getLocationIcon = () => {
    if (property?.type === 'window') return '🪟';
    if (property?.type === 'front') return '📝';
    return '🪑';
  };

  const getLocationDescription = () => {
    switch (property?.type) {
      case 'window':
        return '창가석 - 채광이 좋고 조용함';
      case 'front':
        return '앞자리 - 선생님과 가까움';
      default:
        return '일반석 - 표준적인 자리';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">매물 상세 정보</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* 매물 기본 정보 */}
          <div className="text-center border-b pb-4">
            <div className="text-4xl mb-2">{getLocationIcon()}</div>
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {property?.id}
            </div>
            <div className="text-sm text-gray-600">
              {getLocationDescription()}
            </div>
          </div>

          {/* 상세 정보 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">현재 상태</span>
              <span className="font-medium">
                {property?.owner ? (
                  <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {property.owner} 소유
                  </span>
                ) : (
                  <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                    매물
                  </span>
                )}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">현재 시세</span>
              <span className="font-bold text-green-600 text-xl">
                {property?.price}빌
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">예상 임대료</span>
              <span className="font-medium text-orange-600">
                {getExpectedRent()}빌/주
              </span>
            </div>
          </div>

          {/* 투자 정보 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">
              💰 투자 정보
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• 예상 수익률: 약 {((getExpectedRent() * 52 / property?.price) * 100).toFixed(1)}%/년</div>
              <div>• 임대료는 매주 자동 정산됩니다</div>
              <div>• 시세는 실제 거래가에 따라 변동됩니다</div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex space-x-3 pt-4">
            {!property?.owner ? (
              <>
                <button
                  onClick={handlePurchase}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
                >
                  💰 구매하기
                </button>
                <button
                  onClick={handleRent}
                  className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 font-medium"
                >
                  🏠 임대하기
                </button>
              </>
            ) : (
              <div className="flex-1 text-center py-3 px-4 bg-gray-100 rounded-lg text-gray-600">
                이미 소유자가 있는 매물입니다
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailModal;
"@ | Out-File -FilePath "src\pages\realestate\modals\PropertyDetailModal.jsx" -Encoding UTF8

# Services
Write-Host "🔥 propertyService.js 생성 중..." -ForegroundColor Cyan
@"
// TODO: Firebase 연동 후 실제 구현
export const propertyService = {
  // 모든 부동산 데이터 가져오기
  getAllProperties: async () => {
    try {
      // Firebase에서 데이터 가져오기
      // const snapshot = await getDocs(collection(db, 'properties'));
      // return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 임시 데이터 반환
      return [];
    } catch (error) {
      console.error('부동산 데이터 가져오기 실패:', error);
      throw error;
    }
  },

  // 특정 부동산 정보 가져오기
  getPropertyById: async (propertyId) => {
    try {
      // Firebase에서 특정 부동산 데이터 가져오기
      // const docRef = doc(db, 'properties', propertyId);
      // const docSnap = await getDoc(docRef);
      // return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
      
      return null;
    } catch (error) {
      console.error('부동산 정보 가져오기 실패:', error);
      throw error;
    }
  },

  // 부동산 구매
  purchaseProperty: async (propertyId, buyerId, price) => {
    try {
      // Firebase에서 소유권 이전 처리
      // 1. 구매자 잔액 확인
      // 2. 잔액 차감
      // 3. 소유권 이전
      // 4. 거래 내역 저장
      
      console.log(`부동산 구매: ${propertyId}, 구매자: ${buyerId}, 가격: ${price}`);
      return { success: true, message: '구매가 완료되었습니다.' };
    } catch (error) {
      console.error('부동산 구매 실패:', error);
      return { success: false, message: error.message };
    }
  },

  // 부동산 매물 등록
  listProperty: async (propertyId, sellerId, price) => {
    try {
      // Firebase에서 매물 등록 처리
      console.log(`매물 등록: ${propertyId}, 판매자: ${sellerId}, 가격: ${price}`);
      return { success: true, message: '매물이 등록되었습니다.' };
    } catch (error) {
      console.error('매물 등록 실패:', error);
      return { success: false, message: error.message };
    }
  },

  // 부동산 시세 업데이트
  updatePropertyPrice: async (propertyId, newPrice) => {
    try {
      // Firebase에서 시세 업데이트
      console.log(`시세 업데이트: ${propertyId}, 새 가격: ${newPrice}`);
      return { success: true };
    } catch (error) {
      console.error('시세 업데이트 실패:', error);
      throw error;
    }
  },

  // 임대 계약
  rentProperty: async (propertyId, tenantId, rentAmount) => {
    try {
      // Firebase에서 임대 계약 처리
      console.log(`임대 계약: ${propertyId}, 임차인: ${tenantId}, 임대료: ${rentAmount}`);
      return { success: true, message: '임대 계약이 완료되었습니다.' };
    } catch (error) {
      console.error('임대 계약 실패:', error);
      return { success: false, message: error.message };
    }
  }
};
"@ | Out-File -FilePath "src\pages\realestate\services\propertyService.js" -Encoding UTF8

# Hooks
Write-Host "🎣 useProperties.js 생성 중..." -ForegroundColor Cyan
@"
import { useState, useEffect } from 'react';
import { propertyService } from '../services/propertyService';

export const useProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await propertyService.getAllProperties();
      setProperties(data);
    } catch (err) {
      setError(err.message);
      console.error('부동산 데이터 로딩 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const refreshProperties = () => {
    fetchProperties();
  };

  const purchaseProperty = async (propertyId, buyerId, price) => {
    try {
      const result = await propertyService.purchaseProperty(propertyId, buyerId, price);
      if (result.success) {
        await fetchProperties(); // 데이터 새로고침
      }
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const rentProperty = async (propertyId, tenantId, rentAmount) => {
    try {
      const result = await propertyService.rentProperty(propertyId, tenantId, rentAmount);
      if (result.success) {
        await fetchProperties(); // 데이터 새로고침
      }
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  return {
    properties,
    loading,
    error,
    refreshProperties,
    purchaseProperty,
    rentProperty
  };
};

export const usePropertyOwnership = (userId) => {
  const { properties } = useProperties();
  
  const ownedProperties = properties.filter(property => property.owner === userId);
  const totalValue = ownedProperties.reduce((sum, property) => sum + property.price, 0);
  
  return {
    ownedProperties,
    totalValue,
    propertyCount: ownedProperties.length
  };
};
"@ | Out-File -FilePath "src\pages\realestate\hooks\useProperties.js" -Encoding UTF8

# 라우트 파일 생성 (경로 수정됨)
Write-Host "🛣️ 라우트 생성 중..." -ForegroundColor Cyan
@"
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RealEstatePage from '../../pages/realestate';

const RealEstateRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RealEstatePage />} />
      {/* 추후 추가 라우트들 */}
      {/* <Route path="/market" element={<PropertyMarketPage />} /> */}
      {/* <Route path="/my-properties" element={<MyPropertiesPage />} /> */}
      {/* <Route path="/transactions" element={<TransactionHistoryPage />} /> */}
    </Routes>
  );
};

export default RealEstateRoutes;
"@ | Out-File -FilePath "src\routes\realestate\index.js" -Encoding UTF8

# utils 폴더에 계산 함수들 추가
Write-Host "🧮 유틸리티 함수들 생성 중..." -ForegroundColor Cyan
@"
// 부동산 관련 계산 함수들

export const propertyCalculations = {
  // 임대료 계산 (시세의 3%)
  calculateRent: (propertyPrice, rentRate = 0.03) => {
    return Math.floor(propertyPrice * rentRate);
  },

  // 연간 수익률 계산
  calculateYearlyReturn: (weeklyRent, propertyPrice) => {
    const yearlyRent = weeklyRent * 52;
    return ((yearlyRent / propertyPrice) * 100).toFixed(1);
  },

  // 위치별 시세 조정
  adjustPriceByLocation: (basePrice, locationType) => {
    switch (locationType) {
      case 'window':
        return Math.floor(basePrice * 1.3); // 30% 프리미엄
      case 'front':
        return Math.floor(basePrice * 0.7); // 30% 할인
      default:
        return basePrice;
    }
  },

  // 거래세 계산 (3%)
  calculateTransactionFee: (price, feeRate = 0.03) => {
    return Math.floor(price * feeRate);
  },

  // 부동산세 계산 (시세의 1%/주)
  calculatePropertyTax: (propertyPrice, taxRate = 0.01) => {
    return Math.floor(propertyPrice * taxRate);
  }
};

export const formatCurrency = (amount) => {
  return `${amount.toLocaleString()}빌`;
};

export const getPropertyTypeInfo = (type) => {
  const typeInfo = {
    window: {
      icon: '🪟',
      name: '창가석',
      description: '채광이 좋고 조용한 자리',
      priceMultiplier: 1.3
    },
    front: {
      icon: '📝',
      name: '앞자리',
      description: '선생님과 가까운 자리',
      priceMultiplier: 0.7
    },
    normal: {
      icon: '🪑',
      name: '일반석',
      description: '표준적인 교실 자리',
      priceMultiplier: 1.0
    }
  };
  
  return typeInfo[type] || typeInfo.normal;
};
"@ | Out-File -FilePath "src\pages\realestate\utils\propertyCalculations.js" -Encoding UTF8

# 검증 함수들
Write-Host "✅ 검증 함수들 생성 중..." -ForegroundColor Cyan
@"
// 부동산 거래 검증 함수들

export const propertyValidations = {
  // 구매 가능 여부 검증
  canPurchaseProperty: (property, buyer, buyerCash) => {
    const errors = [];
    
    if (!property) {
      errors.push('매물 정보를 찾을 수 없습니다.');
      return { isValid: false, errors };
    }
    
    if (property.owner) {
      errors.push('이미 소유자가 있는 매물입니다.');
    }
    
    if (property.owner === buyer) {
      errors.push('이미 소유하고 있는 매물입니다.');
    }
    
    if (buyerCash < property.price) {
      errors.push('잔액이 부족합니다.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // 임대 가능 여부 검증
  canRentProperty: (property, tenant) => {
    const errors = [];
    
    if (!property) {
      errors.push('매물 정보를 찾을 수 없습니다.');
      return { isValid: false, errors };
    }
    
    if (!property.owner) {
      errors.push('소유자가 없는 매물은 임대할 수 없습니다.');
    }
    
    if (property.owner === tenant) {
      errors.push('본인 소유의 매물은 임대할 수 없습니다.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // 매물 등록 검증
  canListProperty: (property, seller) => {
    const errors = [];
    
    if (!property) {
      errors.push('매물 정보를 찾을 수 없습니다.');
      return { isValid: false, errors };
    }
    
    if (property.owner !== seller) {
      errors.push('본인 소유의 매물만 등록할 수 있습니다.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // 가격 유효성 검증
  isValidPrice: (price, minPrice = 10, maxPrice = 1000) => {
    return price >= minPrice && price <= maxPrice && Number.isInteger(price);
  },

  // 동일인 거래 제한 검증 (24시간)
  canTradeWithUser: (lastTradeTime, tradingPartner, currentUser) => {
    if (!lastTradeTime) return { isValid: true };
    
    const hoursSinceLastTrade = (Date.now() - lastTradeTime) / (1000 * 60 * 60);
    
    if (hoursSinceLastTrade < 24) {
      return {
        isValid: false,
        errors: [`${tradingPartner}님과는 ${Math.ceil(24 - hoursSinceLastTrade)}시간 후 거래 가능합니다.`]
      };
    }
    
    return { isValid: true };
  }
};
"@ | Out-File -FilePath "src\pages\realestate\utils\propertyValidations.js" -Encoding UTF8

# 추가 탭 컴포넌트들
Write-Host "📊 탭 컴포넌트들 생성 중..." -ForegroundColor Cyan

# MyPropertiesTab
@"
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
"@ | Out-File -FilePath "src\pages\realestate\tabs\MyPropertiesTab.jsx" -Encoding UTF8

# MarketTab
@"
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
                    {property.owner ? `(${property.owner})` : '(매물)'}
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
"@ | Out-File -FilePath "src\pages\realestate\tabs\MarketTab.jsx" -Encoding UTF8

# TransactionTab
@"
import React from 'react';
import { formatCurrency } from '../utils/propertyCalculations';

const TransactionTab = () => {
  // 임시 거래 내역 데이터 (나중에 Firebase에서 가져올 예정)
  const transactions = [
    {
      id: 'tx001',
      propertyId: 'A-1',
      type: 'purchase',
      price: 150,
      timestamp: '2024-01-15 14:30',
      description: 'A-1 창가석 구매'
    },
    {
      id: 'tx002',
      propertyId: 'B-3',
      type: 'sale',
      price: 110,
      timestamp: '2024-01-15 13:15',
      description: 'B-3 일반석 판매'
    },
    {
      id: 'tx003',
      propertyId: 'C-2',
      type: 'rent',
      price: 3,
      timestamp: '2024-01-15 12:00',
      description: 'C-2 일반석 임대료 지급'
    }
  ];

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'purchase': return '🏠';
      case 'sale': return '💰';
      case 'rent': return '🏠';
      default: return '📋';
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'purchase': return 'text-blue-600';
      case 'sale': return 'text-green-600';
      case 'rent': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case 'purchase': return '구매';
      case 'sale': return '판매';
      case 'rent': return '임대료';
      default: return '거래';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">📋 거래 내역</h3>
        <div className="text-sm text-gray-500">
          최근 거래만 표시됩니다
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-600">거래 내역이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div>
                    <div className="font-medium">{transaction.description}</div>
                    <div className="text-sm text-gray-600">
                      {transaction.timestamp}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${getTransactionColor(transaction.type)}`}>
                    {transaction.type === 'sale' ? '+' : '-'}{formatCurrency(transaction.price)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getTransactionLabel(transaction.type)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 거래 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {transactions.filter(t => t.type === 'purchase').length}
          </div>
          <div className="text-sm text-gray-600">구매 횟수</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {transactions.filter(t => t.type === 'sale').length}
          </div>
          <div className="text-sm text-gray-600">판매 횟수</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {transactions.filter(t => t.type === 'rent').length}
          </div>
          <div className="text-sm text-gray-600">임대 횟수</div>
        </div>
      </div>
    </div>
  );
};

export default TransactionTab;
"@ | Out-File -FilePath "src\pages\realestate\tabs\TransactionTab.jsx" -Encoding UTF8

# utils 폴더에 계산 함수들 추가
Write-Host "🧮 유틸리티 함수들 생성 중..." -ForegroundColor Cyan

$utilsContent = @"
// 부동산 관련 계산 함수들

export const propertyCalculations = {
  // 임대료 계산 (시세의 3%)
  calculateRent: (propertyPrice, rentRate = 0.03) => {
    return Math.floor(propertyPrice * rentRate);
  },

  // 연간 수익률 계산
  calculateYearlyReturn: (weeklyRent, propertyPrice) => {
    const yearlyRent = weeklyRent * 52;
    return ((yearlyRent / propertyPrice) * 100).toFixed(1);
  },

  // 위치별 시세 조정
  adjustPriceByLocation: (basePrice, locationType) => {
    switch (locationType) {
      case 'window':
        return Math.floor(basePrice * 1.3); // 30% 프리미엄
      case 'front':
        return Math.floor(basePrice * 0.7); // 30% 할인
      default:
        return basePrice;
    }
  },

  // 거래세 계산 (3%)
  calculateTransactionFee: (price, feeRate = 0.03) => {
    return Math.floor(price * feeRate);
  },

  // 부동산세 계산 (시세의 1%/주)
  calculatePropertyTax: (propertyPrice, taxRate = 0.01) => {
    return Math.floor(propertyPrice * taxRate);
  }
};

export const formatCurrency = (amount) => {
  return `${amount.toLocaleString()}빌`;
};

export const getPropertyTypeInfo = (type) => {
  const typeInfo = {
    window: {
      icon: '🪟',
      name: '창가석',
      description: '채광이 좋고 조용한 자리',
      priceMultiplier: 1.3
    },
    front: {
      icon: '📝',
      name: '앞자리',
      description: '선생님과 가까운 자리',
      priceMultiplier: 0.7
    },
    normal: {
      icon: '🪑',
      name: '일반석',
      description: '표준적인 교실 자리',
      priceMultiplier: 1.0
    }
  };
  
  return typeInfo[type] || typeInfo.normal;
};
"@

$utilsContent | Out-File -FilePath "src\pages\realestate\utils\propertyCalculations.js" -Encoding UTF8

# 완료 메시지에 유틸리티 추가
Write-Host ""
Write-Host "🎉 FinClass 부동산 시스템 파일 생성 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "생성된 파일들:" -ForegroundColor Yellow
Write-Host "📁 src/pages/realestate/" -ForegroundColor White
Write-Host "  📄 index.jsx (메인 페이지)" -ForegroundColor White
Write-Host "  📁 components/" -ForegroundColor White
Write-Host "    📄 PropertyGrid.jsx (부동산 배치도)" -ForegroundColor White
Write-Host "    📄 PropertyCard.jsx (매물 카드)" -ForegroundColor White
Write-Host "  📁 modals/" -ForegroundColor White
Write-Host "    📄 PropertyDetailModal.jsx (상세 정보 모달)" -ForegroundColor White
Write-Host "  📁 services/" -ForegroundColor White
Write-Host "    📄 propertyService.js (Firebase 연동)" -ForegroundColor White
Write-Host "  📁 hooks/" -ForegroundColor White
Write-Host "    📄 useProperties.js (데이터 관리 훅)" -ForegroundColor White
Write-Host "  📁 utils/" -ForegroundColor White
Write-Host "    📄 propertyCalculations.js (계산 함수들)" -ForegroundColor White
Write-Host "📁 src/routes/realestate/" -ForegroundColor White
Write-Host "  📄 index.js (라우트)" -ForegroundColor White
Write-Host ""
Write-Host "✅ 다음 설정이 필요합니다:" -ForegroundColor Green
Write-Host "1. permissions.js에 REALESTATE: 'page_realestate_view' 추가" -ForegroundColor White
Write-Host "2. App.jsx에 /realestate/* 라우트 추가" -ForegroundColor White
Write-Host "3. navConfig.js에 부동산 메뉴 추가" -ForegroundColor White
Write-Host ""
Write-Host "🚀 이제 /realestate 로 접속해서 확인해보세요!" -ForegroundColor Green