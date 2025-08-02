// src/pages/tax/components/MultiJobSelector.jsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

const MultiJobSelector = ({
    student,
    jobDefinitions,
    onChange,
    disabled = false,
    editedJobs = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedJobs, setSelectedJobs] = useState([]);
    const dropdownRef = useRef(null);

    // 현재 학생의 직업들 가져오기 (편집된 것 우선)
    const getCurrentJobs = () => {
        // 편집된 직업이 있으면 그것을 우선
        if (editedJobs.hasOwnProperty(student.uid)) {
            const edited = editedJobs[student.uid];
            return Array.isArray(edited) ? edited.filter(job => job !== "없음") :
                (edited && edited !== "없음" ? [edited] : []);
        }

        // 기존 직업 데이터 사용
        if (Array.isArray(student.jobs)) {
            return student.jobs.filter(job => job && job !== "없음");
        } else if (student.job && student.job !== "없음") {
            return [student.job];
        }
        return [];
    };

    // props가 변경될 때 상태 업데이트
    useEffect(() => {
        setSelectedJobs(getCurrentJobs());
    }, [student.uid, student.jobs, student.job, editedJobs]);

    // 외부 클릭 감지로 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleJobToggle = (jobName) => {
        if (disabled) return;

        let newJobs;
        if (selectedJobs.includes(jobName)) {
            // 직업 제거
            newJobs = selectedJobs.filter(job => job !== jobName);
        } else {
            // 직업 추가 (제한 없음)
            newJobs = [...selectedJobs, jobName];
        }

        setSelectedJobs(newJobs);

        // 부모 컴포넌트에 변경사항 전달
        const finalJobs = newJobs.length > 0 ? newJobs : ["없음"];
        onChange(student.uid, finalJobs);
    };

    const handleClearAll = () => {
        if (disabled) return;

        setSelectedJobs([]);
        onChange(student.uid, ["없음"]);
    };

    const handleRemoveJob = (jobToRemove, event) => {
        event.stopPropagation(); // 드롭다운이 열리지 않도록
        handleJobToggle(jobToRemove);
    };

    // 드롭다운 버튼 텍스트 생성
    const getDisplayText = () => {
        if (selectedJobs.length === 0) {
            return "직업을 선택하세요";
        } else if (selectedJobs.length === 1) {
            return selectedJobs[0];
        } else if (selectedJobs.length <= 3) {
            return selectedJobs.join(', ');
        } else {
            return `${selectedJobs.slice(0, 2).join(', ')} 외 ${selectedJobs.length - 2}개`;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 드롭다운 버튼 */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full p-2 text-left border rounded-md bg-white flex items-center justify-between transition-colors
                    ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'hover:border-gray-400 cursor-pointer'}
                    ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}
                    ${selectedJobs.length > 0 ? 'text-gray-900' : 'text-gray-500'}
                `}
            >
                <div className="flex-1 min-w-0">
                    {selectedJobs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {selectedJobs.slice(0, 2).map((job) => (
                                <span
                                    key={job}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-md"
                                >
                                    {job}
                                    <button
                                        onClick={(e) => handleRemoveJob(job, e)}
                                        className="hover:bg-blue-200 rounded-sm p-0.5"
                                        disabled={disabled}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                            {selectedJobs.length > 2 && (
                                <span className="text-xs text-gray-600 py-0.5">
                                    +{selectedJobs.length - 2}개 더
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm">{getDisplayText()}</span>
                    )}
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* 선택된 직업 수 표시 */}
            {selectedJobs.length > 0 && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {selectedJobs.length}
                </div>
            )}

            {/* 드롭다운 메뉴 */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {/* 헤더 */}
                    <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                                직업 선택 ({selectedJobs.length}개 선택됨)
                            </span>
                            {selectedJobs.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-red-600 hover:text-red-800"
                                >
                                    전체 해제
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 직업 목록 */}
                    <div className="py-1">
                        {/* "없음" 옵션 */}
                        <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedJobs.length === 0}
                                onChange={() => handleClearAll()}
                                className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={disabled}
                            />
                            <div className="flex-1">
                                <span className="text-sm text-gray-600">없음</span>
                            </div>
                        </label>

                        {/* 구분선 */}
                        <hr className="my-1 border-gray-200" />

                        {/* 직업 목록 */}
                        {jobDefinitions.map(job => {
                            const isSelected = selectedJobs.includes(job.name);

                            return (
                                <label
                                    key={job.id}
                                    className={`flex items-center px-3 py-2 cursor-pointer transition-colors
                                        ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                    `}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleJobToggle(job.name)}
                                        className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        disabled={disabled}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-gray-900'}`}>
                                                {job.name}
                                            </span>
                                            <span className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                                                {job.baseSalary.toLocaleString()}/주
                                            </span>
                                        </div>
                                        {job.description && (
                                            <div className="text-xs text-gray-500 mt-0.5 truncate">
                                                {job.description}
                                            </div>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <Check className="h-4 w-4 text-blue-600 ml-2" />
                                    )}
                                </label>
                            );
                        })}
                    </div>

                    {/* 푸터 (선택 요약) */}
                    {selectedJobs.length > 0 && (
                        <div className="sticky bottom-0 bg-gray-50 px-3 py-2 border-t border-gray-200">
                            <div className="text-xs text-gray-600">
                                <strong>선택된 직업:</strong>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {selectedJobs.map((job, index) => (
                                        <span key={job} className="inline-flex items-center">
                                            {job}
                                            {index < selectedJobs.length - 1 && <span className="mx-1">•</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}


        </div>
    );
};

export default MultiJobSelector;