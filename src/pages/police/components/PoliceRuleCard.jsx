import React from 'react';

const dangerStyleMap = {
    1: 'bg-gray-100 border-gray-400',
    2: 'bg-yellow-100 border-yellow-400',
    3: 'bg-red-100 border-red-500',
};

const PoliceRuleCard = ({ rule, onEdit, onDelete }) => {
    const {
        text,
        fineAmount,
        creditChange,
        notes,
        dangerLevel = 2,
    } = rule;

    const cardClass = dangerStyleMap[dangerLevel] || 'bg-white border-gray-300';

    return (
        <div className={`border-l-4 p-4 rounded shadow-sm ${cardClass}`}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg">{text}</h3>
                    <p className="text-sm mt-1">
                        🪙 벌금: {fineAmount} | 🧾 신용점수: {creditChange || '-'}
                    </p>
                    {notes && <p className="text-xs mt-1 text-gray-600">📝 {notes}</p>}
                    <p className="text-xs mt-1 text-gray-500">위험도: {dangerLevel} / 3</p>
                </div>
                <div className="flex gap-2">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="bg-yellow-400 hover:bg-yellow-500 px-2 py-1 rounded text-sm"
                        >
                            수정
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                        >
                            삭제
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PoliceRuleCard;
