import { db } from '../../../firebase';
import {
    doc,
    collection,
    increment,
    serverTimestamp,
    runTransaction
    // getDoc, deleteDoc, writeBatch는 runTransaction 내부 또는 외부에서 필요시 사용
} from 'firebase/firestore';
// import { logStockBought, logStockSold, logExchangeActivity } from '../../../utils/logUtils'; // 이제 사용 안 함

import {
    TRANSACTION_TYPE_STOCK_BUY,
    TRANSACTION_TYPE_STOCK_SELL,
    TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD,
    TRANSACTION_TYPE_EXCHANGE_USD_TO_BIL
} from '../constants/transactionTypes'; // 경로 확인

/**
 * 📌 주식 매수 (단일 tradeHistory 기록, stockValue 업데이트는 Cloud Function에서 처리)
 */
export const executeBuyStock = async ({
    classId,
    userId,
    studentName, // 추가: tradeHistory에 기록할 학생 이름
    symbol,
    companyName,
    quantity,
    currentPriceUSD,
    tradeFeeRate,
    conversionRate,
    currencyUnit // 추가: humanReadableDescription 생성 시 필요할 수 있음
}) => {
    if (!classId || !userId || !studentName || !symbol || !companyName ||
        typeof quantity !== 'number' || quantity <= 0 ||
        typeof currentPriceUSD !== 'number' || currentPriceUSD < 0 ||
        typeof tradeFeeRate !== 'number' || tradeFeeRate < 0 ||
        typeof conversionRate !== 'number' || conversionRate <= 0 ||
        !currencyUnit
    ) {
        console.error("[executeBuyStock] 필수 파라미터 누락 또는 유효하지 않음:", { classId, userId, studentName, symbol, companyName, quantity, currentPriceUSD, tradeFeeRate, conversionRate, currencyUnit });
        return { success: false, message: "주식 매수를 위한 정보가 유효하지 않습니다." };
    }

    const itemCostUSD = currentPriceUSD * quantity;
    const feeUSD = itemCostUSD * tradeFeeRate;
    const totalCostUSDWithFee = itemCostUSD + feeUSD;
    const feeInClassCurrency = parseFloat((feeUSD * conversionRate).toFixed(2));

    const studentDocRef = doc(db, "classes", classId, "students", userId);
    const stockDocRef = doc(db, "classes", classId, "students", userId, "stockPortfolio", symbol.toUpperCase());
    // 컬렉션 이름 변경: transactions -> tradeHistory
    const newTradeRecordRef = doc(collection(db, "classes", classId, "students", userId, "tradeHistory"));

    try {
        const tradeRecordResult = await runTransaction(db, async (transaction) => {
            const studentSnap = await transaction.get(studentDocRef);
            if (!studentSnap.exists()) {
                throw new Error("학생 정보를 찾을 수 없습니다.");
            }
            const studentData = studentSnap.data();
            const currentBalanceUSD_from_tx = studentData.assets?.usdBalance ?? 0;

            if (currentBalanceUSD_from_tx < totalCostUSDWithFee) {
                throw new Error(`USD 잔액이 부족합니다. (필요: ${totalCostUSDWithFee.toFixed(2)}, 현재: ${currentBalanceUSD_from_tx.toFixed(2)})`);
            }

            const stockSnap = await transaction.get(stockDocRef);
            let existingQuantity = 0;
            let existingAvgPriceUSD = 0;
            if (stockSnap.exists()) {
                const data = stockSnap.data();
                existingQuantity = Number(data.quantity) || 0;
                existingAvgPriceUSD = Number(data.avgPriceUSD) || 0;
            }

            const newTotalQuantity = existingQuantity + quantity;
            const newAvgPriceUSD = newTotalQuantity > 0
                ? ((existingAvgPriceUSD * existingQuantity) + (currentPriceUSD * quantity)) / newTotalQuantity
                : currentPriceUSD;

            transaction.update(studentDocRef, { "assets.usdBalance": increment(-totalCostUSDWithFee) });
            transaction.set(stockDocRef, {
                symbol: symbol.toUpperCase(),
                name: companyName,
                quantity: newTotalQuantity,
                avgPriceUSD: parseFloat(newAvgPriceUSD.toFixed(4)),
                lastUpdated: serverTimestamp()
            }, { merge: true });

            const humanReadableDescription = `${studentName} 학생이 ${symbol.toUpperCase()} ${quantity}주를 주당 ${currentPriceUSD.toFixed(2)} USD에 매수 (총 비용: ${totalCostUSDWithFee.toFixed(2)} USD)`;

            transaction.set(newTradeRecordRef, {
                classId, // 컬렉션 그룹 쿼리를 위해 추가
                userId,  // 컬렉션 그룹 쿼리를 위해 추가
                studentName, // 표시용
                type: TRANSACTION_TYPE_STOCK_BUY, // 기존 상수 사용
                symbol: symbol.toUpperCase(),
                companyName,
                quantity,
                priceUSD: currentPriceUSD,
                itemCostUSD: parseFloat(itemCostUSD.toFixed(2)),
                feeUSD: parseFloat(feeUSD.toFixed(2)),
                feeInClassCurrency,
                totalCostUSD: parseFloat(totalCostUSDWithFee.toFixed(2)),
                humanReadableDescription, // 사람이 읽기 좋은 설명 추가
                timestamp: serverTimestamp(),
                actorUid: userId, // 기본적으로 학생 본인이지만, 교사 대행 기능이 있다면 구분 필요
                version: 1
            });
            return { tradeId: newTradeRecordRef.id };
        });

        // activityLog 관련 호출 모두 제거

        return { success: true, message: `${symbol.toUpperCase()} ${quantity}주 매수가 성공적으로 체결되었습니다.`, tradeId: tradeRecordResult.tradeId };

    } catch (error) {
        console.error(`[executeBuyStock] ${symbol} 매수 중 오류:`, error);
        if (error.message.startsWith("USD 잔액이 부족합니다") || error.message.includes("학생 정보를 찾을 수 없습니다")) {
            return { success: false, message: error.message };
        }
        return { success: false, message: `주식 매수 중 오류가 발생했습니다.` };
    }
};

/**
 * 📌 주식 매도 (단일 tradeHistory 기록, stockValue 업데이트는 Cloud Function에서 처리)
 */
export const executeSellStock = async ({
    classId,
    userId,
    studentName, // 추가
    symbol,
    companyName,
    quantityToSell,
    currentPriceUSD,
    tradeFeeRate,
    conversionRate,
    currencyUnit // 추가
}) => {
    if (!classId || !userId || !studentName || !symbol || !companyName ||
        typeof quantityToSell !== 'number' || quantityToSell <= 0 ||
        typeof currentPriceUSD !== 'number' || currentPriceUSD < 0 ||
        typeof tradeFeeRate !== 'number' || tradeFeeRate < 0 ||
        typeof conversionRate !== 'number' || conversionRate <= 0 ||
        !currencyUnit
    ) {
        console.error("[executeSellStock] 필수 파라미터 누락 또는 유효하지 않음:", { /* ... */ });
        return { success: false, message: "주식 매도를 위한 정보가 유효하지 않습니다." };
    }

    const itemValueUSD = currentPriceUSD * quantityToSell;
    const feeUSD = itemValueUSD * tradeFeeRate;
    const totalProceedsUSDAfterFee = itemValueUSD - feeUSD;
    const feeInClassCurrency = parseFloat((feeUSD * conversionRate).toFixed(2));

    const studentDocRef = doc(db, "classes", classId, "students", userId);
    const stockDocRef = doc(db, "classes", classId, "students", userId, "stockPortfolio", symbol.toUpperCase());
    const newTradeRecordRef = doc(collection(db, "classes", classId, "students", userId, "tradeHistory")); // 이름 변경

    try {
        const tradeRecordResult = await runTransaction(db, async (transaction) => {
            const stockSnap = await transaction.get(stockDocRef);
            if (!stockSnap.exists()) {
                throw new Error(`매도할 주식(${symbol.toUpperCase()})을 보유하고 있지 않습니다.`);
            }
            const currentPortfolioStock_from_tx = stockSnap.data();
            const actualQuantityOwned = Number(currentPortfolioStock_from_tx.quantity) || 0;

            if (actualQuantityOwned < quantityToSell) {
                throw new Error(`보유 수량이 매도 수량(${quantityToSell})보다 적습니다. (현재 보유: ${actualQuantityOwned})`);
            }

            transaction.update(studentDocRef, { "assets.usdBalance": increment(totalProceedsUSDAfterFee) });

            const newQuantity = actualQuantityOwned - quantityToSell;
            if (newQuantity <= 0) {
                transaction.delete(stockDocRef);
            } else {
                transaction.update(stockDocRef, {
                    quantity: newQuantity,
                    lastUpdated: serverTimestamp()
                });
            }

            const humanReadableDescription = `${studentName} 학생이 ${symbol.toUpperCase()} ${quantityToSell}주를 주당 ${currentPriceUSD.toFixed(2)} USD에 매도 (총 수익: ${totalProceedsUSDAfterFee.toFixed(2)} USD)`;

            transaction.set(newTradeRecordRef, {
                classId, // 컬렉션 그룹 쿼리용
                userId,  // 컬렉션 그룹 쿼리용
                studentName,
                type: TRANSACTION_TYPE_STOCK_SELL, // 기존 상수 사용
                symbol: symbol.toUpperCase(),
                companyName,
                quantity: quantityToSell,
                priceUSD: currentPriceUSD,
                itemAmountUSD: parseFloat(itemValueUSD.toFixed(2)),
                feeUSD: parseFloat(feeUSD.toFixed(2)),
                feeInClassCurrency,
                totalAmountUSD: parseFloat(totalProceedsUSDAfterFee.toFixed(2)),
                humanReadableDescription,
                timestamp: serverTimestamp(),
                actorUid: userId,
                version: 1
            });
            return { tradeId: newTradeRecordRef.id };
        });

        // activityLog 관련 호출 모두 제거

        return { success: true, message: `${symbol.toUpperCase()} ${quantityToSell}주 매도가 성공적으로 체결되었습니다.`, tradeId: tradeRecordResult.tradeId };

    } catch (error) {
        console.error(`[executeSellStock] ${symbol} 매도 중 오류:`, error);
        if (error.message.includes("보유하고 있지 않습니다") || error.message.includes("보유 수량이 매도 수량보다 적습니다")) {
            return { success: false, message: error.message };
        }
        return { success: false, message: `주식 매도 중 오류가 발생했습니다.` };
    }
};

/**
 * 📌 환전 거래 (단일 tradeHistory 기록)
 */
export const executeExchange = async ({
    classId,
    userId,
    studentName, // 추가
    direction,
    amount,
    calculatedResult,
    conversionRate,
    currencyUnit
}) => {
    if (!classId || !userId || !studentName || !direction ||
        typeof amount !== 'number' || amount <= 0 ||
        typeof conversionRate !== 'number' || conversionRate <= 0 ||
        !calculatedResult || typeof calculatedResult !== 'object' ||
        typeof calculatedResult.feeAmount !== 'number' ||
        typeof calculatedResult.inputAmount !== 'number' || calculatedResult.inputAmount !== amount ||
        typeof calculatedResult.finalReceivedAmount !== 'number' ||
        !currencyUnit
    ) {
        console.error("[executeExchange] 필수 파라미터 누락 또는 유효하지 않음:", { /* ... */ });
        return { success: false, message: "환전을 위한 정보가 유효하지 않습니다." };
    }

    const feeAmountOriginalCurrency = calculatedResult.feeAmount;
    const amountFrom = calculatedResult.inputAmount;
    const amountTo = calculatedResult.finalReceivedAmount;

    const studentDocRef = doc(db, "classes", classId, "students", userId);
    const newTradeRecordRef = doc(collection(db, "classes", classId, "students", userId, "tradeHistory")); // 이름 변경

    let finalSuccessMessage = ""; // 트랜잭션 외부에서 사용할 성공 메시지

    try {
        const tradeRecordResult = await runTransaction(db, async (transaction) => {
            const studentSnapshot = await transaction.get(studentDocRef);
            if (!studentSnapshot.exists()) {
                throw new Error("학생 정보를 찾을 수 없습니다.");
            }
            const studentData = studentSnapshot.data();
            const studentAssets = studentData.assets || {};

            let updateOperations = {};
            let transactionTypeConstant;
            let humanReadableDescBase;
            let currencyFromForDesc, currencyToForDesc;


            if (direction === TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD) {
                currencyFromForDesc = currencyUnit;
                currencyToForDesc = 'USD';
                const currentCash = studentAssets.cash ?? 0;
                if (amountFrom > currentCash) {
                    throw new Error(`${currencyUnit} 잔액이 부족합니다. (요청: ${amountFrom.toLocaleString()}, 현재: ${currentCash.toLocaleString()})`);
                }
                updateOperations["assets.cash"] = increment(-amountFrom);
                updateOperations["assets.usdBalance"] = increment(amountTo);
                transactionTypeConstant = TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD;
                humanReadableDescBase = `${currencyUnit}를 USD로 환전`;
                finalSuccessMessage = `${currencyUnit} → USD 환전 완료되었습니다.`;


            } else if (direction === TRANSACTION_TYPE_EXCHANGE_USD_TO_BIL) {
                currencyFromForDesc = 'USD';
                currencyToForDesc = currencyUnit;
                const currentUsdBalance = studentAssets.usdBalance ?? 0;
                if (amountFrom > currentUsdBalance) {
                    throw new Error(`USD 잔액이 부족합니다. (요청: ${amountFrom.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, 현재: ${currentUsdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
                }
                updateOperations["assets.usdBalance"] = increment(-amountFrom);
                updateOperations["assets.cash"] = increment(amountTo);
                transactionTypeConstant = TRANSACTION_TYPE_EXCHANGE_USD_TO_BIL;
                humanReadableDescBase = `USD를 ${currencyUnit}로 환전`;
                finalSuccessMessage = `USD → ${currencyUnit} 환전 완료되었습니다.`;

            } else {
                throw new Error("유효하지 않은 환전 방향입니다.");
            }

            const feeInClassCurrencyForTx = (direction === TRANSACTION_TYPE_EXCHANGE_BIL_TO_USD)
                ? parseFloat(feeAmountOriginalCurrency.toFixed(currencyUnit === 'USD' ? 2 : 0))
                : parseFloat((feeAmountOriginalCurrency * conversionRate).toFixed(currencyUnit === 'USD' ? 2 : 0));

            const humanReadableDescription = `${studentName} 학생이 ${amountFrom.toLocaleString(undefined, { maximumFractionDigits: (currencyFromForDesc === 'USD' ? 2 : 0) })} ${currencyFromForDesc}을(를) ${amountTo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyToForDesc}으로 환전했습니다. (수수료: ${feeAmountOriginalCurrency.toLocaleString(undefined, { minimumFractionDigits: (currencyFromForDesc === 'USD' ? 2 : 0), maximumFractionDigits: (currencyFromForDesc === 'USD' ? 2 : 0) })} ${currencyFromForDesc}, 환율: ${conversionRate})`;

            transaction.update(studentDocRef, updateOperations);
            transaction.set(newTradeRecordRef, {
                classId, // 컬렉션 그룹 쿼리용
                userId,  // 컬렉션 그룹 쿼리용
                studentName,
                type: transactionTypeConstant,
                direction: direction,
                amountFrom: parseFloat(amountFrom.toFixed(4)),
                amountTo: parseFloat(amountTo.toFixed(4)),
                feeAmountOriginalCurrency: parseFloat(feeAmountOriginalCurrency.toFixed(4)),
                feeInClassCurrency: feeInClassCurrencyForTx,
                exchangeRate: conversionRate,
                humanReadableDescription, // 사람이 읽기 좋은 설명 추가
                timestamp: serverTimestamp(),
                actorUid: userId,
                version: 1
            });
            return { tradeId: newTradeRecordRef.id };
        });

        // activityLog 관련 호출 모두 제거

        return { success: true, message: finalSuccessMessage, tradeId: tradeRecordResult.tradeId };

    } catch (error) {
        console.error(`[executeExchange] ${direction || '알 수 없는 방향'} 환전 중 오류:`, error);
        if (error.message.includes("잔액이 부족합니다") ||
            error.message.includes("학생 정보를 찾을 수 없습니다") ||
            error.message.includes("유효하지 않은 환전 방향입니다")) {
            return { success: false, message: error.message };
        }
        return { success: false, message: `환전 처리 중 예기치 않은 오류가 발생했습니다.` };
    }
};