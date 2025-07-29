// src/utils/tierUtils.js

export const MAIN_TIERS_CATEGORIES = [
    "아이언",
    "브론즈",
    "실버",
    "골드",
    "에메랄드",
    "다이아몬드"
];

export const HIGH_TIERS_CATEGORIES = [
    "마스터",
    "그랜드마스터",
    "챌린저"
];

// ⭐ 이미지 매핑
export const TIER_IMAGE_MAP = {
    "아이언": "iron.png",
    "브론즈": "bronze.png",
    "실버": "silver.png",
    "골드": "gold.png",
    "에메랄드": "emerald.png",
    "다이아몬드": "diamond.png",
    "마스터": "master.png",
    "그랜드마스터": "grandmaster.png",
    "챌린저": "challenger.png"
};

// 🏅 getTierInfoByScore 함수 (최종 안전 버전)
export function getTierInfoByScore(score, tierCriteria = []) {
    if (score === undefined || score === null || !Array.isArray(tierCriteria) || tierCriteria.length === 0) {
        return { tierFullName: '정보 없음', mainTierName: '정보 없음' };
    }

    const numericScore = parseInt(score, 10);
    if (isNaN(numericScore)) {
        return { tierFullName: '정보 없음', mainTierName: '정보 없음' };
    }

    // 🚀 아이언 4 시작 점수 찾기
    const iron4 = tierCriteria.find(t => t.tier === '아이언 4' || t.tierFullName === '아이언 4');
    const iron4MinScore = iron4 ? iron4.minScore : 0;

    // 🚀 시작 점수보다 낮으면 → 무조건 아이언 4 처리
    if (numericScore < iron4MinScore) {
        return { tierFullName: iron4?.tier ?? iron4?.tierFullName ?? '아이언 4', mainTierName: '아이언' };
    }

    const sortedCriteria = [...tierCriteria].sort((a, b) => b.minScore - a.minScore);

    for (const tier of sortedCriteria) {
        if (numericScore >= tier.minScore) {
            const mainTierName = tier.tier?.split(' ')[0] ?? tier.tierFullName?.split(' ')[0];
            return { tierFullName: tier.tier ?? tier.tierFullName, mainTierName };
        }
    }

    return { tierFullName: '정보 없음', mainTierName: '정보 없음' };
}
