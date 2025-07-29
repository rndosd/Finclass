import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useUser } from "../../contexts/UserContext";
import { Button, InputField, Card, Spinner, Alert } from "../../components/ui";
import { Cog6ToothIcon, CurrencyDollarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ClassSettings() {
  const navigate = useNavigate();
  const { userData, classId, loading: userContextLoading } = useUser();

  const [currentClassName, setCurrentClassName] = useState("");
  const [currentCurrencyUnit, setCurrentCurrencyUnit] = useState("${currencyUnit}");
  const [isLoading, setIsLoading] = useState(true);           // 초기 데이터 로딩
  const [isSaving, setIsSaving] = useState(false);            // 저장 중 로딩
  const [alertInfo, setAlertInfo] = useState({ open: false, message: '', type: 'info' });

  useEffect(() => {
    if (userContextLoading) {
      setIsLoading(true);
      return;
    }

    if (userData?.role !== 'teacher') {
      setAlertInfo({ open: true, type: 'error', message: '이 페이지에 접근할 권한이 없습니다.' });
      setIsLoading(false);
      return;
    }

    if (!classId) {
      setAlertInfo({ open: true, type: 'warning', message: '담당 학급 정보가 지정되지 않았습니다.' });
      setCurrentClassName("");
      setCurrentCurrencyUnit("${currencyUnit}");
      setIsLoading(false);
      return;
    }

    const fetchClassSettings = async () => {
      setIsLoading(true);
      setAlertInfo({ open: false, message: '' });
      try {
        const classDocRef = doc(db, "classes", classId);
        const classDocSnap = await getDoc(classDocRef);

        if (classDocSnap.exists()) {
          const classData = classDocSnap.data();
          setCurrentClassName(classData.className || "");
          setCurrentCurrencyUnit(classData.currencyUnit || "${currencyUnit}");
        } else {
          setAlertInfo({ open: true, type: 'warning', message: `학급 정보(${classId})를 찾을 수 없습니다.` });
          setCurrentClassName("");
          setCurrentCurrencyUnit("${currencyUnit}");
        }
      } catch (error) {
        console.error("학급 설정 불러오기 오류:", error);
        setAlertInfo({ open: true, type: 'error', message: '학급 설정을 불러오는 중 오류가 발생했습니다.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassSettings();
  }, [userContextLoading, userData, classId]);

  const handleSave = async () => {
    if (!classId) {
      setAlertInfo({ open: true, type: 'error', message: '학급 정보가 없어 저장할 수 없습니다.' });
      return;
    }
    if (!currentClassName.trim()) {
      setAlertInfo({ open: true, type: 'warning', message: '학급 이름은 비워둘 수 없습니다.' });
      return;
    }

    const currencyToSave = currentCurrencyUnit.trim() || "${currencyUnit}";
    const settingsToSave = {
      className: currentClassName.trim(),
      currencyUnit: currencyToSave,
    };

    if (!window.confirm(`학급 이름: "${settingsToSave.className}", 화폐 단위: "${settingsToSave.currencyUnit}" (으)로 저장하시겠습니까?`)) return;

    setIsSaving(true);
    try {
      await setDoc(doc(db, "classes", classId), settingsToSave, { merge: true });
      setAlertInfo({ open: true, type: 'success', message: '저장되었습니다!' });
      setTimeout(() => setAlertInfo({ open: false, message: '', type: 'info' }), 3000);
    } catch (error) {
      console.error("학급 설정 저장 오류:", error);
      setAlertInfo({ open: true, type: 'error', message: '저장 중 오류가 발생했습니다.' });
    } finally {
      setIsSaving(false);
    }
  };

  // 초기 로딩 중
  if (userContextLoading || isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white shadow-xl rounded-lg mt-10 font-['NEXON_Lv1_Gothic_OTF']">
      {alertInfo.open && (
        <Alert type={alertInfo.type} onClose={() => setAlertInfo({ ...alertInfo, open: false })}>
          {alertInfo.message}
        </Alert>
      )}
      <h2 className="text-2xl font-bold mb-6 text-indigo-700 flex items-center">
        <Cog6ToothIcon className="h-7 w-7 mr-2" /> 학급 기본 설정 {classId && `(${classId})`}
      </h2>
      <div className="space-y-6">
        <div>
          <label htmlFor="classNameInput" className="block text-sm font-medium text-gray-700 mb-1">
            학급 이름
          </label>
          <InputField
            id="classNameInput"
            value={currentClassName}
            onChange={(e) => setCurrentClassName(e.target.value)}
            placeholder="예: 행복반, 6학년 1반"
          />
        </div>

        <div>
          <label htmlFor="currencyUnitInput" className="block text-sm font-medium text-gray-700 mb-1">
            <CurrencyDollarIcon className="h-4 w-4 inline-block mr-1 mb-0.5 text-green-600" /> 화폐 단위
          </label>
          <InputField
            id="currencyUnitInput"
            value={currentCurrencyUnit}
            onChange={(e) => setCurrentCurrencyUnit(e.target.value)}
            placeholder="예: ${currencyUnit}, 포인트, 골드"
          />
          <p className="mt-1 text-xs text-gray-500">은행, 상점 등 모든 곳에서 사용될 화폐 단위를 설정합니다.</p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
          color="indigo"
        >
          {isSaving ? <Spinner size="sm" /> : "학급 설정 저장하기"}
        </Button>
      </div>
    </div>
  );
}
