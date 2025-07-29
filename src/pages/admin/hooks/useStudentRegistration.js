import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { useFeedback } from '../../../contexts/FeedbackContext';

export const useStudentRegistration = () => {
    const { showFeedback } = useFeedback();

    const [students, setStudents] = useState([
        { name: '', email: '', password: '123456', studentNumber: '' }
    ]);
    const [fileName, setFileName] = useState('');
    const [result, setResult] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    const addRow = () => {
        setStudents(prev => [...prev, { name: '', email: '', password: '123456', studentNumber: '' }]);
    };

    const deleteRow = (index) => {
        setStudents(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
    };

    const handleChange = (index, field, value) => {
        setStudents(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

                const parsed = rows.map(row => ({
                    studentNumber: row.학번 || row.studentNumber || '',
                    name: String(row.이름 || row.name || '').trim(),
                    email: String(row.이메일 || row.email || '').trim().toLowerCase(),
                    password: String(row.비밀번호 || row.password || '123456').trim(),
                }));

                const validStudents = parsed.filter(s => s.name && s.email);
                const invalidRowCount = parsed.length - validStudents.length;

                if (validStudents.length === 0) {
                    showFeedback('엑셀 파일에서 유효한 학생 정보를 찾을 수 없습니다. "이름", "이메일" 열이 있는지 확인해주세요.', 'error');
                    return;
                }

                setStudents(validStudents);
                showFeedback(`${validStudents.length}명의 학생 정보를 성공적으로 불러왔습니다.`, 'success');
                if (invalidRowCount > 0) {
                    showFeedback(`이름 또는 이메일이 없는 ${invalidRowCount}개의 행은 제외되었습니다.`, 'warning');
                }

            } catch (err) {
                showFeedback('엑셀 파일을 처리하는 중 오류가 발생했습니다.', 'error');
                console.error(err);
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    const handleRegister = async (classId) => {
        if (!classId) {
            showFeedback('학생을 등록할 학급이 지정되지 않았습니다.', 'error');
            return;
        }

        const validStudents = students
            .filter(s => s.name && s.email)
            .map(s => ({ ...s, studentNumber: s.studentNumber ? Number(s.studentNumber) : null }));

        if (validStudents.length === 0) {
            showFeedback('이름과 이메일을 모두 입력한 학생 정보가 없습니다.', 'warning');
            return;
        }

        setIsSubmitting(true);
        setResult([]);

        try {
            const functions = getFunctions(getApp(), 'asia-northeast3');
            const createFn = httpsCallable(functions, 'createStudentAccounts');
            const { data } = await createFn({ students: validStudents, classId });

            setResult(
                data.results.map((r, i) => {
                    const base = `${i + 1}. ${r.name || r.email || r.uid}`;

                    const fallbackSuccess = `✅ ${base} 생성 완료`;
                    const fallbackError = `❌ ${base} 생성 실패`;

                    const message = r.message?.trim();

                    return {
                        status: r.status === 'success' ? 'success' : 'error',
                        message:
                            message
                                ? `${r.status === 'success' ? '✅' : '❌'} ${base} ${r.status === 'success' ? '성공' : `실패: ${message}`}`
                                : (r.status === 'success' ? fallbackSuccess : fallbackError),
                    };
                })
            );


            showFeedback('계정 생성 작업이 완료되었습니다. 아래 결과를 확인하세요.', 'info');
            setStudents([{ name: '', email: '', password: '123456', studentNumber: '' }]);
            setFileName('');
        } catch (err) {
            showFeedback(`계정 생성 중 오류: ${err.message}`, 'error');
            setResult([{ status: 'error', message: `❌ 전체 처리 중 오류: ${err.message}` }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadSample = () => {
        const sampleData = [
            { "학번": 1, "이름": "김학생", "이메일": "student1@example.com", "비밀번호": "123456" },
            { "학번": 2, "이름": "이학생", "이메일": "student2@example.com", "비밀번호": "123456" },
        ];
        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "학생 목록");
        XLSX.writeFile(workbook, "학생등록_샘플.xlsx");
    };

    return {
        students, addRow, deleteRow, handleChange,
        fileName, fileInputRef, handleFileUpload,
        result, isSubmitting, handleRegister,
        handleDownloadSample
    };
};
