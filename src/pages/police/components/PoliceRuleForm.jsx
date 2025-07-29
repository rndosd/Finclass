import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, getDocs, where, setDoc } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { getPolicePath } from '../utils/policePathUtils';
import { Button, InputField, Textarea, SelectField } from '../../../components/ui';

// 폼의 초기 상태를 반환하는 함수
const getInitialState = (existingRule) => ({
    text: existingRule?.text || '',
    fineAmount: existingRule?.fineAmount || -10,
    creditChange: existingRule?.creditChange || -10,
    notes: existingRule?.notes || '',
    dangerLevel: existingRule?.dangerLevel || 2, // 기본값 '보통'
});

const PoliceRuleForm = ({ existingRule, onClose, onUpdate, isEditing }) => {
    const { classId } = useUser();
    const { showFeedback } = useFeedback();

    // 1. 모든 필드를 하나의 객체 상태로 관리합니다.
    const [rule, setRule] = useState(getInitialState(existingRule));
    // 3. '저장 중'임을 명확히 나타내는 isSaving 상태
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // 수정할 규칙이 변경될 때마다 폼 상태를 업데이트합니다.
        setRule(getInitialState(existingRule));
    }, [existingRule]);

    const handleChange = (field, value) => {
        setRule(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rule.text.trim()) {
            showFeedback("규칙 내용을 입력해주세요.", "warning");
            return;
        }

        setIsSaving(true);
        try {
            const rulesPath = getPolicePath('policeRulesCollection', classId);
            const ruleData = {
                ...rule,
                fineAmount: Number(rule.fineAmount) || 0,
                creditChange: Number(rule.creditChange) || 0,
                dangerLevel: Number(rule.dangerLevel),
                updatedAt: serverTimestamp(),
            };

            if (isEditing && existingRule?.id) {
                // 수정 로직
                const ruleRef = doc(db, rulesPath, existingRule.id);
                await updateDoc(ruleRef, ruleData);
                showFeedback("규칙이 성공적으로 수정되었습니다.", "success");
            } else {
                // 추가 로직 (order 필드 자동 계산)
                const q = query(collection(db, rulesPath));
                const snapshot = await getDocs(q);
                const newOrder = snapshot.size + 1;

                const newRuleRef = doc(collection(db, rulesPath));
                await setDoc(newRuleRef, {
                    ...ruleData,
                    order: newOrder,
                    createdAt: serverTimestamp()
                });
                showFeedback("새로운 규칙이 추가되었습니다.", "success");
            }

            // 2. 부모로부터 받은 onUpdate 함수를 호출하여 목록을 새로고침
            onUpdate?.();
            onClose();

        } catch (error) {
            console.error("규칙 저장 오류:", error);
            showFeedback("규칙 저장 중 오류가 발생했습니다.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border bg-slate-50 rounded-lg mb-4 space-y-4">
            <h3 className="text-lg font-bold">{isEditing ? '규칙 수정' : '새 규칙 추가'}</h3>

            <Textarea
                label="규칙 내용"
                value={rule.text}
                onChange={(e) => handleChange('text', e.target.value)}
                required
                rows={3}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                    label="벌금/상금"
                    type="number"
                    value={rule.fineAmount}
                    onChange={(e) => handleChange('fineAmount', e.target.value)}
                    placeholder="벌금은 음수(-)로 입력"
                />
                <InputField
                    label="신용점수 변동"
                    type="number"
                    value={rule.creditChange}
                    onChange={(e) => handleChange('creditChange', e.target.value)}
                    placeholder="하락 시 음수(-)로 입력"
                />
            </div>
            <InputField
                label="참고 사항"
                value={rule.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="예: 최대 3회 적발 시 적용"
            />
            <SelectField
                label="위험도"
                value={rule.dangerLevel}
                onChange={(e) => handleChange('dangerLevel', Number(e.target.value))}
            >
                <option value={1}>1 - 낮음 (주의)</option>
                <option value={2}>2 - 보통 (경고)</option>
                <option value={3}>3 - 높음 (심각)</option>
            </SelectField>

            <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                    취소
                </Button>
                <Button type="submit" color="indigo" isLoading={isSaving} disabled={isSaving}>
                    {isEditing ? "수정사항 저장" : "규칙 추가"}
                </Button>
            </div>
        </form>
    );
};


export default PoliceRuleForm;
