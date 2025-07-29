// src/pages/store/modals/CancelReasonModal.jsx
import React, { useState, useEffect } from 'react';
// ★★★ UI 컴포넌트 import 경로 재확인 ★★★
// components/ui/index.js 에 Modal, Button, Textarea가 올바르게 export 되어 있다고 가정합니다.
import { Modal, Button, Textarea } from '../../../components/ui';

const CancelReasonModal = ({
    isOpen,
    onClose,         // 모달을 닫는 함수
    onSubmit,        // (reason: string) => void, 취소 사유를 받아 처리하는 함수
    defaultReason = '', // 선택적: 기본 취소 사유
    isSubmitting = false // (선택적) 제출 중 로딩 상태
}) => {
    const [reason, setReason] = useState(defaultReason);

    // 모달이 열릴 때 defaultReason으로 reason 상태를 초기화합니다.
    useEffect(() => {
        if (isOpen) {
            setReason(defaultReason || ''); // defaultReason이 없거나 빈 문자열이면 빈 문자열로
        }
    }, [isOpen, defaultReason]);

    const handleTextChange = (e) => {
        setReason(e.target.value);
    };

    const handleSubmit = () => {
        if (typeof onSubmit === 'function') {
            onSubmit(reason.trim()); // 앞뒤 공백 제거 후 제출
        }
    };

    // isOpen이 false이면 아무것도 렌더링하지 않습니다.
    if (!isOpen) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md"> {/* size는 필요에 따라 조절 */}
            <Modal.Header>
                <Modal.Title>🛑 구매 취소 사유 입력</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p className="text-sm text-slate-600 mb-3">
                    이 구매 건을 취소하는 사유를 입력해주세요. (선택 사항이며, 입력하지 않아도 취소 가능합니다.)
                </p>
                <Textarea
                    value={reason}
                    onChange={handleTextChange}
                    placeholder="예: 학생 요청, 재고 부족, 잘못된 주문 등"
                    rows={4}
                    className="w-full" // Textarea 컴포넌트가 className을 받을 수 있도록 구현되어 있어야 함
                />
            </Modal.Body>
            <Modal.Footer>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" color="slate" onClick={onClose} disabled={isSubmitting}>
                        닫기
                    </Button>
                    <Button color="red" onClick={handleSubmit} disabled={isSubmitting} isLoading={isSubmitting}>
                        {isSubmitting ? '처리 중...' : '취소 확정'}
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default CancelReasonModal;