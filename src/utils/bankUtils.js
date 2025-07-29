// src/utils/bankUtils.js

/**
 * 예금 이자를 계산합니다 (소수점 이하 버림).
 * @param {number} principal - 원금
 * @param {number} ratePercentage - 기간 이율 (%)
 * @returns {number} 계산된 이자
 */
export const calculateSavingInterest = (principal, ratePercentage) => {
    if (typeof principal !== 'number' || typeof ratePercentage !== 'number' || isNaN(principal) || isNaN(ratePercentage)) {
        return 0;
    }
    // ratePercentage는 이미 해당 예금 기간 전체에 대한 이율입니다.
    return Math.floor(principal * (ratePercentage / 100));
};

/**
 * 대출 이자를 계산합니다 (최종 금액은 소수점 첫째 자리에서 반올림).
 * 두 번째 인자로 받는 rateForPeriodPercentage는 '연이율'이 아니라
 * 세 번째 인자로 받는 'days' (대출 기간) 전체에 대한 이율입니다.
 * * @param {number} principal - 원금
 * @param {number} rateForPeriodPercentage - 해당 대출 기간 전체에 대한 이율 (%)
 * @param {number} days - 대출 기간 (일) (참고용 및 유효성 검사용)
 * @returns {number} 계산된 이자 (반올림된 정수)
 */
export const calculateLoanInterest = (principal, rateForPeriodPercentage, days) => {
    // 입력값 유효성 검사
    if (typeof principal !== 'number' || typeof rateForPeriodPercentage !== 'number' || typeof days !== 'number' ||
        isNaN(principal) || isNaN(rateForPeriodPercentage) || isNaN(days)) {
        // console.warn("calculateLoanInterest: 유효하지 않은 입력값입니다.", { principal, rateForPeriodPercentage, days });
        return 0;
    }

    // 대출 기간이 0일 이하이면 이자 없음
    if (days <= 0) {
        return 0;
    }

    // rateForPeriodPercentage는 이미 'days' 기간 전체에 대한 이율이므로, 바로 적용합니다.
    const interest = principal * (rateForPeriodPercentage / 100);

    // 계산된 이자를 소수점 첫째 자리에서 반올림
    return Math.round(interest);
};