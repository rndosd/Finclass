import React from 'react';
import { Modal, Button, SelectField, InputField, StudentSelector } from '../../../components/ui';

const FineFormModal = ({
    isOpen,
    onClose,
    onSubmit,
    fineForm,
    setFineForm,
    allStudents,
    policeRules,
    isSubmitting = false,
}) => {
    const handleChange = (field, value) => {
        setFineForm((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="직접 벌금 부과">
            <div className="space-y-4">
                <StudentSelector
                    label="대상 학생"
                    selectedUids={fineForm.uids || []}
                    onChange={uids => handleChange('uids', uids)}
                    multiple={true}
                />

                <SelectField
                    label="위반 규칙"
                    value={fineForm.ruleId}
                    onChange={(e) => handleChange('ruleId', e.target.value)}
                >
                    <option value="">선택하세요</option>
                    {policeRules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                            {rule.text} ({rule.fineAmount ?? 0} 벌금 / {rule.creditChange ?? 0} 신용)
                        </option>
                    ))}
                </SelectField>

                <InputField
                    label="기타 사유 (선택)"
                    value={fineForm.reason}
                    onChange={(e) => handleChange('reason', e.target.value)}
                    placeholder="필요 시 직접 사유를 입력하세요"
                />
            </div>

            <div className="mt-6 flex justify-end space-x-2">
                <Button onClick={onClose} variant="ghost">
                    취소
                </Button>
                <Button onClick={onSubmit} color="red" disabled={isSubmitting}>
                    벌금 부과
                </Button>
            </div>
        </Modal>
    );
};

export default FineFormModal;
