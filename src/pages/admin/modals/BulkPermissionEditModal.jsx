import React, { useState, useMemo } from 'react';
import { Modal, Button } from '../../../components/ui';
import RadioGroup, { Radio } from '../../../components/ui/RadioGroup';
import { PERMISSION_CONFIG } from '../PermissionConfig';

export default function BulkPermissionEditModal({ onClose, onSave, isSaving, selectedCount }) {
    const [permissionActions, setPermissionActions] = useState({});

    const handleActionChange = (permissionKey, action) => {
        setPermissionActions(prev => ({ ...prev, [permissionKey]: action }));
    };

    const handleSaveClick = () => {
        const actionsToCommit = Object.entries(permissionActions)
            .filter(([_, action]) => action !== 'no_change')
            .reduce((acc, [key, action]) => {
                acc[key] = (action === 'grant');
                return acc;
            }, {});
        onSave(actionsToCommit);
    };

    const groupedPermissions = useMemo(() => {
        return PERMISSION_CONFIG.reduce((acc, p) => {
            const group = p.group || '기타';
            if (!acc[group]) acc[group] = [];
            acc[group].push(p);
            return acc;
        }, {});
    }, []);

    return (
        <Modal isOpen={true} onClose={onClose} title={`선택된 ${selectedCount}명 권한 일괄 변경`} size="lg">
            <div className="space-y-6">
                <p className="text-sm text-slate-600">
                    각 권한에 대해 <strong className="text-slate-800">부여 / 변경 안 함 / 해제</strong> 중 하나를 선택하세요.
                    <br />선택하지 않으면 기본적으로 <strong className="text-slate-800">변경 안 함</strong>으로 처리됩니다.
                </p>

                <div className="max-h-96 overflow-y-auto space-y-4 p-1">
                    {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                        <div key={groupName}>
                            <h4 className="font-semibold border-b pb-1 mb-2 text-slate-800">{groupName}</h4>
                            <div className="space-y-2">
                                {perms.map(p => (
                                    <div key={p.key} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-slate-50">
                                        {/* 좌측: 권한명 */}
                                        <div className="w-48 shrink-0 text-sm font-medium text-slate-700">{p.label}</div>

                                        {/* 우측: 라디오 버튼 그룹 */}
                                        <RadioGroup
                                            value={permissionActions[p.key] || 'no_change'}
                                            onChange={(val) => handleActionChange(p.key, val)}
                                            className="flex-grow flex gap-x-6"
                                        >
                                            <Radio value="grant" description="이 권한을 부여합니다."> 부여</Radio>
                                            <Radio value="no_change" description="기존 상태를 그대로 유지합니다.">변경 안 함</Radio>
                                            <Radio value="revoke" description="이 권한을 제거합니다.">해제</Radio>
                                        </RadioGroup>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>취소</Button>
                    <Button color="indigo" onClick={handleSaveClick} isLoading={isSaving}>
                        {selectedCount}명에게 적용
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
