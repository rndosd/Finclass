// src/pages/dashboard/services/noticeService.js

import { db } from '../../../firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';

/**
 * 새로운 공지사항을 추가합니다.
 */
export const addNotice = async ({ classId, authorUid, authorName, content }) => {
    if (!content.trim()) return { success: false, message: '내용을 입력해주세요.' };
    try {
        const noticesColRef = collection(db, `classes/${classId}/notices`);
        await addDoc(noticesColRef, {
            content,
            authorUid,
            authorName,
            createdAt: serverTimestamp()
        });
        return { success: true, message: '공지가 등록되었습니다.' };
    } catch (error) {
        console.error("Error adding notice:", error);
        return { success: false, message: '공지 등록 중 오류가 발생했습니다.' };
    }
};

/**
 * 기존 공지사항을 수정합니다.
 */
export const updateNotice = async ({ classId, noticeId, newContent }) => {
    if (!newContent.trim()) return { success: false, message: '내용을 입력해주세요.' };
    try {
        const noticeDocRef = doc(db, `classes/${classId}/notices`, noticeId);
        await updateDoc(noticeDocRef, {
            content: newContent
        });
        return { success: true, message: '공지가 수정되었습니다.' };
    } catch (error) {
        console.error("Error updating notice:", error);
        return { success: false, message: '공지 수정 중 오류가 발생했습니다.' };
    }
};

/**
 * 공지사항을 삭제합니다.
 */
export const deleteNotice = async ({ classId, noticeId }) => {
    try {
        const noticeDocRef = doc(db, `classes/${classId}/notices`, noticeId);
        await deleteDoc(noticeDocRef);
        return { success: true, message: '공지가 삭제되었습니다.' };
    } catch (error) {
        console.error("Error deleting notice:", error);
        return { success: false, message: '공지 삭제 중 오류가 발생했습니다.' };
    }
};