import React from 'react';
import { useUser } from '../../contexts/UserContext';
import { useStudentRegistration } from './hooks/useStudentRegistration';
import AppLayout from '../../components/layout/AppLayout';
import { Button, InputField, Alert, Spinner } from '../../components/ui';
import { UploadCloud, Plus, Trash2, Rocket } from 'lucide-react';

export default function StudentRegistration() {
  const { userData } = useUser();
  const {
    students, addRow, deleteRow, handleChange,
    fileName, fileInputRef, handleFileUpload,
    result, isSubmitting, handleRegister,
    handleDownloadSample
  } = useStudentRegistration();

  const classIdForRegistration = userData?.classId;

  return (
    <AppLayout showDefaultHeader={false}>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            📝 학생 계정 일괄 등록 <span className="text-lg text-indigo-600">({students.length}명)</span>
          </h2>
          <p className="text-slate-600 text-sm">
            • <strong className="text-indigo-700">엑셀(.xlsx) 파일 업로드</strong> 혹은 직접 입력 후{' '}
            <span className="font-semibold text-indigo-700">계정 생성</span>을 누르세요.
            {userData?.role !== 'admin' && classIdForRegistration && (
              <span className="block text-xs text-indigo-500 mt-1">현재 학급: {classIdForRegistration}</span>
            )}
          </p>
        </header>

        <section className="bg-slate-50 border rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileUpload}
              disabled={isSubmitting}
              className="hidden"
            />
            <Button
              variant="secondary"
              icon={UploadCloud}
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              엑셀 파일 선택
            </Button>
            {fileName && <span className="text-sm text-slate-600 truncate">📂 {fileName}</span>}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadSample}
              className="ml-auto text-xs text-indigo-600 hover:underline"
            >
              ⬇ 샘플 엑셀 다운로드
            </Button>
          </div>
        </section>

        <div className="overflow-x-auto border rounded-lg bg-white">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3 w-1/5 text-left">학번(숫자)</th>
                <th className="p-3 w-1/6 text-left">이름</th>
                <th className="p-3 flex-1 text-left">이메일</th>
                <th className="p-3 w-1/5 text-left">비밀번호</th>
                <th className="p-3 w-30 text-center">삭제</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3 text-center text-slate-500">{i + 1}</td>
                  <td className="p-2"><InputField value={s.studentNumber} placeholder="1" onChange={e => handleChange(i, 'studentNumber', e.target.value)} disabled={isSubmitting} /></td>
                  <td className="p-2"><InputField value={s.name} placeholder="이름" onChange={e => handleChange(i, 'name', e.target.value)} disabled={isSubmitting} /></td>
                  <td className="p-2"><InputField type="email" value={s.email} placeholder="email@example.com" onChange={e => handleChange(i, 'email', e.target.value)} disabled={isSubmitting} /></td>
                  <td className="p-2"><InputField value={s.password} placeholder="123456" onChange={e => handleChange(i, 'password', e.target.value)} disabled={isSubmitting} /></td>
                  <td className="p-2 text-center">
                    <Button variant="outline" color="red" size="sm" icon={Trash2} onClick={() => deleteRow(i)} disabled={isSubmitting || students.length === 1}>삭제</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 items-center">
          <Button variant="outline" icon={Plus} onClick={addRow} disabled={isSubmitting}>행 추가</Button>
          <Button icon={Rocket} color="indigo" onClick={() => handleRegister(classIdForRegistration)} isLoading={isSubmitting} disabled={isSubmitting || students.filter(s => s.name && s.email).length === 0}>
            🚀 계정 생성 ({students.filter(s => s.name && s.email).length}명)
          </Button>
        </div>

        {result.length > 0 && (
          <section className="border rounded-lg bg-slate-50 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">처리 결과:</h3>

            {result.some(r => r.status === 'error') && (
              <p className="text-sm text-red-600">❗ 일부 계정 생성에 실패했습니다. 오류 메시지를 확인하세요.</p>
            )}

            {result.map((line, idx) => (
              // ⭐ 시작: Alert 컴포넌트 호출 방식 수정
              <Alert
                key={idx}
                variant={line.status === "error" ? "destructive" : "success"}
                message={line.message} // children 대신 message prop 사용
                className="text-xs"
              />
              // ⭐ 끝: 수정된 부분
            ))}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
