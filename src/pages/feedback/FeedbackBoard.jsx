// src/pages/feedback/FeedbackBoard.jsx

import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useUser } from "../../contexts/UserContext";
import { useFeedback } from "../../contexts/FeedbackContext";

// UI 컴포넌트
import AppLayout from "../../components/layout/AppLayout";
import { Card, Button, Spinner, Alert, Badge } from "../../components/ui";
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  MessageCircle,
  Eye,
} from "lucide-react";

// 모달 컴포넌트들
import FeedbackCreateModal from "./modals/FeedbackCreateModal";
import FeedbackDetailModal from "./modals/FeedbackDetailModal";

const ITEMS_PER_PAGE = 10;

const FeedbackBoard = () => {
  const { userData, isAdmin } = useUser(); // isAdmin 추가
  const { showFeedback } = useFeedback();

  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(null);

  // 피드백 목록 불러오기
  const fetchFeedbacks = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setFeedbacks([]);
        setLastDoc(null);
        setHasMore(true);
      }

      try {
        let q = query(
          collection(db, "feedbacks"),
          orderBy("createdAt", "desc"),
          limit(ITEMS_PER_PAGE)
        );

        if (isLoadMore && lastDoc) {
          q = query(
            collection(db, "feedbacks"),
            orderBy("createdAt", "desc"),
            startAfter(lastDoc),
            limit(ITEMS_PER_PAGE)
          );
        }

        const snapshot = await getDocs(q);
        const newFeedbacks = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        if (isLoadMore) {
          setFeedbacks((prev) => [...prev, ...newFeedbacks]);
        } else {
          setFeedbacks(newFeedbacks);
        }

        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(newFeedbacks.length === ITEMS_PER_PAGE);
      } catch (error) {
        showFeedback("피드백 목록을 불러오는 데 실패했습니다.", "error");
        console.error("Error fetching feedbacks:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [showFeedback]
  );

  useEffect(() => {
    fetchFeedbacks();
    // 디버깅: 사용자 데이터 확인
    console.log("FeedbackBoard - userData:", userData);
  }, [fetchFeedbacks]);

  // 피드백 생성
  const handleCreateFeedback = async (feedbackData) => {
    setIsProcessing("create");
    try {
      // 사용자 데이터 검증
      if (!userData) {
        showFeedback("사용자 정보를 찾을 수 없습니다.", "error");
        return;
      }

      await addDoc(collection(db, "feedbacks"), {
        ...feedbackData,
        authorId: userData.uid,
        authorName: userData.name || userData.email || "알 수 없음",
        classId: userData.classId || "unknown",
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      showFeedback("피드백이 등록되었습니다.", "success");
      setIsCreating(false);
      fetchFeedbacks(); // 목록 새로고침
    } catch (error) {
      console.error("Error creating feedback:", error);
      showFeedback(
        `피드백 등록 중 오류가 발생했습니다: ${error.message}`,
        "error"
      );
    } finally {
      setIsProcessing(null);
    }
  };

  // 피드백 상태 변경
  const handleStatusChange = async (feedbackId, newStatus) => {
    setIsProcessing(feedbackId);
    try {
      const feedbackRef = doc(db, "feedbacks", feedbackId);
      await updateDoc(feedbackRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      showFeedback("상태가 변경되었습니다.", "success");
      fetchFeedbacks(); // 목록 새로고침
    } catch (error) {
      showFeedback("상태 변경 중 오류가 발생했습니다.", "error");
      console.error("Error updating status:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  // 피드백 삭제 (관리자 또는 작성자만 가능)
  const handleDeleteFeedback = async (feedbackId, authorName, authorId) => {
    // 권한 체크
    if (!isAdmin && authorId !== userData?.uid) {
      showFeedback("본인이 작성한 피드백만 삭제할 수 있습니다.", "error");
      return;
    }

    if (!window.confirm(`'${authorName}'의 피드백을 삭제하시겠습니까?`)) return;

    setIsProcessing(feedbackId);
    try {
      await deleteDoc(doc(db, "feedbacks", feedbackId));
      showFeedback("피드백이 삭제되었습니다.", "success");
      fetchFeedbacks(); // 목록 새로고침
    } catch (error) {
      showFeedback("피드백 삭제 중 오류가 발생했습니다.", "error");
      console.error("Error deleting feedback:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  // 상태별 배지 스타일
  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge color="yellow" size="sm">
            신규
          </Badge>
        );
      case "processing":
        return (
          <Badge color="blue" size="sm">
            처리중
          </Badge>
        );
      case "completed":
        return (
          <Badge color="green" size="sm">
            완료
          </Badge>
        );
      default:
        return (
          <Badge color="gray" size="sm">
            알 수 없음
          </Badge>
        );
    }
  };

  return (
    <AppLayout showDefaultHeader={false}>
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-indigo-500" />앱 피드백
            게시판
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            앱 개선을 위한 교사들의 의견과 건의사항을 관리합니다.
          </p>
        </header>

        <div className="mb-6">
          <Button
            icon={Plus}
            onClick={() => setIsCreating(true)}
            disabled={!!isProcessing}
          >
            새 피드백 작성
          </Button>
        </div>

        <Card>
          <Card.Header>
            <Card.Title>피드백 목록</Card.Title>
            <Card.Description>
              총 {feedbacks.length}개의 피드백이 있습니다.
            </Card.Description>
          </Card.Header>
          <Card.Content>
            {isLoading ? (
              <div className="py-10">
                <Spinner />
              </div>
            ) : feedbacks.length === 0 ? (
              <Alert type="info" message="등록된 피드백이 없습니다." />
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-800 text-lg">
                            {feedback.title}
                          </h3>
                          {getStatusBadge(feedback.status)}
                        </div>

                        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                          {feedback.content}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {/* 관리자만 작성자 정보와 학급 정보 표시 */}
                          {isAdmin && (
                            <>
                              <span>작성자: {feedback.authorName}</span>
                            </>
                          )}
                          <span>
                            {feedback.createdAt
                              ?.toDate?.()
                              ?.toLocaleDateString("ko-KR")}
                          </span>
                          {feedback.adminReply && (
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              답변 있음
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Eye}
                          onClick={() => setSelectedFeedback(feedback)}
                          disabled={!!isProcessing}
                        >
                          상세보기
                        </Button>

                        {/* 상태 변경 버튼들 - 관리자만 */}
                        {isAdmin && feedback.status === "pending" && (
                          <Button
                            size="sm"
                            color="blue"
                            onClick={() =>
                              handleStatusChange(feedback.id, "processing")
                            }
                            isLoading={isProcessing === feedback.id}
                            disabled={!!isProcessing}
                          >
                            처리중으로
                          </Button>
                        )}

                        {isAdmin && feedback.status === "processing" && (
                          <Button
                            size="sm"
                            color="green"
                            onClick={() =>
                              handleStatusChange(feedback.id, "completed")
                            }
                            isLoading={isProcessing === feedback.id}
                            disabled={!!isProcessing}
                          >
                            완료로
                          </Button>
                        )}

                        {/* 삭제 버튼 - 관리자 또는 작성자만 표시 */}
                        {(isAdmin || feedback.authorId === userData?.uid) && (
                          <Button
                            size="sm"
                            color="red"
                            variant="outline"
                            icon={Trash2}
                            onClick={() =>
                              handleDeleteFeedback(
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
                      </div>
                    </div>
                  </div>
                ))}

                {/* 더보기 버튼 */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => fetchFeedbacks(true)}
                      isLoading={isLoadingMore}
                      disabled={isLoadingMore}
                    >
                      더 보기
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* 모달들 */}
      {isCreating && (
        <FeedbackCreateModal
          onClose={() => setIsCreating(false)}
          onSave={handleCreateFeedback}
          isSaving={isProcessing === "create"}
        />
      )}

      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteFeedback}
          isProcessing={isProcessing}
          currentUser={userData}
          isAdmin={isAdmin}
        />
      )}
    </AppLayout>
  );
};

export default FeedbackBoard;
