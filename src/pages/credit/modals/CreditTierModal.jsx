import React from "react";

export default function CreditTierModal({
    isOpen,
    onClose,
    isAdmin = false,
    criteria = [],
}) {
    if (!isOpen) return null;

    const sortedCriteria = [...criteria].sort((a, b) => b.minScore - a.minScore);

    const formatRange = (index) => {
        const current = sortedCriteria[index];
        const next = sortedCriteria[index - 1];
        if (!next) return `${current.minScore?.toLocaleString() ?? 0}점 이상`;
        return `${current.minScore?.toLocaleString() ?? 0}점 ~ ${(next.minScore - 1)?.toLocaleString() ?? 0}점`;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-lg font-bold text-slate-800">
                        등급 기준표 (티어표)
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="닫기"
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-full transition"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="border border-slate-200 rounded-lg max-h-[60vh] overflow-y-auto text-sm">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2 text-left text-slate-600 font-medium">
                                    등급
                                </th>
                                <th className="px-4 py-2 text-right text-slate-600 font-medium">
                                    점수 범위
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedCriteria.map((tier, idx) => (
                                <tr key={tier.tier} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 font-medium text-slate-800 whitespace-nowrap">
                                        {tier.tier}
                                    </td>
                                    <td className="px-4 py-2 text-right text-slate-600 whitespace-nowrap">
                                        {formatRange(idx)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-5">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium py-2.5 rounded-lg transition"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}
