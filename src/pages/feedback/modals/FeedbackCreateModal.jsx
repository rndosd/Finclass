// src/pages/feedback/modals/FeedbackCreateModal.jsx

import React, { useState } from "react";
import { Modal, Button, InputField, Textarea } from "../../../components/ui";
import { MessageSquare, X, AlertTriangle } from "lucide-react";

/**
 * 새 피드백을 작성하는 모달 컴포넌트
 * @param {object} props
 * @param {function} props.onClose - 모달을 닫는 함수
 * @param {function} props.onSave - 피드백을 저장하는 함수
 * @param {boolean} props.isSaving - 저장 중 상태 여부
 */
const FeedbackCreateModal = ({ onClose, onSave, isSaving }) => {
  // 폼 데이터 상태 관리
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  // 유효성 검사 에러 상태 관리
  const [errors, setErrors] = useState({});
  // 취소 확인 대화상자 표시 여부 상태 관리
  const [isCancelConfirmVisible, setCancelConfirmVisible] = useState(false);

  /**
   * 입력 필드 변경 핸들러
   * @param {string} field - 변경된 필드 이름 (title, content)
   * @param {string} value - 변경된 값
   */
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // 입력이 발생하면 해당 필드의 에러 메시지를 제거합니다.
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  /**
   * 폼 유효성 검사 함수
   * @returns {boolean} - 유효성 검사 통과 여부
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "제목을 입력해 주세요.";
    } else if (formData.title.trim().length < 5) {
      newErrors.title = "제목은 최소 5자 이상 입력해 주세요.";
    } else if (formData.title.trim().length > 100) {
      newErrors.title = "제목은 100자를 초과할 수 없습니다.";
    }

    if (!formData.content.trim()) {
      newErrors.content = "내용을 입력해 주세요.";
    } else if (formData.content.trim().length < 10) {
      newErrors.content = "내용은 최소 10자 이상 입력해 주세요.";
    } else if (formData.content.trim().length > 2000) {
      newErrors.content = "내용은 2000자를 초과할 수 없습니다.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 폼 제출 핸들러
   * @param {React.FormEvent} e - 폼 이벤트 객체
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    onSave({
      title: formData.title.trim(),
      content: formData.content.trim(),
    });
  };

  /**
   * 취소 버튼 클릭 핸들러
   * 작성 중인 내용이 있으면 확인 대화상자를 표시하고, 없으면 바로 모달을 닫습니다.
   */
  const handleCancel = () => {
    if (isSaving) return; // 저장 중일 때는 취소 방지

    if (formData.title.trim() || formData.content.trim()) {
      setCancelConfirmVisible(true);
    } else {
      onClose();
    }
  };

  /**
   * 취소 확인 대화상자에서 '확인'을 눌렀을 때 실행되는 함수
   */
  const confirmCancel = () => {
    setCancelConfirmVisible(false);
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={handleCancel} maxWidth="2xl">
      <div className="p-6 relative">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-6 w-6 text-indigo-500" />
          <h2 className="text-xl font-bold text-slate-800">새 피드백 작성</h2>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 제목 입력 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <InputField
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="피드백 제목을 입력해 주세요 (5-100자)"
              error={errors.title}
              disabled={isSaving}
              maxLength={100}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.title ? (
                <p className="text-sm text-red-600">{errors.title}</p>
              ) : (
                <div />
              )}
              <div className="text-xs text-slate-500 ml-auto">
                {formData.title.length}/100
              </div>
            </div>
          </div>

          {/* 내용 입력 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              내용 <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) => handleInputChange("content", e.target.value)}
              placeholder="구체적인 피드백이나 건의사항을 작성해 주세요.&#10;예시:&#10;- 발견한 버그나 오류&#10;- 개선 아이디어&#10;- 새로운 기능 제안&#10;- 사용성 관련 의견"
              rows={8}
              error={errors.content}
              disabled={isSaving}
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.content ? (
                <p className="text-sm text-red-600">{errors.content}</p>
              ) : (
                <div />
              )}
              <div className="text-xs text-slate-500 ml-auto">
                {formData.content.length}/2000
              </div>
            </div>
          </div>

          {/* 버튼 그룹 */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              icon={X}
            >
              취소
            </Button>
            <Button
              type="submit"
              isLoading={isSaving}
              disabled={
                isSaving || !formData.title.trim() || !formData.content.trim()
              }
              icon={MessageSquare}
            >
              {isSaving ? "저장 중..." : "피드백 등록"}
            </Button>
          </div>
        </form>

        {/* 취소 확인 대화상자 */}
        {isCancelConfirmVisible && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-xl border border-slate-200 max-w-sm text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                작성을 취소하시겠습니까?
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                작성 중인 내용이 저장되지 않습니다. 정말로 나가시겠습니까?
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCancelConfirmVisible(false)}
                >
                  계속 작성
                </Button>
                <Button variant="danger" onClick={confirmCancel}>
                  나가기
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FeedbackCreateModal;
