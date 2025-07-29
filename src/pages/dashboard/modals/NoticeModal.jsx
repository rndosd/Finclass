// src/pages/dashboard/modals/NoticeModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, Textarea, Spinner } from '../../../components/ui';

// mode: 'add' 또는 'edit'
// noticeToEdit: 수정할 때 필요한 기존 공지 데이터 { id, content }
const NoticeModal = ({ isOpen, onClose, onSubmit, mode = 'add', noticeToEdit = null }) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // 수정 모드일 경우, 기존 내용을 채워넣음
            setContent(mode === 'edit' && noticeToEdit ? noticeToEdit.content : '');
        }
    }, [isOpen, mode, noticeToEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            alert('내용을 입력해주세요.');
            return;
        }
        setIsSubmitting(true);
        // onSubmit은 addNotice 또는 updateNotice 서비스 함수를 호출하는 핸들러
        await onSubmit(content);
        setIsSubmitting(false);
        onClose(); // 성공 시 모달 닫기
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? '새 공지 작성' : '공지 수정'}>
            <form onSubmit={handleSubmit}>
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    placeholder="공지 내용을 입력하세요..."
                    required
                />
                <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner size="xs" /> : (mode === 'add' ? '등록하기' : '수정하기')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default NoticeModal;