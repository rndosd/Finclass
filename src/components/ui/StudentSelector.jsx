// src/components/ui/StudentSelector.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Checkbox, Spinner } from '../ui';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';

const StudentSelector = ({
    label,
    selectedUids = [],
    onChange,
    multiple = true,
}) => {
    const { classId } = useUser();
    const [allStudents, setAllStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const fetchStudents = useCallback(async () => {
        if (!classId) {
            console.warn("❗ classId가 없습니다. 학생 목록을 불러올 수 없습니다.");
            setAllStudents([]);
            return;
        }
        setIsLoading(true);
        try {
            const q = query(
                collection(db, `classes/${classId}/students`),
                where('role', '==', 'student'),
                orderBy('studentNumber')
            );
            const snapshot = await getDocs(q);
            const studentData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            setAllStudents(studentData);
        } catch (error) {
            console.error("❌ 학생 목록 로딩 실패:", error);
        } finally {
            setIsLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const handleToggleStudent = (uid) => {
        if (multiple) {
            const newSelection = new Set(selectedUids);
            if (newSelection.has(uid)) newSelection.delete(uid);
            else newSelection.add(uid);
            onChange(Array.from(newSelection));
        } else {
            onChange([uid]);
        }
    };

    const handleToggleSelectAll = () => {
        if (selectedUids.length === allStudents.length) {
            onChange([]);
        } else {
            onChange(allStudents.map(s => s.uid));
        }
    };

    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div className="border rounded-lg bg-slate-50">
                <button
                    type="button"
                    onClick={() => setIsExpanded(p => !p)}
                    className="w-full flex justify-between items-center p-3 text-sm"
                >
                    <span className="font-semibold text-slate-700">
                        {selectedUids.length > 0 ? `${selectedUids.length}명 선택됨` : "학생 선택..."}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isExpanded && (
                    <div className="p-3 border-t max-h-48 overflow-y-auto space-y-2">
                        {isLoading ? (
                            <Spinner size="sm" />
                        ) : allStudents.length > 0 ? (
                            <>
                                {multiple && (
                                    <div className="flex items-center pb-2 border-b">
                                        <Checkbox
                                            id="select-all"
                                            checked={selectedUids.length === allStudents.length}
                                            onChange={(e) => handleToggleSelectAll()}
                                        />
                                        <label htmlFor="select-all" className="ml-2 text-sm font-medium">
                                            전체 선택
                                        </label>
                                    </div>
                                )}
                                {allStudents.map(student => (
                                    <div key={student.uid} className="flex items-center">
                                        <Checkbox
                                            id={`student-${student.uid}`}
                                            checked={selectedUids.includes(student.uid)}
                                            onChange={(e) => handleToggleStudent(student.uid)}
                                        />
                                        <label htmlFor={`student-${student.uid}`} className="ml-2 text-sm text-slate-800 cursor-pointer">
                                            {student.studentNumber}번 {student.name}
                                        </label>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p className="text-xs text-center text-slate-500 py-4">선택할 수 있는 학생이 없습니다.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentSelector;
