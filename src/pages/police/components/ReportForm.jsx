// src/pages/police/ReportForm.jsx

import React, { useState } from 'react';
import { db } from '../../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { getPolicePath } from '../utils/policePathUtils';
import StudentSelector from '../../../components/ui/StudentSelector'; // ⭐ import

const ReportForm = ({ allStudents = [], policeRules = [], onSubmitSuccess, onCancel }) => {
    const { userData, classId, loading: userContextLoading } = useUser();
    const { showFeedback } = useFeedback();

    const reporterUid = userData?.uid;
    const reporterName = userData?.name || userData?.email || '알 수 없음';

    // ✅ 다중 선택
    const [accusedStudentUids, setAccusedStudentUids] = useState([]);
    const [selectedRuleId, setSelectedRuleId] = useState("");
    const [reason, setReason] = useState("");
    const [isSensitive, setIsSensitive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const resetForm = () => {
        setAccusedStudentUids([]);
        setSelectedRuleId("");
        setReason("");
        setIsSensitive(false);
        setFormError('');
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!reporterUid) {
            setFormError("신고자 정보(UID)를 알 수 없습니다. 다시 로그인해주세요.");
            return;
        }
        if (!accusedStudentUids || accusedStudentUids.length === 0) {
            setFormError("피신고자를 한 명 이상 선택해주세요.");
            return;
        }
        if (!selectedRuleId) {
            setFormError("위반 규칙을 선택해주세요.");
            return;
        }
        if (!reason.trim()) {
            setFormError("신고 사유를 구체적으로 작성해주세요.");
            return;
        }

        setIsSubmitting(true);

        try {
            if (!classId) throw new Error("학급 ID가 유효하지 않습니다.");

            const ruleAppliedData = policeRules.find(r => r.id === selectedRuleId);
            if (!ruleAppliedData) throw new Error("선택된 규칙 정보를 찾을 수 없습니다.");

            const reportsPath = getPolicePath('policeReports', classId);

            await Promise.all(accusedStudentUids.map(async accusedUid => {
                const accusedStudentData = allStudents.find(s => s.uid === accusedUid);
                if (!accusedStudentData) return;

                const reportDocData = {
                    reporterUid,
                    reporterName: reporterName || "익명 처리됨",
                    accusedStudentUid: accusedUid,
                    accusedStudentName: accusedStudentData.name || `학생(${accusedUid.substring(0, 5)})`,
                    ruleId: selectedRuleId,
                    ruleText: ruleAppliedData.text,
                    reason: reason.trim(),
                    status: "pending",
                    createdAt: serverTimestamp(),
                    classId,
                    isSensitive,
                    resolvedAt: null,
                    resolverUid: null,
                    resolverName: null,
                    actionTaken: null,
                    appliedFineAmount: null,
                    appliedCreditChange: null,
                };

                await addDoc(collection(db, reportsPath), reportDocData);
            }));

            onSubmitSuccess("신고가 성공적으로 접수되었습니다.");
            resetForm();

        } catch (err) {
            console.error("신고 제출 오류:", err);
            setFormError("신고 제출 중 오류 발생: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (userContextLoading) return <p>사용자 정보 로딩 중...</p>;
    if (!classId) return <p>학급 정보를 찾을 수 없습니다.</p>;
    if (policeRules.length === 0) return <p>신고 가능한 규칙이 아직 설정되지 않았습니다.</p>;

    return (
        <form onSubmit={handleSubmitReport} className="space-y-5">
            {formError && (
                <div className="p-3 bg-red-500 text-white text-sm rounded">
                    {formError}
                </div>
            )}

            {/* ✅ StudentSelector 사용! */}
            <StudentSelector
                label="피신고자*"
                selectedUids={accusedStudentUids}
                onChange={setAccusedStudentUids}
                multiple={true}
            />

            <div>
                <label htmlFor="ruleSelect" className="block text-sm font-medium text-gray-700 mb-1">
                    위반 규칙*
                </label>
                <select
                    id="ruleSelect"
                    value={selectedRuleId}
                    onChange={(e) => setSelectedRuleId(e.target.value)}
                    disabled={isSubmitting}
                    required
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">-- 규칙 선택 --</option>
                    {policeRules.map(rule => (
                        <option key={rule.id} value={rule.id}>
                            {rule.order}. {rule.text}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="reportReason" className="block text-sm font-medium text-gray-700 mb-1">
                    신고 사유*
                </label>
                <textarea
                    id="reportReason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="구체적으로 작성해주세요. (예: 언제, 어디서, 무엇을, 어떻게)"
                    disabled={isSubmitting}
                    required
                    className="w-full border rounded px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                />
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id="isSensitiveReport"
                    checked={isSensitive}
                    onChange={(e) => setIsSensitive(e.target.checked)}
                    disabled={isSubmitting}
                    className="w-4 h-4"
                />
                <label htmlFor="isSensitiveReport" className="text-sm text-gray-600">
                    민감한 사안입니다 (교사만 전체 내용 확인 가능)
                </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                    취소
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                    {isSubmitting ? "제출 중..." : "신고 제출"}
                </button>
            </div>
        </form>
    );
};

export default ReportForm;
