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
  return ${amount.toLocaleString()}빌;
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
