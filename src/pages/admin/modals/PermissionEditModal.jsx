import React, { useState, useMemo } from 'react';
import { Modal, Button, Checkbox } from '../../../components/ui';
import { PERMISSION_CONFIG } from '../PermissionConfig';

export default function PermissionEditModal({ student, onClose, onSave, isSaving }) {
    const [permissions, setPermissions] = useState(student.permissions || {});

    const groupedPermissions = useMemo(() => {
        return PERMISSION_CONFIG.reduce((acc, p) => {
            const group = p.group || '기타';
            if (!acc[group]) acc[group] = [];
            acc[group].push(p);
            return acc;
        }, {});
    }, []);

    const handlePermissionChange = (key, checked) => {
        setPermissions(p => ({ ...p, [key]: checked }));
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`${student.name} 학생 권한 수정`}>
            <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                    <div key={groupName} className="space-y-2">
                        <h4 className="font-semibold border-b pb-1 text-slate-800">{groupName}</h4>
                        {perms.map(p => (
                            <div key={p.key} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                                <label htmlFor={p.key} className="font-medium text-slate-700 cursor-pointer">{p.label}</label>
                                <Checkbox id={p.key} checked={!!permissions[p.key]} onChange={e => handlePermissionChange(p.key, e.target.checked)} />
                            </div>
                        ))}
                    </div>
                ))}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>취소</Button>
                    <Button color="indigo" onClick={() => onSave(student.uid, permissions)} isLoading={isSaving}>변경사항 저장</Button>
                </div>
            </div>
        </Modal>
    );
}