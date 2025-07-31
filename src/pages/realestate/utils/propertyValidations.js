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
        errors: [${tradingPartner}님과는 시간 후 거래 가능합니다.]
      };
    }
    
    return { isValid: true };
  }
};
