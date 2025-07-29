import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { Modal, Button, InputField, Spinner, Alert } from '../../../components/ui';
import { Cog6ToothIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function ClassSettingsModal({ isOpen, onClose }) {
    const { classId } = useUser();
    const { showFeedback } = useFeedback();

    const [className, setClassName] = useState("");
    const [currencyUnit, setCurrencyUnit] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchSettings = useCallback(async () => {
        if (!classId) return;
        setIsLoading(true);
        try {
            const classDocRef = doc(db, "classes", classId);
            const classDocSnap = await getDoc(classDocRef);
            if (classDocSnap.exists()) {
                const data = classDocSnap.data();
                setClassName(data.className || "");
                setCurrencyUnit(data.currencyUnit || "단위");
            }
        } catch (error) {
            showFeedback("학급 설정을 불러오는 중 오류가 발생했습니다.", "error");
        }
        setIsLoading(false);
    }, [classId, showFeedback]);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen, fetchSettings]);

    const handleSave = async () => {
        if (!className.trim()) {
            showFeedback('학급 이름은 비워둘 수 없습니다.', 'warning');
            return;
        }
        setIsSaving(true);
        try {
            const settingsToSave = {
                className: className.trim(),
                currencyUnit: currencyUnit.trim() || '단위'
            };
            await setDoc(doc(db, "classes", classId), settingsToSave, { merge: true });
            showFeedback('학급 설정이 저장되었습니다!', 'success');
            onClose(); // 저장 후 모달 닫기
        } catch (error) {
            showFeedback('저장 중 오류가 발생했습니다.', 'error');
        }
        setIsSaving(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="학급 기본 설정" icon={Cog6ToothIcon}>
            {isLoading ? (
                <div className="text-center p-8"><Spinner /></div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <label htmlFor="classNameInput" className="block text-sm font-medium text-gray-700 mb-1">학급 이름</label>
                        <InputField id="classNameInput" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="예: 행복반, 6학년 1반" />
                    </div>
                    <div>
                        <label htmlFor="currencyUnitInput" className="block text-sm font-medium text-gray-700 mb-1">
                            <CurrencyDollarIcon className="h-4 w-4 inline-block mr-1 text-green-600" /> 화폐 단위
                        </label>
                        <InputField id="currencyUnitInput" value={currencyUnit} onChange={(e) => setCurrencyUnit(e.target.value)} placeholder="예: 코인, 포인트, 골드" />
                        <p className="mt-1 text-xs text-gray-500">은행, 상점 등 모든 곳에서 사용될 화폐 단위를 설정합니다.</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="secondary" onClick={onClose} disabled={isSaving}>취소</Button>
                        <Button color="indigo" onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
                            저장하기
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}