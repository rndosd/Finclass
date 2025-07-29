import React, { useEffect, useState, useMemo } from 'react';
import { usePoliceRules } from '../hooks/usePoliceRules';
import PoliceRuleForm from '../components/PoliceRuleForm';
import PoliceRuleCard from '../components/PoliceRuleCard';
import DangerLabelSettingsModal from '../modals/DangerLabelSettingsModal';
import { Button, Modal } from '../../../components/ui';
import { useUser } from '../../../contexts/UserContext';
import { useDangerLabelSettings } from '../hooks/useDangerLabelSettings';

const PoliceRuleTab = () => {
    const { classId, userData } = useUser();
    const isEditable = userData?.role === 'teacher';

    const { policeRules, fetchPoliceRules, deletePoliceRule } = usePoliceRules(classId);
    const { labelMap, colorMap, loading } = useDangerLabelSettings(classId);

    const [showRuleForm, setShowRuleForm] = useState(false);
    const [currentRuleToEdit, setCurrentRuleToEdit] = useState(null);
    const [showDangerLabelModal, setShowDangerLabelModal] = useState(false);

    useEffect(() => {
        fetchPoliceRules();
    }, [fetchPoliceRules]);

    const handleEdit = (rule) => {
        setCurrentRuleToEdit(rule);
        setShowRuleForm(true);
    };

    const handleDelete = (ruleId, order) => {
        if (window.confirm("정말 이 규칙을 삭제하시겠습니까?")) {
            deletePoliceRule(ruleId, order);
        }
    };

    const groupedRules = useMemo(() => {
        const groups = { 3: [], 2: [], 1: [] };
        policeRules.forEach(rule => {
            let level = parseInt(rule.dangerLevel, 10);
            if (![1, 2, 3].includes(level)) level = 1;
            groups[level].push(rule);
        });
        return [3, 2, 1].map(level => ({
            level,
            rules: groups[level].sort((a, b) => a.order - b.order),
        }));
    }, [policeRules]);

    if (loading) {
        return <div className="text-center p-8 text-slate-500">위험도 레이블 불러오는 중...</div>;
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold">📜 학급 규칙 목록</h2>
                <div className="flex gap-2">
                    {isEditable && (
                        <Button onClick={() => {
                            setCurrentRuleToEdit(null);
                            setShowRuleForm(true);
                        }}>
                            + 새 규칙 추가
                        </Button>
                    )}
                    {isEditable && (
                        <Button
                            onClick={() => setShowDangerLabelModal(true)}
                            variant="secondary"
                            color="gray"
                        >
                            ⚙️ 위험도 레이블 설정
                        </Button>
                    )}
                </div>
            </div>

            {showRuleForm && (
                <Modal
                    isOpen={showRuleForm}
                    onClose={() => setShowRuleForm(false)}
                    title={currentRuleToEdit ? "규칙 수정" : "새 규칙 추가"}
                >
                    <PoliceRuleForm
                        existingRule={currentRuleToEdit}
                        isEditing={!!currentRuleToEdit}     // ← 이 줄 추가!
                        onClose={() => setShowRuleForm(false)}
                        onUpdate={fetchPoliceRules}
                    />
                </Modal>
            )}

            {groupedRules.map(group => (
                <div key={group.level} className="mb-8">
                    <h3 className={`text-lg font-bold mb-3 ${colorMap?.[group.level] || 'text-slate-600'}`}>
                        {labelMap?.[group.level] || `위험도 ${group.level}`}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.rules.map((rule) => (
                            <PoliceRuleCard
                                key={rule.id}
                                rule={rule}
                                onEdit={isEditable ? () => handleEdit(rule) : undefined}
                                onDelete={isEditable ? () => handleDelete(rule.id, rule.order) : undefined}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {showDangerLabelModal && (
                <DangerLabelSettingsModal
                    classId={classId}
                    onClose={() => setShowDangerLabelModal(false)}
                    hideColorSetting={true}
                />
            )}
        </div>
    );
};

export default PoliceRuleTab;
