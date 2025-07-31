import React, { useState } from 'react';

// 건물 레벨별 정보
const BUILDING_LEVELS = {
    1: { icon: '🏠', name: '1단계', baseRentBonus: 1 }, // +1%p
    2: { icon: '🏢', name: '2단계', baseRentBonus: 2 }, // +2%p  
    3: { icon: '🏬', name: '3단계', baseRentBonus: 4 }, // +4%p
    4: { icon: '🏨', name: '4단계', baseRentBonus: 7 }, // +7%p
    5: { icon: '🏦', name: '5단계', baseRentBonus: 11 } // +11%p
};

// 레벨별 업그레이드 비용 (시세 대비 비율)
const UPGRADE_COST_RATES = {
    0: 0.3,  // 건물 없음 → Lv.1: 시세의 30%
    1: 0.4,  // Lv.1 → Lv.2: 시세의 40%
    2: 0.5,  // Lv.2 → Lv.3: 시세의 50%
    3: 0.7,  // Lv.3 → Lv.4: 시세의 70%
    4: 1.0   // Lv.4 → Lv.5: 시세의 100%
};

const BuildingConstructionModal = ({
    property,
    isOpen,
    onClose,
    onConstruct,
    userBalance = 0,
    baseRentRate = 5 // 기본 임대료 비율 (%)
}) => {
    const [showConfirmation, setShowConfirmation] = useState(false);

    if (!isOpen || !property) return null;

    const currentLevel = property.building?.level || 0;
    const maxLevel = 5;
    const canUpgrade = currentLevel < maxLevel;
    const nextLevel = currentLevel + 1;

    // 업그레이드 비용 계산
    const getUpgradeCost = () => {
        if (!canUpgrade) return 0;
        const rate = UPGRADE_COST_RATES[currentLevel];
        return Math.floor(property.price * rate);
    };

    // 레벨별 임대료 계산
    const calculateRent = (level) => {
        const buildingBonus = BUILDING_LEVELS[level]?.baseRentBonus || 0;
        const totalRate = baseRentRate + buildingBonus;
        return Math.floor(property.price * totalRate / 100);
    };

    // 현재 임대료와 업그레이드 후 임대료
    const currentRent = currentLevel > 0 ? calculateRent(currentLevel) : Math.floor(property.price * baseRentRate / 100);
    const upgradedRent = canUpgrade ? calculateRent(nextLevel) : currentRent;
    const rentIncrease = upgradedRent - currentRent;

    const upgradeCost = getUpgradeCost();
    const canAfford = userBalance >= upgradeCost;

    // 투자 회수 기간 계산 (주 단위)
    const getPaybackWeeks = () => {
        if (rentIncrease <= 0) return '∞';
        return Math.ceil(upgradeCost / rentIncrease);
    };

    // 연간 수익률 계산
    const getAnnualROI = () => {
        if (upgradeCost <= 0) return 0;
        const annualRentIncrease = rentIncrease * 52; // 1년 = 52주
        return ((annualRentIncrease / upgradeCost) * 100).toFixed(1);
    };

    const handleUpgrade = () => {
        if (!canUpgrade || !canAfford) return;
        setShowConfirmation(true);
    };

    const confirmUpgrade = () => {
        const buildingData = {
            level: nextLevel,
            totalInvestment: (property.building?.totalInvestment || 0) + upgradeCost,
            lastUpgraded: new Date().toISOString()
        };

        onConstruct(property.id, buildingData, upgradeCost);
        setShowConfirmation(false);
        onClose();
    };

    // 확인 대화상자
    if (showConfirmation) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                    <h3 className="text-lg font-bold mb-4">🏗️ 건물 업그레이드 확인</h3>
                    <div className="space-y-3 mb-6">
                        <p><strong>자리:</strong> {property.id}</p>
                        <p><strong>현재:</strong> {currentLevel === 0 ? '건물 없음' : `${BUILDING_LEVELS[currentLevel].icon} ${BUILDING_LEVELS[currentLevel].name}`}</p>
                        <p><strong>업그레이드:</strong> {BUILDING_LEVELS[nextLevel].icon} {BUILDING_LEVELS[nextLevel].name}</p>
                        <p><strong>비용:</strong> {upgradeCost}빌</p>
                        <p><strong>임대료 증가:</strong> {currentRent}빌/주 → {upgradedRent}빌/주 (+{rentIncrease}빌)</p>
                        <p><strong>현재 잔액:</strong> {userBalance}빌</p>
                        <p><strong>업그레이드 후 잔액:</strong> {userBalance - upgradeCost}빌</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowConfirmation(false)}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                        >
                            취소
                        </button>
                        <button
                            onClick={confirmUpgrade}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                        >
                            확인
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-bold">🏗️ 건물 관리</h2>
                        <p className="text-gray-600">
                            {property.id} 자리 (시세: {property.price}빌)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* 현재 건물 상태 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-bold mb-3">🏠 현재 상태</h3>
                    <div className="text-center">
                        <div className="text-4xl mb-2">
                            {currentLevel === 0 ? '🏗️' : BUILDING_LEVELS[currentLevel].icon}
                        </div>
                        <div className="font-medium">
                            {currentLevel === 0 ? '빈 땅' : `${BUILDING_LEVELS[currentLevel].name} 건물`}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                            현재 임대료: {currentRent}빌/주
                        </div>
                        {property.building?.totalInvestment && (
                            <div className="text-xs text-gray-500">
                                총 투자금액: {property.building.totalInvestment}빌
                            </div>
                        )}
                    </div>
                </div>

                {/* 업그레이드 정보 */}
                {canUpgrade ? (
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                        <h3 className="font-bold mb-3">⬆️ 업그레이드 정보</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                                <div className="text-2xl mb-1">{BUILDING_LEVELS[nextLevel].icon}</div>
                                <div className="text-sm font-medium">{BUILDING_LEVELS[nextLevel].name}</div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div><strong>비용:</strong> {upgradeCost}빌</div>
                                <div><strong>임대료:</strong> {upgradedRent}빌/주</div>
                                <div><strong>증가:</strong> +{rentIncrease}빌/주</div>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-white rounded border">
                            <div className="text-xs text-gray-600 space-y-1">
                                <div><strong>투자 회수 기간:</strong> {getPaybackWeeks()}주</div>
                                <div><strong>연간 수익률:</strong> {getAnnualROI()}%</div>
                                <div><strong>현재 잔액:</strong> {userBalance}빌</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-50 rounded-lg p-4 mb-6 text-center">
                        <div className="text-2xl mb-2">🏆</div>
                        <div className="font-medium text-yellow-800">최고 레벨 달성!</div>
                        <div className="text-sm text-yellow-600">더 이상 업그레이드할 수 없습니다</div>
                    </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400"
                    >
                        닫기
                    </button>
                    {canUpgrade && (
                        <button
                            onClick={handleUpgrade}
                            disabled={!canAfford}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium ${canAfford
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-400 text-white cursor-not-allowed'
                                }`}
                        >
                            {canAfford ?
                                `🏗️ 업그레이드 (${upgradeCost}빌)` :
                                '💰 잔액 부족'
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BuildingConstructionModal;