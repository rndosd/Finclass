import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, writeBatch, query, orderBy, updateDoc } from 'firebase/firestore';
import { useUser } from '../../contexts/UserContext';
import { useFeedback } from '../../contexts/FeedbackContext';

// UI 컴포넌트
import AppLayout from '../../components/layout/AppLayout';
import { Card, Button, Checkbox, Spinner, Alert, Badge } from '../../components/ui';
import { KeyRound, ShieldAlert, Pencil } from 'lucide-react';

// 설정 및 모달 컴포넌트
import { PERMISSION_CONFIG } from './PermissionConfig';
import PermissionEditModal from './modals/PermissionEditModal';
import BulkPermissionEditModal from './modals/BulkPermissionEditModal';

const AdminPermissionManager = () => {
    const { classId } = useUser();
    const { showFeedback } = useFeedback();

    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedUids, setSelectedUids] = useState(new Set());
    const [editingStudent, setEditingStudent] = useState(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const fetchStudents = useCallback(async () => {
        if (!classId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const q = query(collection(db, `classes/${classId}/students`), orderBy("studentNumber"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs
                .map(docSnap => ({
                    uid: docSnap.id,
                    name: docSnap.data().name || `학생 ${docSnap.id.substring(0, 5)}`,
                    role: docSnap.data().role || 'student',
                    permissions: docSnap.data().permissions || {},
                }))
                .filter(s => s.role === 'student');
            setStudents(data);
        } catch (err) {
            showFeedback('학생 목록 로딩에 실패했습니다.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const handleSave = async (uid, permissions) => {
        setIsSaving(true);
        try {
            const studentRef = doc(db, `classes/${classId}/students/${uid}`);
            await updateDoc(studentRef, { permissions });
            showFeedback('권한이 저장되었습니다.', 'success');
            await fetchStudents();
            setEditingStudent(null);
        } catch (err) { showFeedback('권한 저장 중 오류: ' + err.message, 'error'); }
        finally { setIsSaving(false); }
    };

    const handleBulkSave = async (actionsToCommit) => {
        if (selectedUids.size === 0 || Object.keys(actionsToCommit).length === 0) {
            showFeedback("변경할 내용이 없습니다.", "info");
            setIsBulkModalOpen(false);
            return;
        }
        setIsSaving(true);
        const batch = writeBatch(db);
        selectedUids.forEach(uid => {
            const studentRef = doc(db, `classes/${classId}/students/${uid}`);
            const updates = {};
            for (const [permissionKey, grant] of Object.entries(actionsToCommit)) {
                updates[`permissions.${permissionKey}`] = grant;
            }
            batch.update(studentRef, updates);
        });
        try {
            await batch.commit();
            showFeedback(`${selectedUids.size}명 학생의 권한이 일괄 변경되었습니다.`, 'success');
            await fetchStudents();
            setSelectedUids(new Set());
            setIsBulkModalOpen(false);
        } catch (err) { showFeedback('일괄 변경 중 오류 발생: ' + err.message, 'error'); }
        finally { setIsSaving(false); }
    };

    const handleToggleAll = () => {
        if (selectedUids.size === students.length) setSelectedUids(new Set());
        else setSelectedUids(new Set(students.map(s => s.uid)));
    };
    const handleToggleSelection = (uid) => {
        setSelectedUids(prev => {
            const next = new Set(prev);
            next.has(uid) ? next.delete(uid) : next.add(uid);
            return next;
        });
    };

    return (
        <AppLayout showDefaultHeader={false}>
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <KeyRound className="h-8 w-8 text-indigo-500" /> 기능별 권한 관리
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">학생에게 특정 페이지나 기능에 대한 관리자 권한을 부여합니다.</p>
                </header>
                <Card>
                    <Card.Header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <Card.Title>학생별 권한 설정</Card.Title>
                        <div className="flex items-center gap-4">
                            {selectedUids.size > 0 && <p className="text-sm text-indigo-600 font-semibold">{selectedUids.size}명 선택됨</p>}
                            <Button onClick={() => setIsBulkModalOpen(true)} disabled={selectedUids.size === 0 || isSaving} icon={ShieldAlert}>
                                선택 학생 일괄 변경
                            </Button>
                        </div>
                    </Card.Header>
                    <Card.Content className="overflow-x-auto">
                        <table className="w-full text-sm border">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-left">
                                    <th className="p-2 text-center">
                                        <Checkbox
                                            checked={selectedUids.size === students.length}
                                            onChange={handleToggleAll}
                                            disabled={isSaving}
                                        />
                                    </th>
                                    <th className="p-3">이름</th>
                                    <th className="p-3">보유 권한</th>
                                    <th className="p-3 text-center">수정</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {students.map(student => {
                                    const grantedPermissions = PERMISSION_CONFIG.filter(p =>
                                        student.permissions && student.permissions[p.key] === true
                                    );
                                    const badgesByColor = grantedPermissions.reduce((acc, p) => {
                                        const color = p.color || 'gray';
                                        if (!acc[color]) acc[color] = [];
                                        acc[color].push(p);
                                        return acc;
                                    }, {});

                                    return (
                                        <tr
                                            key={student.uid}
                                            className={selectedUids.has(student.uid) ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                                        >
                                            <td className="p-2 text-center">
                                                <Checkbox
                                                    checked={selectedUids.has(student.uid)}
                                                    onChange={() => handleToggleSelection(student.uid)}
                                                    disabled={isSaving}
                                                />
                                            </td>
                                            <td className="p-3 font-medium text-slate-800">{student.name}</td>
                                            <td className="p-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.keys(badgesByColor).length > 0 ? (
                                                        Object.entries(badgesByColor).map(([color, perms]) =>
                                                            perms.map(p => (
                                                                <Badge key={p.key} color={color} size="sm">
                                                                    {p.label}
                                                                </Badge>
                                                            ))
                                                        )
                                                    ) : (
                                                        <span className="text-xs text-slate-400">권한 없음</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <Button
                                                    size="sm"
                                                    onClick={() => setEditingStudent(student)}
                                                    disabled={isSaving}
                                                >
                                                    권한 수정
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Card.Content>
                </Card>
            </div>

            {editingStudent && <PermissionEditModal student={editingStudent} onClose={() => setEditingStudent(null)} onSave={handleSave} isSaving={isSaving} />}
            {isBulkModalOpen && <BulkPermissionEditModal onClose={() => setIsBulkModalOpen(false)} onSave={handleBulkSave} isSaving={isSaving} selectedCount={selectedUids.size} />}
        </AppLayout>
    );
};

export default AdminPermissionManager;