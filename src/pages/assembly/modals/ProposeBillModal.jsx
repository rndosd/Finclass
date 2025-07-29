import React, { useState } from 'react';
import { Modal, Button, InputField, Textarea } from '../../../components/ui';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { db } from '../../../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';

const ProposeBillModal = ({ isOpen, onClose, classId, onSuccess }) => {
    const { showFeedback } = useFeedback();
    const { userData } = useUser(); // ✅ 사용자 정보 접근
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [fineAmount, setFineAmount] = useState('');
    const [creditChange, setCreditChange] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            showFeedback("법안 제목과 내용은 필수입니다.", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            const billData = {
                title: title.trim(),
                content: content.trim(),
                proposerUid: userData.uid,
                proposerName: userData.name || '',
                createdAt: serverTimestamp(),
                status: 'voting',
                agree: [],
                disagree: [],
                voteCount: 0,
                policeRuleData: {
                    text: title.trim(),
                    fineAmount: Number(fineAmount) || 0,
                    creditChange: Number(creditChange) || 0,
                    notes: notes.trim(),
                },
            };

            await addDoc(collection(db, `classes/${classId}/assemblyBills`), billData);
            showFeedback("법안이 성공적으로 제안되었습니다!", "success");
            onSuccess();
        } catch (error) {
            showFeedback(`법안 제안 중 오류: ${error.message}`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="새로운 법안 제안하기" size="lg">
            <div className="space-y-4">
                <InputField label="법안 제목" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 복도에서 뛰지 않기" />
                <Textarea label="상세 내용" value={content} onChange={e => setContent(e.target.value)} placeholder="법안의 취지와 내용을 자세히 적어주세요." rows={4} />

                <div className="pt-4 border-t">
                    <p className="text-sm font-semibold text-slate-700 mb-2">정책 연동 설정 (가결 시 적용)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputField
                                label="벌금/상금"
                                type="number"
                                value={fineAmount}
                                onChange={e => setFineAmount(e.target.value)}
                                placeholder="예: -50 (벌금) 또는 100 (상금)"
                            />
                            <p className="mt-1 text-xs text-slate-500">벌금은 음수(-), 상금은 양수(+)로 입력하세요.</p>
                        </div>
                        <div>
                            <InputField
                                label="신용점수 변동"
                                type="number"
                                value={creditChange}
                                onChange={e => setCreditChange(e.target.value)}
                                placeholder="예: -5 (하락) 또는 10 (상승)"
                            />
                            <p className="mt-1 text-xs text-slate-500">하락 시 음수(-), 상승 시 양수를 입력하세요.</p>
                        </div>
                    </div>
                    <div className="mt-4">
                        <InputField label="참고 사항 (메모)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="예: 3회 이상 적발 시 적용" />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>취소</Button>
                    <Button color="indigo" onClick={handleSubmit} isLoading={isSubmitting}>제안하기</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ProposeBillModal;
