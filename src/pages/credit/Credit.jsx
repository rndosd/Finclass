// src/pages/credit/Credit.jsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    collection, getDocs, query, orderBy,
    doc, getDoc, setDoc
} from "firebase/firestore";
import { db } from "../../firebase";
import { useUser } from "../../contexts/UserContext";
import { useFeedback } from "../../contexts/FeedbackContext";

import CreditScoreModal from "./modals/CreditScoreModal";
import CreditLogModal from "./modals/CreditLogModal";
import TierSettingsModal from "./modals/TierSettingsModal";
import CreditTierModal from "./modals/CreditTierModal";
import { getTierInfoByScore } from "../../utils/tierUtils";

import {
    UsersRound, CheckSquare, Edit3,
    ListChecks, AlertTriangle, Settings
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";
import { Button, Spinner } from "../../components/ui";

export default function Credit() {
    const {
        classId, loading: userLoading,
        isTeacher
    } = useUser();
    const { showFeedback } = useFeedback();

    const [students, setStudents] = useState([]);
    const [selectedUids, setSelected] = useState([]);
    const [modalVisible, setModal] = useState(false);
    const [editTargets, setEditTargets] = useState([]);
    const [logTarget, setLogTarget] = useState(null);

    const [tierCriteria, setTierCriteria] = useState([]);
    const [showTierModal, setShowTier] = useState(false);
    const [showTierTable, setShowTable] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const selectAllCheckboxRef = useRef(null);

    const fetchStudents = useCallback(async () => {
        if (!classId) return;
        setIsLoading(true);
        try {
            const q = query(
                collection(db, `classes/${classId}/students`),
                orderBy("studentNumber", "asc")
            );
            const snap = await getDocs(q);
            let list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

            const teacher = list.find(s => s.role === "teacher");
            const others = list.filter(s => s.role !== "teacher");
            if (teacher) list = [teacher, ...others];

            setStudents(list);
        } catch (err) {
            console.error("학생 데이터 로딩 오류:", err);
            showFeedback("학생 데이터를 불러오지 못했습니다.", "error");
        }
        setIsLoading(false);
    }, [classId, showFeedback]);

    const fetchTierCriteria = useCallback(async () => {
        if (!classId) return;
        try {
            const ref = doc(db, `classes/${classId}/tierCriteria/default`);
            const snap = await getDoc(ref);
            setTierCriteria(snap.exists() ? snap.data().tiers || [] : []);
        } catch (err) {
            console.error("티어 기준 불러오기 오류:", err);
            showFeedback("티어 기준을 불러오지 못했습니다.", "error");
        }
    }, [classId, showFeedback]);

    useEffect(() => {
        if (!userLoading && classId) {
            fetchStudents();
            fetchTierCriteria();
        }
    }, [userLoading, classId, fetchStudents, fetchTierCriteria]);

    useEffect(() => {
        if (!selectAllCheckboxRef.current) return;
        const all = students.length, sel = selectedUids.length;
        selectAllCheckboxRef.current.checked = all > 0 && sel === all;
        selectAllCheckboxRef.current.indeterminate = sel > 0 && sel < all;
    }, [selectedUids, students]);

    const toggleSelection = uid =>
        setSelected(p => p.includes(uid) ? p.filter(i => i !== uid) : [...p, uid]);

    const handleSelectAll = () =>
        setSelected(selectedUids.length === students.length ? [] : students.map(s => s.uid));

    const openMultiEdit = () => {
        const targets = students.filter(s => selectedUids.includes(s.uid));
        if (!targets.length) return showFeedback("수정할 학생을 선택해주세요.", "warning");
        setEditTargets(targets); setModal(true);
    };
    const openSingleEdit = stu => { setEditTargets([stu]); setModal(true); };

    const handleScoreModalClose = (updatedStudents = []) => {
        setModal(false);
        setEditTargets([]);
        setSelected([]);

        if (updatedStudents.length > 0) {
            setStudents(prev =>
                prev.map(stu =>
                    updatedStudents.find(u => u.uid === stu.uid) || stu
                )
            );
        }
    };

    const handleLogModalClose = () => setLogTarget(null);

    const handleSaveTierCriteria = async (criteria) => {
        try {
            await setDoc(doc(db, `classes/${classId}/tierCriteria/default`), { tiers: criteria });
            setTierCriteria(criteria);
            showFeedback("티어 기준이 저장되었습니다.", "success");
            await fetchStudents();
        } catch (err) {
            console.error("티어 저장 오류:", err);
            showFeedback("티어 기준 저장에 실패했습니다.", "error");
        }
    };

    if (isLoading)
        return (
            <AppLayout title="신용점수 관리">
                <div className="p-6 text-center"><Spinner /> 학생 목록을 불러오는 중...</div>
            </AppLayout>
        );

    return (
        <AppLayout showDefaultHeader={false}>
            <div className="p-4 sm:p-6 lg:p-8">
                {/* 헤더 */}
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <UsersRound className="h-8 w-8 text-indigo-500" />신용점수 관리
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            학생들의 신용점수를 확인하고 점수를 부여·차감합니다.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => setShowTable(true)}>
                            📊 티어표 보기
                        </Button>
                        {isTeacher && (
                            <Button variant="secondary" onClick={() => setShowTier(true)}>
                                <Settings className="w-4 h-4 mr-1.5" />티어 설정
                            </Button>
                        )}
                    </div>
                </header>

                {/* 학생 테이블 */}
                <div className="bg-white shadow-xl rounded-lg">
                    <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            <h2 className="text-lg font-semibold text-slate-700">전체 학생 목록</h2>
                            {students.length > 0 && (
                                <Button
                                    onClick={openMultiEdit}
                                    disabled={!selectedUids.length}
                                    color="indigo"
                                >
                                    <CheckSquare size={16} className="mr-2" />
                                    선택 학생 점수 수정 ({selectedUids.length}명)
                                </Button>
                            )}
                        </div>

                        {students.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <AlertTriangle size={40} className="mx-auto mb-3 text-slate-400" />
                                <p className="font-medium">표시할 학생 데이터가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-slate-200 rounded-md">
                                <table className="w-full text-sm text-left text-slate-600">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="p-3 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    ref={selectAllCheckboxRef}
                                                    onChange={handleSelectAll}
                                                    className="form-checkbox h-5 w-5 text-indigo-600"
                                                />
                                            </th>
                                            <th className="p-3">학번</th>
                                            <th className="p-3">이름</th>
                                            <th className="p-3 text-right">신용 점수</th>
                                            <th className="p-3 text-center">등급</th>
                                            <th className="p-3 text-center">개별 수정</th>
                                            <th className="p-3 text-center">변동 이력</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {students.map(stu => {
                                            const tier = getTierInfoByScore(stu.creditScore, tierCriteria);
                                            return (
                                                <tr key={stu.uid} className="hover:bg-slate-50">
                                                    <td className="p-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUids.includes(stu.uid)}
                                                            onChange={() => toggleSelection(stu.uid)}
                                                            className="form-checkbox h-5 w-5 text-indigo-600"
                                                        />
                                                    </td>
                                                    <td className="p-3">{stu.studentNumber || "—"}</td>
                                                    <td className="p-3 font-medium text-slate-900">{stu.name}</td>
                                                    <td className="p-3 text-right font-semibold text-indigo-600">
                                                        {stu.creditScore ?? "—"}
                                                    </td>
                                                    <td className="p-3 text-center font-medium" style={{ color: tier?.tierColor }}>
                                                        {tier?.tierFullName || "—"}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Button variant="ghost" size="sm" onClick={() => openSingleEdit(stu)}>
                                                            <Edit3 size={16} />
                                                        </Button>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Button variant="ghost" size="sm" onClick={() => setLogTarget(stu)}>
                                                            <ListChecks size={16} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* 모달들 */}
                {modalVisible && (
                    <CreditScoreModal targets={editTargets} onClose={handleScoreModalClose} />
                )}
                {logTarget && (
                    <CreditLogModal student={logTarget} onClose={handleLogModalClose} />
                )}
                {showTierModal && (
                    <TierSettingsModal
                        criteria={tierCriteria}
                        onSave={handleSaveTierCriteria}
                        onClose={() => setShowTier(false)}
                    />
                )}
                {showTierTable && (
                    <CreditTierModal
                        isOpen={showTierTable}
                        onClose={() => setShowTable(false)}
                        criteria={tierCriteria}
                        isAdmin={isTeacher}
                    />
                )}
            </div>
        </AppLayout>
    );
}
