import React, { useEffect, useState, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, functions } from "../../firebase";
import { useUser } from "../../contexts/UserContext";
import { useFeedback } from "../../contexts/FeedbackContext";

import AppLayout from "../../components/layout/AppLayout";
import { Button, Checkbox, Spinner, Alert } from "../../components/ui";

export default function DeleteStudents() {
    const { classId } = useUser();
    const { showFeedback } = useFeedback();

    const [students, setStudents] = useState([]);
    const [prevStudents, setPrevStudents] = useState([]);
    const [selectedUids, setSelectedUids] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [result, setResult] = useState(null);

    const fetchStudents = useCallback(async () => {
        if (!classId) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, "classes", classId, "students"),
                orderBy("studentNumber", "asc")
            );
            const snapshot = await getDocs(q);
            const list = snapshot.docs
                .map((doc) => ({ uid: doc.id, ...doc.data() }))
                .filter((s) => s.role === "student");

            setStudents(list);
        } catch (error) {
            console.error("학생 목록 로딩 실패:", error);
            showFeedback("학생 목록을 불러오는 중 오류가 발생했습니다.", "error");
        } finally {
            setLoading(false);
        }
    }, [classId, showFeedback]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const toggleSelect = (uid) => {
        setSelectedUids((prev) => {
            const newSelection = new Set(prev);
            newSelection.has(uid) ? newSelection.delete(uid) : newSelection.add(uid);
            return newSelection;
        });
    };

    const handleSelectAll = (e) => {
        const checked = e.target.checked;
        if (checked) {
            setSelectedUids(new Set(students.map((s) => s.uid)));
        } else {
            setSelectedUids(new Set());
        }
    };

    const handleDelete = async () => {
        if (
            !window.confirm(
                `정말로 선택한 ${selectedUids.size}명의 학생 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
            )
        )
            return;

        setIsDeleting(true);
        setResult(null);
        setPrevStudents(students); // ✅ 삭제 전 목록 저장

        try {
            const deleteFn = httpsCallable(functions, "deleteStudentAccounts");
            const res = await deleteFn({
                studentUids: Array.from(selectedUids),
                classId,
            });

            setResult(res.data.results);
            await fetchStudents(); // 삭제 후 새로고침
            setSelectedUids(new Set());

            showFeedback(
                `${res.data.results.filter((r) => r.status === "success").length}명의 학생이 삭제되었습니다.`,
                "success"
            );
        } catch (err) {
            console.error(err);
            showFeedback("삭제 중 오류가 발생했습니다.", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    const allSelected = students.length > 0 && selectedUids.size === students.length;

    if (loading)
        return (
            <AppLayout>
                <div className="p-6 text-center">
                    <Spinner message="학생 목록을 불러오는 중..." />
                </div>
            </AppLayout>
        );

    return (
        <AppLayout>
            <div className="p-6">
                <h2 className="text-xl font-bold mb-4">🗑️ 학생 계정 삭제</h2>

                {/* 전체 선택 및 삭제 버튼 */}
                <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                        <Checkbox
                            id="select-all-students"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            disabled={students.length === 0}
                        />
                        <label htmlFor="select-all-students" className="ml-2 text-sm font-medium text-slate-700">
                            전체 선택 ({selectedUids.size}/{students.length})
                        </label>
                    </div>
                    <Button
                        variant="destructive"
                        disabled={selectedUids.size === 0 || isDeleting}
                        onClick={handleDelete}
                        isLoading={isDeleting}
                    >
                        {isDeleting ? "삭제 중..." : `선택한 ${selectedUids.size}명 계정 삭제`}
                    </Button>
                </div>

                {/* 학생 목록 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {students.map((student) => (
                        <div
                            key={student.uid}
                            className={`border rounded-lg p-3 flex items-center gap-3 transition-colors ${selectedUids.has(student.uid) ? "bg-indigo-50 border-indigo-200" : "bg-white"
                                }`}
                        >
                            <Checkbox
                                id={`student-checkbox-${student.uid}`}
                                checked={selectedUids.has(student.uid)}
                                onChange={() => toggleSelect(student.uid)}
                            />
                            <label htmlFor={`student-checkbox-${student.uid}`} className="flex-grow cursor-pointer">
                                <div className="font-semibold text-slate-800">
                                    {student.studentNumber}번 {student.name}
                                </div>
                                <div className="text-sm text-slate-500">{student.email}</div>
                            </label>
                        </div>
                    ))}
                </div>

                {/* 삭제 결과 출력 */}
                {result && (
                    <div className="mt-6 space-y-2">
                        <h3 className="font-semibold text-slate-700">✅ 삭제 결과</h3>
                        {result.map((r) => {
                            const student = prevStudents.find((s) => s.uid === r.uid) || {
                                name: "알 수 없는 학생",
                                email: r.uid,
                            };
                            const label = `${student.name} (${student.email})`;
                            return (
                                <Alert
                                    key={r.uid}
                                    variant={r.status === "success" ? "success" : "destructive"}
                                    message={`${label}: ${r.status === "success" ? "성공" : `실패 (${r.message})`}`}
                                    className="text-xs"
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
