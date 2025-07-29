import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useUser } from '../../contexts/UserContext';
import { useFeedback } from '../../contexts/FeedbackContext'; // ⭐ 피드백 훅 사용
import { Button, InputField, Spinner, Alert, Badge, Card } from '../../components/ui';
import AppLayout from '../../components/layout/AppLayout';
import { Users, Save, SaveAll } from 'lucide-react';

const AdminAssetManager = () => {
    const { classId, classData } = useUser();
    const { showFeedback } = useFeedback(); // ⭐ 전역 피드백 함수 사용
    const currencyUnit = classData?.currencyUnit || '단위';

    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [dirtyMap, setDirtyMap] = useState({});

    const fetchStudents = useCallback(async () => {
        if (!classId) {
            setStudents([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const studentsCol = collection(db, `classes/${classId}/students`);
            const snapshot = await getDocs(studentsCol);

            let data = snapshot.docs.map(docSnap => ({
                uid: docSnap.id,
                name: docSnap.data().name || '이름 없음',
                role: docSnap.data().role || 'student',
                studentNumber: docSnap.data().studentNumber ?? null,
                assets: docSnap.data().assets || { cash: 0, stockValue: 0, deposit: 0, loan: 0 }
            }));

            // ⭐ 시작: 정렬 로직 수정 (교사 최상단, 나머지는 학번순)
            data.sort((a, b) => {
                if (a.role === 'teacher' && b.role !== 'teacher') return -1;
                if (a.role !== 'teacher' && b.role === 'teacher') return 1;
                return (a.studentNumber || 999) - (b.studentNumber || 999);
            });
            // ⭐ 끝: 정렬 로직 수정

            setStudents(data);
            setDirtyMap(Object.fromEntries(data.map(s => [s.uid, false])));

        } catch (error) {
            showFeedback('학생 정보를 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const handleAssetChange = (uid, field, value) => {
        const safeValue = Math.max(0, parseFloat(value) || 0);
        setStudents(prev => prev.map(s => s.uid === uid ? { ...s, assets: { ...s.assets, [field]: safeValue } } : s));
        setDirtyMap(prev => ({ ...prev, [uid]: true }));
    };

    const handleSave = async (uid) => {
        if (!classId) return;
        const studentToSave = students.find(s => s.uid === uid);
        if (!studentToSave) return;

        setIsSaving(true); // 개별 저장 시에도 로딩 상태 표시
        try {
            const studentRef = doc(db, `classes/${classId}/students/${uid}`);
            await updateDoc(studentRef, { assets: studentToSave.assets });
            setDirtyMap(prev => ({ ...prev, [uid]: false }));
            showFeedback(`${studentToSave.name} 학생의 자산이 저장되었습니다.`, 'success');
        } catch (error) {
            console.error("개별 자산 저장 오류:", error);
            showFeedback('개별 자산 저장 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAll = async () => {
        const dirtyUids = Object.keys(dirtyMap).filter(uid => dirtyMap[uid]);
        if (dirtyUids.length === 0) {
            showFeedback('저장할 변경사항이 없습니다.', 'info');
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            dirtyUids.forEach(uid => {
                const studentToSave = students.find(s => s.uid === uid);
                if (studentToSave) {
                    const studentRef = doc(db, `classes/${classId}/students/${uid}`);
                    batch.update(studentRef, { assets: studentToSave.assets });
                }
            });
            await batch.commit();

            const resetDirty = { ...dirtyMap };
            dirtyUids.forEach(uid => { resetDirty[uid] = false; });
            setDirtyMap(resetDirty);
            showFeedback('변경사항이 전체 저장되었습니다.', 'success');
        } catch (error) {
            console.error("전체 자산 저장 오류:", error);
            showFeedback('전체 저장 중 오류가 발생했습니다.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppLayout showDefaultHeader={false}>
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <Users className="h-8 w-8 text-indigo-500" /> 자산 일괄 관리
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">학생들의 현금 자산을 직접 수정하고 관리합니다. 주식/예금/대출은 각 시스템에서 자동으로 계산됩니다.</p>
                    </div>
                    <div>
                        <Button color="indigo" onClick={handleSaveAll} disabled={isSaving || Object.values(dirtyMap).every(v => !v)} isLoading={isSaving} icon={SaveAll}>
                            전체 변경사항 저장
                        </Button>
                    </div>
                </header>

                <Card>
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="text-center py-20"><Spinner /></div>
                        ) : (
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-100 text-left">
                                    <tr>
                                        <th className="p-3 font-semibold text-slate-600">학번</th>
                                        <th className="p-3 font-semibold text-slate-600">이름</th>
                                        <th className="p-3 font-semibold text-slate-600 text-right">현금 ({currencyUnit})</th>
                                        <th className="p-3 font-semibold text-slate-600 text-right">주식 ({currencyUnit})</th>
                                        <th className="p-3 font-semibold text-slate-600 text-right">예금 ({currencyUnit})</th>
                                        <th className="p-3 font-semibold text-slate-600 text-right">대출 ({currencyUnit})</th>
                                        <th className="p-3 font-semibold text-slate-600 text-center">개별 저장</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students.map(student => (
                                        <tr key={student.uid} className={`hover:bg-slate-50 ${dirtyMap[student.uid] ? 'bg-yellow-50' : ''}`}>
                                            {/* ⭐ 교사일 경우 학번 대신 '-' 표시 */}
                                            <td className="p-2 text-center text-slate-500">{student.role === 'teacher' ? '-' : student.studentNumber}</td>
                                            <td className="p-2 font-medium text-slate-800">
                                                {student.name}
                                                {student.role === 'teacher' && <Badge color="violet" size="sm" className="ml-2">교사</Badge>}
                                            </td>
                                            <td className="p-2">
                                                <InputField type="number" value={student.assets.cash} onChange={e => handleAssetChange(student.uid, 'cash', e.target.value)} className="w-28 text-right" min="0" />
                                            </td>
                                            <td className="p-3 text-right text-slate-500">{(student.assets.stockValue?.value ?? student.assets.stockValue ?? 0).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-500">{(student.assets.deposit || 0).toLocaleString()}</td>
                                            <td className="p-3 text-right text-slate-500">{(student.assets.loan || 0).toLocaleString()}</td>
                                            <td className="p-2 text-center">
                                                <Button size="sm" onClick={() => handleSave(student.uid)} disabled={!dirtyMap[student.uid] || isSaving} icon={Save}>
                                                    저장
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>
        </AppLayout>
    );
};

export default AdminAssetManager;