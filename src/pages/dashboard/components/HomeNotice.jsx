// src/pages/dashboard/components/HomeNotice.jsx

import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner } from '../../../components/ui';
import { db } from '../../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import NoticeModal from '../modals/NoticeModal'; // 모달 import
import { addNotice, updateNotice, deleteNotice } from '../services/noticeService'; // 서비스 함수 import

const HomeNotice = () => {
    const { classId, userData } = useUser();
    const isTeacher = userData?.role === 'teacher';

    const [notices, setNotices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 모달 상태 관리
    const [modalState, setModalState] = useState({
        isOpen: false,
        mode: 'add',
        noticeToEdit: null,
    });

    // 공지 목록 실시간 구독
    useEffect(() => {
        if (!classId) {
            setIsLoading(false);
            setNotices([]);
            return;
        }
        const noticesRef = collection(db, `classes/${classId}/notices`);
        const q = query(noticesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const noticeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotices(noticeList);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching notices:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [classId]);

    // 모달 열기 핸들러
    const handleOpenModal = (mode = 'add', notice = null) => {
        setModalState({ isOpen: true, mode, noticeToEdit: notice });
    };

    // 모달 닫기 핸들러
    const handleCloseModal = () => {
        setModalState({ isOpen: false, mode: 'add', noticeToEdit: null });
    };

    // 공지 제출(추가/수정) 핸들러
    const handleNoticeSubmit = async (content) => {
        let result;
        if (modalState.mode === 'add') {
            result = await addNotice({
                classId,
                content,
                authorUid: userData.uid,
                authorName: userData.name,
            });
        } else {
            result = await updateNotice({
                classId,
                noticeId: modalState.noticeToEdit.id,
                newContent: content,
            });
        }
        if (!result.success) alert(result.message);
    };

    // 공지 삭제 핸들러
    const handleDeleteNotice = async (noticeId) => {
        if (window.confirm("정말 이 공지를 삭제하시겠습니까?")) {
            const result = await deleteNotice({ classId, noticeId });
            if (!result.success) alert(result.message);
        }
    };

    return (
        <>
            <Card>
                <Card.Header className="flex justify-between items-center">
                    <Card.Title className="text-lg">📢 공지사항</Card.Title>
                    {isTeacher && (
                        <Button size="sm" variant="ghost" onClick={() => handleOpenModal('add')}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            공지 추가
                        </Button>
                    )}
                </Card.Header>
                <Card.Content className="space-y-3 text-sm text-slate-700 max-h-48 overflow-y-auto">
                    {isLoading ? <div className="text-center"><Spinner /></div>
                        : notices.length > 0 ? notices.map(notice => (
                            <div key={notice.id} className="group flex items-start justify-between gap-2 p-2 rounded-md hover:bg-slate-50">
                                <p className="flex-grow whitespace-pre-wrap break-words">{notice.content}</p>
                                {isTeacher && (
                                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon-xs" variant="ghost" onClick={() => handleOpenModal('edit', notice)}>
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="icon-xs" variant="ghost" color="red" onClick={() => handleDeleteNotice(notice.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )) : <p className="text-center text-slate-500 py-4">등록된 공지사항이 없습니다.</p>}
                </Card.Content>
            </Card>

            <NoticeModal
                isOpen={modalState.isOpen}
                onClose={handleCloseModal}
                onSubmit={handleNoticeSubmit}
                mode={modalState.mode}
                noticeToEdit={modalState.noticeToEdit}
            />
        </>
    );
};

export default HomeNotice;