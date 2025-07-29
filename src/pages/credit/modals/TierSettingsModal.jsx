// src/pages/credit/TierSettingsModal.jsx
import { useState, useEffect } from "react";
import { InformationCircleIcon } from '@heroicons/react/24/outline';

import { MAIN_TIERS_CATEGORIES, HIGH_TIERS_CATEGORIES } from "../../../utils/tierUtils";

export default function TierSettingsModal({ criteria, onSave, onClose }) {
    const [startingScore, setStartingScore] = useState(0);
    const [subTierGaps, setSubTierGaps] = useState({});
    const [highTierGaps, setHighTierGaps] = useState({});

    useEffect(() => {
        const initialSubGaps = {};
        const initialHighGaps = {};

        MAIN_TIERS_CATEGORIES.forEach((tier) => {
            const tierStart = criteria.find((c) => c.tier === `${tier} 4`);
            const tierEnd = criteria.find((c) => c.tier === `${tier} 1`);
            if (tierStart && tierEnd) {
                const gap = Math.floor((tierEnd.minScore - tierStart.minScore) / 3);
                initialSubGaps[tier] = gap;
            }
        });

        for (let i = 0; i < HIGH_TIERS_CATEGORIES.length - 1; i++) {
            const current = criteria.find((c) => c.tier === HIGH_TIERS_CATEGORIES[i]);
            const next = criteria.find((c) => c.tier === HIGH_TIERS_CATEGORIES[i + 1]);
            if (current && next) {
                initialHighGaps[HIGH_TIERS_CATEGORIES[i]] = next.minScore - current.minScore;
            } else {
                initialHighGaps[HIGH_TIERS_CATEGORIES[i]] = 20;
            }
        }

        const ironStart = criteria.find((c) => c.tier === "아이언 4")?.minScore || 0;
        setStartingScore(ironStart);
        setSubTierGaps(initialSubGaps);
        setHighTierGaps(initialHighGaps);
    }, [criteria]);

    const handleGapChange = (tier, value) => {
        setSubTierGaps((prev) => ({ ...prev, [tier]: parseInt(value, 10) || 0 }));
    };

    const handleHighGapChange = (tier, value) => {
        setHighTierGaps((prev) => ({ ...prev, [tier]: parseInt(value, 10) || 0 }));
    };

    const generateTiers = () => {
        const generated = [];
        let current = startingScore;

        for (let mainTier of MAIN_TIERS_CATEGORIES) {
            const gap = subTierGaps[mainTier] ?? 10;
            for (let i = 4; i >= 1; i--) {
                generated.push({
                    tier: `${mainTier} ${i}`,
                    tierFullName: `${mainTier} ${i}`, // 추가
                    mainTierName: mainTier,           // 추가
                    minScore: current,
                    image: `/tiers/${mainTier} ${i}.png`,
                    color: getDefaultColorForTier(mainTier),
                });
                current += gap;
            }
        }

        for (let i = 0; i < HIGH_TIERS_CATEGORIES.length; i++) {
            const tier = HIGH_TIERS_CATEGORIES[i];
            generated.push({
                tier: tier,
                tierFullName: tier, // 추가
                mainTierName: tier, // 추가
                minScore: current,
                image: `/tiers/${tier}.png`,
                color: getDefaultColorForTier(tier),
            });
            if (i < HIGH_TIERS_CATEGORIES.length - 1) {
                const gap = highTierGaps[tier] ?? 20;
                current += gap;
            }
        }

        return generated;
    };

    const handleSave = () => {
        const tiers = generateTiers();
        onSave(tiers);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-[440px] max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-center mb-6 text-slate-800 flex items-center justify-center gap-2">
                    <InformationCircleIcon className="h-6 w-6 text-sky-500" />
                    신용등급 티어 설정
                </h2>

                <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                        <label className="font-medium text-slate-700">아이언 4 시작 점수</label>
                        <input
                            type="number"
                            value={startingScore}
                            onChange={(e) => setStartingScore(parseInt(e.target.value, 10) || 0)}
                            className="w-24 px-2 py-1 border border-slate-300 rounded-md text-right shadow-sm"
                        />
                    </div>

                    <hr className="my-3" />

                    {MAIN_TIERS_CATEGORIES.map((tier) => (
                        <div key={tier} className="flex items-center justify-between">
                            <label className="font-medium text-slate-700">{tier} 단계 간 점수 간격</label>
                            <input
                                type="number"
                                value={subTierGaps[tier] ?? 10}
                                onChange={(e) => handleGapChange(tier, e.target.value)}
                                className="w-24 px-2 py-1 border border-slate-300 rounded-md text-right shadow-sm"
                            />
                        </div>
                    ))}

                    <hr className="my-4" />

                    {HIGH_TIERS_CATEGORIES.slice(0, -1).map((tier) => (
                        <div key={tier} className="flex items-center justify-between">
                            <label className="font-medium text-slate-700">{tier} 이후 점수 간격</label>
                            <input
                                type="number"
                                value={highTierGaps[tier] ?? 20}
                                onChange={(e) => handleHighGapChange(tier, e.target.value)}
                                className="w-24 px-2 py-1 border border-slate-300 rounded-md text-right shadow-sm"
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end mt-6 space-x-2">
                    <button
                        onClick={onClose}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md shadow-sm"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-sm"
                    >
                        저장
                    </button>
                </div>
            </div>
        </div>
    );
}

// 기본 색상 맵핑 (원하는 색상 변경 가능)
function getDefaultColorForTier(tierName) {
    if (tierName.startsWith("아이언")) return "text-slate-500";
    if (tierName.startsWith("브론즈")) return "text-orange-600";
    if (tierName.startsWith("실버")) return "text-gray-400";
    if (tierName.startsWith("골드")) return "text-yellow-500";
    if (tierName.startsWith("에메랄드")) return "text-emerald-500";
    if (tierName.startsWith("다이아몬드")) return "text-cyan-500";
    if (tierName === "마스터") return "text-purple-600";
    if (tierName === "그랜드마스터") return "text-red-700";
    if (tierName === "챌린저") return "text-amber-400";
    return "text-slate-400";
}
