// src/pages/bank/bankadmin/modals/TierRateAdjustmentModal.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button, Modal, InputField, Alert, Spinner } from '../../../../components/ui';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const MAIN_TIERS_CATEGORIES = ["아이언", "브론즈", "실버", "골드", "에메랄드", "다이아몬드"];
const HIGH_TIERS_CATEGORIES = ["마스터", "그랜드마스터", "챌린저"];

export default function TierRateAdjustmentModal({ isOpen, onClose, classId }) {
    const [tierRateAdjustments, setTierRateAdjustments] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [definedTierNamesForClass, setDefinedTierNamesForClass] = useState([]);
    const [alertInfo, setAlertInfo] = useState({ open: false, message: '', type: 'info' });

    useEffect(() => {
        // 모달이 닫히거나 classId가 없으면 상태를 기본값으로 초기화
        if (!isOpen || !classId) {
            if (isOpen && !classId) {
                setAlertInfo({ open: true, type: 'error', message: '학급 정보(classId)가 없어 설정을 불러올 수 없습니다.' });
            }
            const defaultTierList = [...MAIN_TIERS_CATEGORIES, ...HIGH_TIERS_CATEGORIES].sort((a, b) =>
                [...MAIN_TIERS_CATEGORIES, ...HIGH_TIERS_CATEGORIES].indexOf(a) -
                [...MAIN_TIERS_CATEGORIES, ...HIGH_TIERS_CATEGORIES].indexOf(b)
            );
            setDefinedTierNamesForClass(defaultTierList);

            const defaultAdjustments = {};
            defaultTierList.forEach(tierName => {
                defaultAdjustments[tierName] = { depositRateModifier: '', loanRateModifier: '' };
            });
            setTierRateAdjustments(defaultAdjustments);
            setIsLoading(false); // 로딩 완료 처리
            return;
        }

        const fetchTierSettings = async () => {
            setIsLoading(true);
            setAlertInfo({ open: false, message: '' });

            // DB에서 티어 목록을 가져오지 못했을 경우 사용할 기본 티어 목록
            let initialDefaultTierList = [...MAIN_TIERS_CATEGORIES, ...HIGH_TIERS_CATEGORIES].sort((a, b) =>
                [...MAIN_TIERS_CATEGORIES, ...HIGH_TIERS_CATEGORIES].indexOf(a) -
                [...MAIN_TIERS_CATEGORIES, ...HIGH_TIERS_CATEGORIES].indexOf(b)
            );

            try {
                // 1. 학급에 실제 정의된 티어 목록 가져오기
                const tierCriteriaDocRef = doc(db, "classes", classId, "tierCriteria", "default");
                const tierCriteriaSnap = await getDoc(tierCriteriaDocRef);
                let actualTiersFromDB = [];
                let fetchedTierListForUI = [...initialDefaultTierList]; // 기본값으로 시작

                if (tierCriteriaSnap.exists() && Array.isArray(tierCriteriaSnap.data()?.tiers)) {
                    actualTiersFromDB = tierCriteriaSnap.data().tiers;
                }

                const uniqueMainTierNames = new Set();
                if (actualTiersFromDB.length > 0) {
                    actualTiersFromDB.forEach(tc => {
                        const fullTierName = tc.tier;
                        if (fullTierName) {
                            const mainTierMatch = MAIN_TIERS_CATEGORIES.find(mainCat => fullTierName.startsWith(mainCat));
                            if (mainTierMatch) uniqueMainTierNames.add(mainTierMatch);
                            else if (HIGH_TIERS_CATEGORIES.includes(fullTierName)) uniqueMainTierNames.add(fullTierName);
                        }
                    });
                    if (uniqueMainTierNames.size > 0) {
                        fetchedTierListForUI = Array.from(uniqueMainTierNames).sort((a, b) =>
                            [...MAIN_TIERS_CATEGORIES, ...HIGH_TIERS_CATEGORIES].indexOf(a) -
                            [...MAIN_TIERS_CATEGORIES, ...HIGH_TIERS_CATEGORIES].indexOf(b)
                        );
                    } else {
                        console.warn(`No main tier names extracted for class ${classId}. Using default tier list.`);
                    }
                } else {
                    console.warn(`No tier criteria defined for class ${classId}. Using default tier list.`);
                }
                setDefinedTierNamesForClass(fetchedTierListForUI); // 실제 사용될 티어 목록 설정

                // 2. 새로운 경로에서 티어별 이자율 보정 설정 불러오기
                const configDocRef = doc(db, "classes", classId, "config", "classSettings");
                const configSnap = await getDoc(configDocRef);
                const initialAdjustments = {};

                if (configSnap.exists()) {
                    const configData = configSnap.data();
                    const adjustmentsData = configData.bankTierRateAdjustments;

                    if (adjustmentsData && typeof adjustmentsData === 'object') {
                        fetchedTierListForUI.forEach(tierName => {
                            const tierSpecificAdjustments = adjustmentsData[tierName];
                            const depModValue = tierSpecificAdjustments?.depositRateModifier;
                            const loanModValue = tierSpecificAdjustments?.loanRateModifier;
                            initialAdjustments[tierName] = {
                                depositRateModifier: (depModValue !== undefined && depModValue !== null) ? depModValue.toString() : '',
                                loanRateModifier: (loanModValue !== undefined && loanModValue !== null) ? loanModValue.toString() : ''
                            };
                        });
                    } else {
                        // 'bankTierRateAdjustments' 필드가 없거나 객체가 아니면, 모든 티어에 대해 빈 값으로 초기화
                        fetchedTierListForUI.forEach(tierName => {
                            initialAdjustments[tierName] = { depositRateModifier: '', loanRateModifier: '' };
                        });
                    }
                } else {
                    // 설정 문서 자체가 없으면, 모든 티어에 대해 빈 값으로 초기화
                    fetchedTierListForUI.forEach(tierName => {
                        initialAdjustments[tierName] = { depositRateModifier: '', loanRateModifier: '' };
                    });
                }
                setTierRateAdjustments(initialAdjustments);

            } catch (error) {
                console.error("학급 티어 또는 보정 설정 로딩 오류:", error);
                setAlertInfo({ open: true, type: 'error', message: '학급 티어/보정 설정 로딩 실패.' });
                // 오류 발생 시, definedTierNamesForClass와 tierRateAdjustments를 안전한 기본값으로 설정
                setDefinedTierNamesForClass(initialDefaultTierList); // 위에서 정의한 기본 티어 목록 사용
                const defaultAdjustmentsOnError = {};
                initialDefaultTierList.forEach(tierName => {
                    defaultAdjustmentsOnError[tierName] = { depositRateModifier: '', loanRateModifier: '' };
                });
                setTierRateAdjustments(defaultAdjustmentsOnError);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTierSettings();
    }, [isOpen, classId]); // ✨ 의존성 배열에서 definedTierNamesForClass 제거

    const handleTierAdjustmentChange = (tierName, adjustmentType, value) => {
        setTierRateAdjustments(prev => ({
            ...prev,
            [tierName]: {
                ...(prev[tierName] || { depositRateModifier: '', loanRateModifier: '' }),
                [adjustmentType]: value,
            }
        }));
    };

    const saveTierRateAdjustmentsToDb = async () => {
        if (!classId) {
            setAlertInfo({ open: true, type: 'error', message: '학급 ID가 없어 설정을 저장할 수 없습니다.' });
            return;
        }

        const adjustmentsToSave = {};
        let validationError = null;
        for (const tierName of definedTierNamesForClass) {
            const currentTierAdjustments = tierRateAdjustments[tierName] || { depositRateModifier: '', loanRateModifier: '' };
            const depModStr = currentTierAdjustments.depositRateModifier;
            const loanModStr = currentTierAdjustments.loanRateModifier;

            const depModNum = depModStr === '' ? 0 : parseFloat(depModStr);
            const loanModNum = loanModStr === '' ? 0 : parseFloat(loanModStr);

            if ((depModStr !== '' && isNaN(depModNum)) || (loanModStr !== '' && isNaN(loanModNum))) {
                validationError = `${tierName} 등급의 보정치에 유효한 숫자를 입력해주세요. (예: 0.05, -0.1, 또는 비워두기)`;
                break;
            }
            adjustmentsToSave[tierName] = {
                depositRateModifier: depModNum,
                loanRateModifier: loanModNum,
            };
        }
        if (validationError) {
            setAlertInfo({ open: true, type: 'error', message: validationError });
            return;
        }
        if (!window.confirm(`'${classId}' 학급의 신용등급별 이자율 보정 설정을 저장하시겠습니까?`)) return;

        setIsLoading(true);
        try {
            const configDocRef = doc(db, "classes", classId, "config", "classSettings");
            await setDoc(configDocRef,
                { bankTierRateAdjustments: adjustmentsToSave },
                { merge: true }
            );

            setAlertInfo({ open: true, type: 'success', message: '이자율 보정 설정이 저장되었습니다.' });

            const newLocalStateWithStrings = {};
            for (const tierName in adjustmentsToSave) {
                const adj = adjustmentsToSave[tierName];
                newLocalStateWithStrings[tierName] = {
                    depositRateModifier: (adj.depositRateModifier !== undefined && adj.depositRateModifier !== null) ? adj.depositRateModifier.toString() : '',
                    loanRateModifier: (adj.loanRateModifier !== undefined && adj.loanRateModifier !== null) ? adj.loanRateModifier.toString() : ''
                };
            }
            setTierRateAdjustments(newLocalStateWithStrings);

        } catch (error) {
            console.error("이자율 보정 설정 저장 오류: ", error);
            setAlertInfo({ open: true, type: 'error', message: `이자율 보정 설정 저장 실패: ${error.message}` });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`🌟 ${classId || ''} 학급 신용등급별 이자율 보정`}>
            {alertInfo.open && <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo(prev => ({ ...prev, open: false }))} className="mb-4" />}
            {isLoading ? (
                <div className="flex justify-center py-10"><Spinner /><p className="ml-2">설정 로딩 중...</p></div>
            ) : !classId ? (
                <p className="text-slate-500 p-4 text-center">학급 정보가 없어 이자율 보정 설정을 표시할 수 없습니다.</p>
            ) : definedTierNamesForClass.length === 0 ? (
                <p className="text-slate-500 text-center py-4">이 학급에 설정된 신용등급(티어) 정보가 없습니다. 먼저 신용등급 기준을 설정해주세요 (TierSettingsModal).</p>
            ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {definedTierNamesForClass.map((tierName) => (
                        <div key={tierName} className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3 p-3 border rounded-lg bg-slate-50 items-center shadow-sm">
                            <h4 className="font-semibold text-slate-800 sm:col-span-1 text-sm md:text-base">{tierName} 등급</h4>
                            <InputField
                                id={`dtm-${tierName}-dep`}
                                label="7일당 예금 보정치 (%p)"
                                type="text"
                                value={tierRateAdjustments[tierName]?.depositRateModifier ?? ''}
                                onChange={(e) => handleTierAdjustmentChange(tierName, 'depositRateModifier', e.target.value)}
                                placeholder="예: 0.05 (주간 +0.05%p)"
                                className="text-xs"
                            />
                            <InputField
                                id={`dtm-${tierName}-loan`}
                                label="7일당 대출 보정치 (%p)"
                                type="text"
                                value={tierRateAdjustments[tierName]?.loanRateModifier ?? ''}
                                onChange={(e) => handleTierAdjustmentChange(tierName, 'loanRateModifier', e.target.value)}
                                placeholder="예: 0.1 (주간 +0.1%p)"
                                className="text-xs"
                            />
                        </div>
                    ))}
                    <div className="mt-8 pt-4 border-t text-center sticky bottom-0 bg-white py-4">
                        <Button onClick={saveTierRateAdjustmentsToDb} color="purple" size="lg" icon={ArrowDownTrayIcon} className="font-bold shadow-md">이자율 보정 설정 저장</Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}