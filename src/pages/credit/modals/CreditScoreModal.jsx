// src/pages/credit/CreditScoreModal.jsx
import React, { useState } from "react";
import {
    doc,
    updateDoc,
    collection,
    addDoc,
    serverTimestamp,
    increment,
    writeBatch // <--- [개선] writeBatch를 import 합니다.
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useUser } from "../../../contexts/UserContext";
import { useFeedback } from "../../../contexts/FeedbackContext";

// ▼▼▼ 핵심 수정 ▼▼▼
// targets prop이 undefined일 경우, 기본값으로 빈 배열 []을 사용하도록 설정합니다.
export default function CreditScoreModal({ targets = [], onClose }) {
    const [amountInput, setAmountInput] = useState("");
    const [reason, setReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { userData, classId } = useUser(); // [개선] 로그 기록을 위해 userData 추가
    const { showFeedback } = useFeedback();

    // 이제 targets는 절대 undefined가 아니므로, 이 방어 코드는 더 간단해질 수 있습니다.
    if (targets.length === 0) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl w-[400px]">
                    <p className="text-slate-700">점수를 수정할 학생이 선택되지 않았습니다.</p>
                    <div className="mt-4 text-right">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleSubmit = async () => {
        const amount = parseInt(amountInput, 10);
        if (isNaN(amount) || amount === 0) {
            showFeedback("0이 아닌 유효한 숫자를 입력해주세요.", "warning");
            return;
        }
        if (!reason.trim()) {
            showFeedback("사유를 입력해주세요.", "warning");
            return;
        }
        if (!classId) {
            showFeedback("classId를 찾을 수 없습니다.", "error");
            return;
        }

        setIsSubmitting(true);

        // --- [개선] 여러 학생을 업데이트할 때 WriteBatch 사용 ---
        const batch = writeBatch(db);

        try {
            targets.forEach((student) => {
                // 1. 학생의 creditScore 업데이트 작업을 배치에 추가
                const studentRef = doc(db, `classes/${classId}/students/${student.uid}`);
                batch.update(studentRef, {
                    creditScore: increment(amount),
                });

                // 2. creditLogs 기록 작업을 배치에 추가
                const logRef = doc(collection(db, `classes/${classId}/students/${student.uid}/creditLogs`));
                batch.set(logRef, {
                    amount,
                    reason,
                    actorUid: userData?.uid, // 조작자(교사)의 UID 기록
                    source: 'manual_adjustment', // 수동 조작 출처 명시
                    timestamp: serverTimestamp(),
                });
            });

            // 준비된 모든 작업을 한 번에 실행 (원자적 연산)
            await batch.commit();

            showFeedback(`${targets.length}명의 점수 수정 및 로그 기록이 완료되었습니다!`, "success");
            setAmountInput("");
            setReason("");
            onClose();
        } catch (err) {
            console.error("점수 수정 오류:", err);
            showFeedback("오류가 발생했습니다.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg w-[440px] shadow-xl">
                <h2 className="text-xl font-bold mb-4 text-center text-slate-800">
                    🛠 신용점수 수정 ({targets.length}명)
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            변경할 점수 (양수/음수)
                        </label>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() =>
                                    setAmountInput((prev) =>
                                        String((parseInt(prev || "0", 10) || 0) - 1)
                                    )
                                }
                                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-md"
                            >
                                -
                            </button>
                            <input
                                type="number"
                                value={amountInput}
                                onChange={(e) => setAmountInput(e.target.value)}
                                className="w-full border rounded-md px-3 py-2 shadow-sm text-center"
                                placeholder="점수 입력"
                            />
                            <button
                                onClick={() =>
                                    setAmountInput((prev) =>
                                        String((parseInt(prev || "0", 10) || 0) + 1)
                                    )
                                }
                                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-md"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">사유</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="mt-1 w-full border rounded-md px-3 py-2 shadow-sm"
                            rows={3}
                            placeholder="예: 과제 미제출, 봉사 활동 등"
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-6 space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md"
                        disabled={isSubmitting}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "처리중..." : "저장"}
                    </button>
                </div>
            </div>
        </div>
    );
}
