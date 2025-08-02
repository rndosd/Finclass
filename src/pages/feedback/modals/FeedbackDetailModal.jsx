// src/pages/feedback/modals/FeedbackDetailModal.jsx

import React, { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { Modal, Button, Textarea, Badge } from "../../../components/ui";
import {
  MessageSquare,
  MessageCircle,
  Trash2,
  Edit,
  X,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

/**
 * 피드백 상세 정보를 보여주는 모달 컴포넌트
 */
const FeedbackDetailModal = ({
  feedback,
  onClose,
  onStatusChange,
  onDelete,
  isProcessing,
  currentUser,
  isAdmin,
}) => {
  // 답변 관련 상태
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [replyError, setReplyError] = useState("");

  // 답변 취소 확인 대화상자 상태
  const [isCancelConfirmVisible, setCancelConfirmVisible] = useState(false);

  // 상태별 배지 및 아이콘 정보를 반환하는 함수
  const getStatusInfo = (status) => {
    switch (status) {
      case "pending":
        return {
          badge: (
            <Badge color="yellow" size="sm">
              신규
            </Badge>
          ),
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          text: "신규 피드백",
        };
      case "processing":
        return {
          badge: (
            <Badge color="blue" size="sm">
              처리중
            </Badge>
          ),
          icon: <Edit className="h-4 w-4 text-blue-500" />,
          text: "처리 중",
        };
      case "completed":
        return {
          badge: (
            <Badge color="green" size="sm">
              완료
            </Badge>
          ),
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          text: "처리 완료",
        };
      default:
        return {
          badge: (
            <Badge color="gray" size="sm">
              알 수 없음
            </Badge>
          ),
          icon: <Clock className="h-4 w-4 text-gray-500" />,
          text: "상태 불명",
        };
    }
  };

  const statusInfo = getStatusInfo(feedback.status);

  // 답변 저장 핸들러
  const handleSaveReply = async () => {
    if (!replyContent.trim()) {
      setReplyError("답변 내용을 입력해 주세요.");
      return;
    }
    if (replyContent.trim().length < 5) {
      setReplyError("답변은 최소 5자 이상 입력해 주세요.");
      return;
    }

    setIsSavingReply(true);
    setReplyError("");

    try {
      const feedbackRef = doc(db, "feedbacks", feedback.id);
      const updateData = {
        adminReply: replyContent.trim(),
        adminReplyAuthor: currentUser.name || "관리자",
        repliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: feedback.status === "pending" ? "processing" : feedback.status,
      };

      await updateDoc(feedbackRef, updateData);

      // ✅ 로컬 feedback 객체 즉시 업데이트
      feedback.adminReply = replyContent.trim();
      feedback.adminReplyAuthor = currentUser.name || "관리자";
      feedback.repliedAt = new Date(); // 현재 시간으로 설정
      feedback.status =
        feedback.status === "pending" ? "processing" : feedback.status;

      // ✅ 답변 작성 모드 종료 (모달은 닫지 않음)
      setIsReplying(false);
      setReplyContent("");

      // onClose(); // ❌ 이 줄 제거 - 모달을 닫지 않음
    } catch (error) {
      setReplyError("답변 저장 중 오류가 발생했습니다.");
      console.error("Error saving reply:", error);
    } finally {
      setIsSavingReply(false);
    }
  };

  // 답변 작성 취소 핸들러
  const handleCancelReply = () => {
    if (replyContent.trim()) {
      setCancelConfirmVisible(true);
    } else {
      resetReplyState();
    }
  };

  // 답변 관련 상태 초기화
  const resetReplyState = () => {
    setIsReplying(false);
    setReplyContent("");
    setReplyError("");
    setCancelConfirmVisible(false);
  };

  // 모달 닫기 요청 핸들러 (내용 작성 중일 때 확인)
  const handleCloseRequest = () => {
    if (isReplying && replyContent.trim()) {
      setCancelConfirmVisible(true);
    } else {
      onClose();
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Modal isOpen={true} onClose={handleCloseRequest} maxWidth="4xl">
      <div className="p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="flex items-start justify-between sticky top-0 bg-white py-2 -my-2 z-10">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-indigo-500" />
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  피드백 상세
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {statusInfo.icon}
                  <span className="text-sm text-slate-600">
                    {statusInfo.text}
                  </span>
                  {statusInfo.badge}
                </div>
              </div>
            </div>
          </div>

          {/* 피드백 내용 */}
          <div className="bg-slate-50 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {feedback.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mb-4">
                {isAdmin && (
                  <>
                    <span>
                      작성자:{" "}
                      <span className="font-medium text-slate-700">
                        {feedback.authorName}
                      </span>
                    </span>
                    <span>
                      학급:{" "}
                      <span className="font-medium text-slate-700">
                        {feedback.classId}
                      </span>
                    </span>
                  </>
                )}
                <span>작성일: {formatDate(feedback.createdAt)}</span>
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">
                피드백 내용
              </h4>
              {/* 스크롤 가능한 피드백 내용 영역 */}
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-md p-3 bg-white">
                <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {feedback.content}
                </div>
              </div>
            </div>
          </div>

          {/* 관리자 답변 섹션 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-indigo-500" />
                관리자 답변
              </h4>
              {isAdmin && !feedback.adminReply && !isReplying && (
                <Button
                  size="sm"
                  onClick={() => setIsReplying(true)}
                  icon={MessageCircle}
                  disabled={!!isProcessing}
                >
                  답변 작성
                </Button>
              )}
            </div>

            {/* 기존 답변 표시 */}
            {feedback.adminReply && !isReplying && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    {feedback.adminReplyAuthor || "관리자"}의 답변
                  </span>
                  <span className="text-xs text-blue-600">
                    {formatDate(feedback.repliedAt)}
                  </span>
                </div>
                {/* 스크롤 가능한 답변 내용 영역 */}
                <div className="max-h-48 overflow-y-auto border border-blue-300 rounded-md p-3 bg-white/50">
                  <div className="text-blue-900 whitespace-pre-wrap leading-relaxed">
                    {feedback.adminReply}
                  </div>
                </div>
                {isAdmin && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsReplying(true);
                        setReplyContent(feedback.adminReply);
                      }}
                      disabled={!!isProcessing}
                      icon={Edit}
                    >
                      답변 수정
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 답변 작성/수정 폼 */}
            {isReplying && (
              <div className="border border-slate-200 rounded-lg p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      답변 내용 <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={replyContent}
                      onChange={(e) => {
                        setReplyContent(e.target.value);
                        if (replyError) setReplyError("");
                      }}
                      placeholder="피드백에 대한 답변을 작성해 주세요..."
                      rows={6}
                      error={!!replyError}
                      disabled={isSavingReply}
                      maxLength={1000}
                      className="resize-none"
                    />
                    <div className="flex justify-between mt-1">
                      {replyError && (
                        <p className="text-sm text-red-600">{replyError}</p>
                      )}
                      <div className="text-xs text-slate-500 ml-auto">
                        {replyContent.length}/1000
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelReply}
                      disabled={isSavingReply}
                      icon={X}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveReply}
                      isLoading={isSavingReply}
                      disabled={isSavingReply || !replyContent.trim()}
                      icon={Send}
                    >
                      {isSavingReply ? "저장 중..." : "답변 저장"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 답변이 없고, 작성 중도 아닐 때 */}
            {!feedback.adminReply && !isReplying && (
              <div className="text-center py-6 text-slate-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p>아직 답변이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 액션 버튼들 */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-200 sticky bottom-0 bg-white py-2 -my-2">
            <div className="flex gap-2">
              {isAdmin && feedback.status === "pending" && (
                <Button
                  size="sm"
                  color="blue"
                  onClick={() => onStatusChange(feedback.id, "processing")}
                  isLoading={isProcessing === feedback.id}
                  disabled={!!isProcessing}
                >
                  처리중으로 변경
                </Button>
              )}
              {isAdmin && feedback.status === "processing" && (
                <Button
                  size="sm"
                  color="green"
                  onClick={() => onStatusChange(feedback.id, "completed")}
                  isLoading={isProcessing === feedback.id}
                  disabled={!!isProcessing}
                >
                  완료로 변경
                </Button>
              )}
              {isAdmin && feedback.status === "completed" && (
                <Button
                  size="sm"
                  color="blue"
                  variant="outline"
                  onClick={() => onStatusChange(feedback.id, "processing")}
                  isLoading={isProcessing === feedback.id}
                  disabled={!!isProcessing}
                >
                  처리중으로 되돌리기
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {(isAdmin || feedback.authorId === currentUser?.uid) && (
                <Button
                  size="sm"
                  color="red"
                  variant="outline"
                  icon={Trash2}
                  onClick={() =>
                    onDelete(
                      feedback.id,
                      feedback.authorName,
                      feedback.authorId
                    )
                  }
                  isLoading={isProcessing === feedback.id}
                  disabled={!!isProcessing}
                >
                  삭제
                </Button>
              )}
              <Button variant="outline" onClick={handleCloseRequest}>
                닫기
              </Button>
            </div>
          </div>
        </div>

        {/* 답변 작성 취소 확인 대화상자 */}
        {isCancelConfirmVisible && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
            <div className="bg-white p-6 rounded-lg shadow-xl border border-slate-200 max-w-sm text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                답변 작성을 취소하시겠습니까?
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                작성 중인 내용이 저장되지 않습니다.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCancelConfirmVisible(false)}
                >
                  계속 작성
                </Button>
                <Button variant="danger" onClick={resetReplyState}>
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

export default FeedbackDetailModal;