// src/pages/missions/components/RepeatMissionSettings.jsx

import React from 'react';

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

// 이 컴포넌트는 이제 상태를 직접 관리하지 않습니다.
// 모든 데이터와 함수를 props로 전달받아 화면만 그려줍니다.
export default function RepeatMissionSettings({
    repeatDays,      // 선택된 요일 배열 (예: ['월', '수'])
    timeWindows,     // 각 요일의 시간 객체 (예: {월: {start, end}})
    onDayToggle,     // 요일 버튼 클릭 시 호출될 함수
    onTimeChange,    // 시간 변경 시 호출될 함수
    onBulkApply,     // '일괄 적용' 클릭 시 호출될 함수
    bulkStart,       // 일괄 적용 시작 시간
    setBulkStart,    // 일괄 적용 시작 시간 변경 함수
    bulkEnd,         // 일괄 적용 종료 시간
    setBulkEnd       // 일괄 적용 종료 시간 변경 함수
}) {
    return (
        <div className="space-y-3">
            <div>
                <p className="text-sm font-medium text-gray-700 mb-2">반복 요일</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {WEEKDAYS.map(day => (
                        <button
                            key={day}
                            type="button"
                            onClick={() => onDayToggle(day)}
                            className={`px-2 py-1.5 text-sm rounded-md transition-colors ${repeatDays.includes(day)
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            {repeatDays.length > 0 && (
                <div className="pt-3 border-t">
                    <div className="flex items-end gap-2 mb-2">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-gray-700">일괄 적용 시간</label>
                            <div className="flex gap-2 mt-1">
                                <input type="time" value={bulkStart} onChange={e => setBulkStart(e.target.value)} className="w-full p-1 border rounded" />
                                <input type="time" value={bulkEnd} onChange={e => setBulkEnd(e.target.value)} className="w-full p-1 border rounded" />
                            </div>
                        </div>
                        <button type="button" onClick={onBulkApply} className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                            적용
                        </button>
                    </div>

                    <div className="space-y-2 mt-2">
                        {repeatDays.sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b)).map(day => (
                            <div key={day} className="flex items-center gap-2">
                                <span className="w-8 font-semibold">{day}:</span>
                                <input
                                    type="time"
                                    value={timeWindows[day]?.start || '00:00'}
                                    onChange={(e) => onTimeChange(day, 'start', e.target.value)}
                                    className="w-full p-1 border rounded"
                                />
                                <span>~</span>
                                <input
                                    type="time"
                                    value={timeWindows[day]?.end || '00:00'}
                                    onChange={(e) => onTimeChange(day, 'end', e.target.value)}
                                    className="w-full p-1 border rounded"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}