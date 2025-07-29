import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from "firebase/functions";
import { useFeedback } from '../../contexts/FeedbackContext';
import AppLayout from '../../components/layout/AppLayout';
import { Card, Button, Spinner, Alert } from '../../components/ui';
import { ShieldCheck, Users, UserCheck, UserX } from 'lucide-react';

const AdminDashboard = () => {
    const [pendingTeachers, setPendingTeachers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(null);
    const { showFeedback } = useFeedback();

    // 교사 승인 대기 목록 불러오기
    const fetchPendingTeachers = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = query(
                collection(db, "users"),
                where("role", "==", "teacher"),
                where("status", "==", "pending")
            );
            const snapshot = await getDocs(q);
            const teachers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingTeachers(teachers);
        } catch (error) {
            showFeedback("승인 대기 교사 목록을 불러오는 데 실패했습니다.", "error");
            console.error("Error fetching pending teachers:", error);
        } finally {
            setIsLoading(false);
        }
    }, [showFeedback]);

    useEffect(() => {
        fetchPendingTeachers();
    }, [fetchPendingTeachers]);

    // 교사 승인 처리
    const handleApprove = async (teacher) => {
        if (!window.confirm(`'${teacher.name}' 교사의 가입을 승인하시겠습니까?`)) return;

        setIsProcessing(teacher.id);
        try {
            const functions = getFunctions(undefined, "asia-northeast3");
            const approveTeacher = httpsCallable(functions, 'approveTeacher');

            const result = await approveTeacher({
                teacherUid: teacher.id,
                requestedClassDocId: teacher.classDocId, // ✅ 이름을 맞춰줌
                teacherName: teacher.name
            });

            showFeedback(result?.data?.message || `'${teacher.name}' 교사 승인 완료`, 'success');
            fetchPendingTeachers();
        } catch (error) {
            console.error("Approval error:", error);
            showFeedback(`승인 처리 중 오류: ${error.message}`, 'error');
        } finally {
            setIsProcessing(null);
        }
    };

    // 교사 가입 요청 거절
    const handleReject = async (teacher) => {
        if (!window.confirm(`'${teacher.name}' 교사의 가입 요청을 거절하시겠습니까? 관련 데이터가 삭제됩니다.`)) return;

        setIsProcessing(teacher.id);
        try {
            await deleteDoc(doc(db, "users", teacher.id));
            showFeedback(`'${teacher.name}' 교사의 가입 요청을 거절했습니다.`, 'info');
            fetchPendingTeachers();
        } catch (error) {
            showFeedback(`거절 처리 중 오류: ${error.message}`, 'error');
        } finally {
            setIsProcessing(null);
        }
    };

    return (
        <AppLayout showDefaultHeader={false}>
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-indigo-500" />
                        관리자 대시보드
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">시스템의 핵심 기능들을 관리합니다.</p>
                </header>

                <div className="space-y-8">
                    {/* 교사 승인 관리 */}
                    <Card>
                        <Card.Header>
                            <Card.Title>교사 가입 승인 관리</Card.Title>
                            <Card.Description>승인 요청 중인 교사 목록입니다.</Card.Description>
                        </Card.Header>
                        <Card.Content>
                            {isLoading ? (
                                <div className="py-10"><Spinner /></div>
                            ) : pendingTeachers.length === 0 ? (
                                <Alert type="info" message="승인 대기 중인 교사가 없습니다." />
                            ) : (
                                <div className="overflow-x-auto border rounded-md">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-left">
                                            <tr>
                                                <th className="p-3 font-semibold text-slate-600">이름</th>
                                                <th className="p-3 font-semibold text-slate-600">이메일</th>
                                                <th className="p-3 font-semibold text-slate-600">희망 학급</th>
                                                <th className="p-3 font-semibold text-slate-600 text-center">처리</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pendingTeachers.map((teacher) => (
                                                <tr key={teacher.id}>
                                                    <td className="p-3 text-slate-800 font-medium">{teacher.name}</td>
                                                    <td className="p-3 text-slate-600">{teacher.email}</td>
                                                    <td className="p-3 font-semibold text-indigo-600">
                                                        {teacher.classDocId || teacher.requestedClassId}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <Button size="sm" color="red" variant="outline" icon={UserX} onClick={() => handleReject(teacher)} disabled={!!isProcessing}>거절</Button>
                                                            <Button size="sm" color="green" icon={UserCheck} onClick={() => handleApprove(teacher)} isLoading={isProcessing === teacher.id} disabled={!!isProcessing}>승인</Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card.Content>
                    </Card>

                    {/* 기타 관리 기능 */}
                    <Card>
                        <Card.Header>
                            <Card.Title>기타 관리 기능</Card.Title>
                        </Card.Header>
                        <Card.Content className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Link to="/manage/students">
                                <Button variant="outline" className="w-full h-full flex-col items-start text-left p-4">
                                    <Users className="w-6 h-6 mb-2 text-indigo-500" />
                                    <span className="font-semibold">학생 관리</span>
                                    <span className="text-xs text-slate-500 mt-1">학생의 금융 활동을 확인합니다.</span>
                                </Button>
                            </Link>
                        </Card.Content>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
};

export default AdminDashboard;
