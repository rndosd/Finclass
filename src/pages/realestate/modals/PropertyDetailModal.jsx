import React, { useState } from 'react';
import { useUser } from '../../../contexts/UserContext';
import BuildingConstructionModal from './BuildingConstructionModal';

const PropertyDetailModal = ({ property, isOpen, onClose, onPurchase, onRent, onBuildingUpgrade }) => {
  const { userData, updateUserData } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(null);
  const [showBuildingModal, setShowBuildingModal] = useState(false);

  if (!isOpen) return null;

  const isOwner = property?.owner === userData?.name;
  const hasBuilding = property?.building && property?.building.level > 0;

  // 기존 구매/임대 함수들...
  const handlePurchase = async () => {
    if (isProcessing) return;

    const userBalance = userData?.balance || 0;
    const propertyPrice = property?.price || 0;

    if (userBalance < propertyPrice) {
      alert(`잔액이 부족합니다. 현재 잔액: ${userBalance}빌, 필요 금액: ${propertyPrice}빌`);
      return;
    }

    setShowConfirmation('purchase');
  };

  const handleRent = async () => {
    if (isProcessing) return;

    const weeklyRent = getExpectedRent();
    const userBalance = userData?.balance || 0;

    if (userBalance < weeklyRent) {
      alert(`잔액이 부족합니다. 첫 주 임대료: ${weeklyRent}빌`);
      return;
    }

    setShowConfirmation('rent');
  };

  const confirmPurchase = async () => {
    setIsProcessing(true);
    try {
      const newBalance = userData.balance - property.price;
      await updateUserData({ balance: newBalance });

      if (onPurchase) {
        await onPurchase(property.id, userData.name, property.price);
      }

      alert(`🎉 ${property.id} 구매 완료!\n💰 ${property.price}빌이 차감되었습니다.`);
      onClose();
    } catch (error) {
      console.error('구매 실패:', error);
      alert('구매 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setShowConfirmation(null);
    }
  };

  const confirmRent = async () => {
    setIsProcessing(true);
    try {
      const weeklyRent = getExpectedRent();
      const newBalance = userData.balance - weeklyRent;
      await updateUserData({ balance: newBalance });

      if (onRent) {
        await onRent(property.id, userData.name, weeklyRent);
      }

      alert(`🏠 ${property.id} 1주간 임대 완료!\n💰 ${weeklyRent}빌이 차감되었습니다.`);
      onClose();
    } catch (error) {
      console.error('임대 실패:', error);
      alert('임대 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setShowConfirmation(null);
    }
  };

  // 건물 업그레이드 처리
  const handleBuildingUpgrade = async (propertyId, buildingData, cost) => {
    try {
      // 잔액 차감
      const newBalance = userData.balance - cost;
      await updateUserData({ balance: newBalance });

      // 건물 데이터 업데이트
      if (onBuildingUpgrade) {
        await onBuildingUpgrade(propertyId, buildingData);
      }

      alert(`🏗️ 건물 업그레이드 완료!\n💰 ${cost}빌이 차감되었습니다.`);
    } catch (error) {
      console.error('건물 업그레이드 실패:', error);
      alert('건물 업그레이드 처리 중 오류가 발생했습니다.');
    }
  };

  const getExpectedRent = () => {
    if (!property?.price) return 0;

    // 건물이 있으면 건물 포함 임대료, 없으면 기본 임대료
    if (hasBuilding) {
      const baseRate = 5; // 기본 5%
      const buildingBonus = getBuildingBonus(property.building.level);
      const totalRate = baseRate + buildingBonus;
      return Math.floor(property.price * totalRate / 100);
    }

    return Math.floor(property.price * 0.03); // 기본 3%
  };

  const getBuildingBonus = (level) => {
    const bonuses = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 11 };
    return bonuses[level] || 0;
  };

  const getBuildingIcon = (level) => {
    const icons = { 1: '🏠', 2: '🏢', 3: '🏬', 4: '🏨', 5: '🏦' };
    return icons[level] || '🏗️';
  };

  const getBuildingName = (level) => {
    const names = { 1: '1단계', 2: '2단계', 3: '3단계', 4: '4단계', 5: '5단계' };
    return names[level] || '건물';
  };

  const getLocationIcon = () => {
    if (property?.type === 'window') return '🪟';
    if (property?.type === 'front') return '📝';
    return '🪑';
  };

  const getLocationDescription = () => {
    switch (property?.type) {
      case 'window':
        return '창가석';
      case 'front':
        return '앞자리';
      default:
        return '일반석';
    }
  };

  // 확인 대화상자
  if (showConfirmation) {
    const isPurchase = showConfirmation === 'purchase';
    const amount = isPurchase ? property.price : getExpectedRent();
    const action = isPurchase ? '구매' : '임대';
    const period = isPurchase ? '' : ' (1주간)';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <h3 className="text-lg font-bold mb-4">거래 확인</h3>
          <div className="space-y-3 mb-6">
            <p><strong>좌석:</strong> {property.id}</p>
            <p><strong>거래 유형:</strong> {action}{period}</p>
            <p><strong>금액:</strong> {amount}빌</p>
            <p><strong>현재 잔액:</strong> {userData?.balance || 0}빌</p>
            <p><strong>거래 후 잔액:</strong> {(userData?.balance || 0) - amount}빌</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowConfirmation(null)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              disabled={isProcessing}
            >
              취소
            </button>
            <button
              onClick={isPurchase ? confirmPurchase : confirmRent}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              disabled={isProcessing}
            >
              {isProcessing ? '처리 중...' : '확인'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
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
            <div className="text-center border-b pb-4">
              <div className="text-4xl mb-2">
                {hasBuilding ? getBuildingIcon(property.building.level) : getLocationIcon()}
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {property?.id}
              </div>
              <div className="text-sm text-gray-600">
                {getLocationDescription()}
                {hasBuilding && (
                  <span className="ml-2 text-purple-600">
                    • {getBuildingName(property.building.level)} 건물
                  </span>
                )}
              </div>
            </div>

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
                <span className="text-gray-600">
                  {hasBuilding ? '현재 임대료' : '예상 임대료'}
                </span>
                <span className="font-medium text-orange-600">
                  {getExpectedRent()}빌/주
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">내 잔액</span>
                <span className="font-medium text-blue-600">
                  {userData?.balance || 0}빌
                </span>
              </div>
            </div>

            {/* 건물 정보 (소유자일 때만) */}
            {isOwner && hasBuilding && (
              <div className="bg-purple-50 rounded-lg p-3">
                <h4 className="font-medium text-purple-800 mb-2">🏗️ 내 건물 정보</h4>
                <div className="text-sm text-purple-700 space-y-1">
                  <div>레벨: {property.building.level}/5</div>
                  {property.building.totalInvestment && (
                    <div>총 투자: {property.building.totalInvestment}빌</div>
                  )}
                </div>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="space-y-3 pt-4">
              {/* 구매/임대 버튼 (비소유자) */}
              {!isOwner && !property?.owner && (
                <div className="flex space-x-3">
                  <button
                    onClick={handlePurchase}
                    disabled={isProcessing || (userData?.balance || 0) < property?.price}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    💰 구매하기
                  </button>
                  <button
                    onClick={handleRent}
                    disabled={isProcessing || (userData?.balance || 0) < getExpectedRent()}
                    className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    🏠 임대하기
                  </button>
                </div>
              )}

              {/* 건물 관리 버튼 (소유자) */}
              {isOwner && (
                <button
                  onClick={() => setShowBuildingModal(true)}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 font-medium"
                >
                  🏗️ 건물 관리
                </button>
              )}

              {/* 이미 소유자가 있는 경우 */}
              {!isOwner && property?.owner && (
                <div className="text-center py-3 px-4 bg-gray-100 rounded-lg text-gray-600">
                  이미 소유자가 있는 매물입니다
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                disabled={isProcessing}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 건물 관리 모달 */}
      <BuildingConstructionModal
        property={property}
        isOpen={showBuildingModal}
        onClose={() => setShowBuildingModal(false)}
        onConstruct={handleBuildingUpgrade}
        userBalance={userData?.balance || 0}
        baseRentRate={5} // 기본 임대료 비율 5%
      />
    </>
  );
};

export default PropertyDetailModal;