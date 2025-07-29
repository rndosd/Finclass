// src/pages/missions/components/MissionModal.jsx

import React, { useState, useEffect } from 'react';
import {
    Modal, Button, InputField, Textarea, Checkbox,
} from '../../../components/ui';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { addMission } from '../services/missionService';
import StudentSelector from '../../../components/ui/StudentSelector';
import RepeatMissionSettings from '../components/RepeatMissionSettings';
import { generateRepeatDates } from '../utils/generateRepeatDates';
import { BookOpen, CalendarClock, Award } from 'lucide-react';

// --- [새로운 컴포넌트] 탭 버튼 ---
const TabButton = ({ isActive, onClick, icon: Icon, children }) => {
    const baseClasses = "flex items-center justify-center px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors";
    const activeClasses = "border-indigo-500 text-indigo-600 bg-white";
    const inactiveClasses = "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

    return (
        <button
            type="button"
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            onClick={onClick}
        >
            <Icon className="w-4 h-4 mr-2" />
            {children}
        </button>
    );
};


const LabeledCheckbox = ({ id, checked, onChange, label, disabled = false }) => (
    <div className="flex items-center">
        <Checkbox id={id} checked={checked} onChange={onChange} disabled={disabled} />
        <label htmlFor={id} className={`ml-2 text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
            {label}
        </label>
    </div>
);

export default function MissionModal({ isOpen, onClose, onSuccess }) {
    /* ────────────────────────────── 기본 데이터 ────────────────────────────── */
    const { classId, userData, classData } = useUser();
    const { showFeedback } = useFeedback();
    const currencyUnit = classData?.currencyUnit || '코인';

    /* ────────────────────────────── 상태값 (데이터 관련) ────────────────────────────── */
    // (이 부분은 변경 없음)
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [creditReward, setCreditReward] = useState('');
    const [cashReward, setCashReward] = useState('');
    const [useRepeatDays, setUseRepeatDays] = useState(false);
    const [repeatDays, setRepeatDays] = useState([]);
    const [timeWindows, setTimeWindows] = useState({});
    const [repeatSchedule, setRepeatSchedule] = useState({});
    const [repeatStartDate, setRepeatStartDate] = useState('');
    const [repeatEndDate, setRepeatEndDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [noDueDate, setNoDueDate] = useState(false);
    const [bulkStart, setBulkStart] = useState('08:00');
    const [bulkEnd, setBulkEnd] = useState('12:00');
    const [targetUids, setTargetUids] = useState([]);
    const [autoApprove, setAutoApprove] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /* ────────────────── [새로운 상태값] UI 관련 ────────────────── */
    const [activeTab, setActiveTab] = useState('basic');

    // [수정] repeatDays 또는 timeWindows가 변경될 때마다 최종 데이터인 repeatSchedule을 업데이트
    useEffect(() => {
        const newSchedule = {};
        repeatDays.forEach(day => {
            if (timeWindows[day]) {
                newSchedule[day] = timeWindows[day];
            }
        });
        setRepeatSchedule(newSchedule);
    }, [repeatDays, timeWindows]);

    /* ────────────────────────────── 초기화 ────────────────────────────── */
    useEffect(() => {
        if (!isOpen) {
            // 모든 데이터 상태 초기화
            setTitle(''); setDescription('');
            setCreditReward(''); setCashReward('');
            setUseRepeatDays(false); setRepeatSchedule({});
            setRepeatStartDate(''); setRepeatEndDate('');
            setDueDate(''); setNoDueDate(false);
            setBulkStart('08:00'); setBulkEnd('12:00');
            setTargetUids([]); setAutoApprove(false);
            setRepeatDays([]);
            setTimeWindows({});
            setRepeatSchedule({});
            // UI 상태 초기화
            setActiveTab('basic');
        }
    }, [isOpen]);


    /* ───── [수정] 반복 설정 상태를 변경하는 핸들러 함수들 ───── */
    const handleDayToggle = (day) => {
        setRepeatDays(prevDays => {
            const newDays = new Set(prevDays);
            if (newDays.has(day)) {
                newDays.delete(day);
            } else {
                newDays.add(day);
            }
            return Array.from(newDays);
        });

        // 요일이 새로 추가되면 기본 시간 설정
        if (!timeWindows[day]) {
            setTimeWindows(prev => ({
                ...prev,
                [day]: { start: bulkStart, end: bulkEnd }
            }));
        }
    };

    const handleTimeChange = (day, type, value) => {
        setTimeWindows(prev => ({
            ...prev,
            [day]: { ...prev[day], [type]: value }
        }));
    };

    const handleBulkApply = () => {
        const newTimeWindows = { ...timeWindows };
        repeatDays.forEach(day => {
            newTimeWindows[day] = { start: bulkStart, end: bulkEnd };
        });
        setTimeWindows(newTimeWindows);
    };


    /* ────────────────────────────── 제출 ────────────────────────────── */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim()) return showFeedback('제목을 입력해주세요.', 'warning');
        if (!classId) return showFeedback('classId를 불러오지 못했습니다.', 'error');

        /* 유효성 검사 */
        if (useRepeatDays) {
            if (!repeatStartDate || !repeatEndDate)
                return showFeedback('반복 과제 기간을 모두 입력해주세요.', 'warning');
            if (Object.keys(repeatSchedule).length === 0)
                return showFeedback('반복 요일/시간을 설정해주세요.', 'warning');
        } else {
            // <--- [수정] "마감일 없음"이 아닐 때만 dueDate를 검사
            if (!noDueDate && !dueDate) {
                return showFeedback('마감일을 입력하거나 "마감일 없음"을 체크해주세요.', 'warning');
            }
        }

        const baseData = {
            classId, title, description,
            rewards: {
                credit: Number(creditReward) || 0,
                currency: Number(cashReward) || 0,
            },
            createdBy: userData?.uid ?? 'unknown',
            createdByName: userData?.name ?? 'unknown',
            autoApprove,
            ...(targetUids.length && { targetStudentUids: targetUids }),
        };

        setIsSubmitting(true);

        try {
            if (useRepeatDays) {
                const dates = generateRepeatDates(repeatStartDate, repeatEndDate, repeatSchedule);
                for (const d of dates) {
                    const weekdayKor = '일월화수목금토'[d.getDay()];
                    await addMission({
                        ...baseData,
                        title: `${title} (${d.toLocaleDateString('ko-KR')})`,
                        repeatSchedule: { [weekdayKor]: repeatSchedule[weekdayKor] },
                        startDate: d,
                        endDate: d,
                    });
                }
                showFeedback(`${dates.length}개의 반복 미션이 생성되었습니다!`, 'success');
            } else {
                /* ───── [수정] 단일 미션 생성 로직 ───── */
                const missionData = {
                    ...baseData,
                    startDate: new Date(), // 생성 시점부터 바로 시작
                };

                // "마감일 없음"이 아닐 때만 endDate를 추가
                if (!noDueDate && dueDate) {
                    const endDate = new Date(dueDate);
                    // 마감일의 가장 마지막 시간으로 설정
                    endDate.setHours(23, 59, 59, 999);
                    missionData.endDate = endDate;
                }

                await addMission(missionData);
                showFeedback('도전과제가 등록되었습니다!', 'success');
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('🔥 등록 실패:', err);
            showFeedback(`오류: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ────────────────────────────── UI 렌더링 ────────────────────────────── */
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="새로운 도전과제" size="2xl">
            <form onSubmit={handleSubmit}>
                {/* --- 탭 네비게이션 --- */}
                <div className="border-b border-gray-200 bg-gray-50 -mx-6 px-6">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <TabButton isActive={activeTab === 'basic'} onClick={() => setActiveTab('basic')} icon={BookOpen}>기본 정보</TabButton>
                        <TabButton isActive={activeTab === 'period'} onClick={() => setActiveTab('period')} icon={CalendarClock}>기간 및 반복</TabButton>
                        <TabButton isActive={activeTab === 'rewards'} onClick={() => setActiveTab('rewards')} icon={Award}>보상 및 대상</TabButton>
                    </nav>
                </div>

                {/* --- 탭 컨텐츠 --- */}
                <div className="py-6 space-y-6 max-h-[60vh] overflow-y-auto px-1">
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900">기본 정보</h3>
                            <InputField label="제목" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="예: 매일 독서 30분" />
                            <Textarea label="설명" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="학생들에게 보여질 도전과제에 대한 상세 설명입니다." />
                        </div>
                    )}

                    {activeTab === 'period' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900">기간 및 반복 설정</h3>
                            <LabeledCheckbox
                                id="repeat-check"
                                checked={useRepeatDays}
                                onChange={(e) => setUseRepeatDays(e.target.checked)}
                                label="반복 과제"
                            />
                            {useRepeatDays ? (
                                <div className="pl-6 border-l-2 ml-2 space-y-4">
                                    <RepeatMissionSettings
                                        repeatDays={repeatDays}
                                        timeWindows={timeWindows}
                                        onDayToggle={handleDayToggle}
                                        onTimeChange={handleTimeChange}
                                        onBulkApply={handleBulkApply}
                                        bulkStart={bulkStart}
                                        setBulkStart={setBulkStart}
                                        bulkEnd={bulkEnd}
                                        setBulkEnd={setBulkEnd}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="반복 시작일" type="date" value={repeatStartDate} onChange={(e) => setRepeatStartDate(e.target.value)} />
                                        <InputField label="반복 종료일" type="date" value={repeatEndDate} onChange={(e) => setRepeatEndDate(e.target.value)} />
                                    </div>
                                </div>
                            ) : (
                                <div className="pl-6 border-l-2 ml-2 space-y-4">
                                    <LabeledCheckbox
                                        id="no-due-date"
                                        checked={noDueDate}
                                        onChange={(e) => setNoDueDate(e.target.checked)}
                                        label="마감일 없음 (상시 과제)"
                                    />
                                    {!noDueDate && (
                                        <InputField label="마감 기한" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'rewards' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">보상 설정</h3>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <InputField label="신용점수 보상" type="number" value={creditReward} onChange={(e) => setCreditReward(e.target.value)} />
                                    <InputField label={`${currencyUnit} 보상`} type="number" value={cashReward} onChange={(e) => setCashReward(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">부가 설정</h3>
                                <div className="mt-2 space-y-4">
                                    <div>
                                        <LabeledCheckbox
                                            id="auto-approve"
                                            checked={autoApprove}
                                            onChange={(e) => setAutoApprove(e.target.checked)}
                                            label="제출 즉시 자동 승인"
                                        />
                                        <p className="text-xs text-slate-500 ml-6">체크 시, 교사 승인 없이 즉시 보상이 지급됩니다.</p>
                                    </div>
                                    <StudentSelector label="특정 학생 지정 (미선택 시 전체)" selectedUids={targetUids} onChange={setTargetUids} classId={classId} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- 하단 버튼 --- */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>취소</Button>
                    <Button type="submit" color="indigo" isLoading={isSubmitting} disabled={isSubmitting}>도전과제 등록</Button>
                </div>
            </form>
        </Modal>
    );
}