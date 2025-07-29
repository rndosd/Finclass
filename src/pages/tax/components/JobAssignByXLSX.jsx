import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { useTaxContext } from '../../../contexts/TaxContext';

import { db } from '../../../firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { Card, Button, Spinner } from '../../../components/ui';
import { UploadCloud, Download } from 'lucide-react';
import { getPath } from '../utils/taxPathUtils';

const JobAssignByXLSX = ({ students, jobDefinitions, onProcessingDone }) => {
  const { classId } = useUser();
  const { showFeedback } = useFeedback();
  const { fetchAllData } = useTaxContext();

  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  // ✅ 샘플 XLSX 다운로드
  const handleDownloadSampleXLSX = () => {
    const worksheetData = [
      ['학번', '이름', '직업명'],
      ['1', '김철수', '프로그래머'],
      ['2', '이영희', '디자이너'],
      ['3', '박지민', '없음'],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '직업배정샘플');

    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '직업배정_샘플파일.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = ({ target }) => {
    const file = target.files[0];
    if (!file || !classId) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const batch = writeBatch(db);
        let jobUpdatesCount = 0;
        const errors = [];

        for (const row of rows) {
          const studentNumberFromXLSX = (row.학번 || row.studentNumber)?.toString().trim();
          const jobNameFromXLSX = (row.직업명 || row.jobName)?.toString().trim();

          const student = students.find(
            s => String(s.studentNumber).trim() === studentNumberFromXLSX
          );

          if (!student) {
            errors.push(`학번 ${studentNumberFromXLSX} 학생을 찾을 수 없음.`);
            continue;
          }

          if (
            !jobDefinitions.some(jd => jd.name === jobNameFromXLSX) &&
            jobNameFromXLSX !== '없음'
          ) {
            errors.push(
              `직업명 '${jobNameFromXLSX}'이(가) 정의되지 않음 (학생: ${student.name})`
            );
            continue;
          }

          if (student.job !== jobNameFromXLSX) {
            const basePath = getPath('students', classId);
            const studentPath = `${basePath}/${student.uid}`;
            batch.update(doc(db, studentPath), { job: jobNameFromXLSX });
            jobUpdatesCount++;
          }
        }

        if (jobUpdatesCount > 0) {
          await batch.commit();
        }

        await fetchAllData();
        setPreviewData(rows); // ✅ 미리보기용 데이터 저장

        if (jobUpdatesCount > 0) {
          showFeedback(`총 ${jobUpdatesCount}건 업데이트 완료!`, 'success');
        }
        if (errors.length > 0) {
          showFeedback(`오류 ${errors.length}건 발생: ${errors.join(', ')}`, 'error');
        }

        if (onProcessingDone) onProcessingDone();

      } catch (err) {
        console.error(err);
        showFeedback("엑셀 파일 처리 중 오류 발생", "error");
      } finally {
        setIsProcessing(false);
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = null;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>📄 직업 배정 파일 업로드</Card.Title>
        <Card.Description>
          샘플 엑셀 파일을 다운로드해 수정한 뒤 업로드해주세요.
          <br />
          <span className="text-indigo-700 font-semibold">xlsx 형식만 지원</span>합니다.
        </Card.Description>
      </Card.Header>

      <Card.Content className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          />
          <Button
            variant="secondary"
            icon={UploadCloud}
            onClick={() => fileInputRef.current?.click()}
          >
            엑셀 파일 선택
          </Button>
          {fileName && <p className="text-sm text-slate-600 truncate flex-1" title={fileName}>{fileName}</p>}
          <Button onClick={handleDownloadSampleXLSX} variant="ghost" size="sm" icon={Download}>
            샘플 엑셀 다운로드
          </Button>
        </div>

        {isProcessing && <Spinner message="파일 처리 중..." />}

        {previewData.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">📋 미리보기 ({previewData.length}건)</h4>
            <div className="overflow-x-auto max-h-60 border rounded bg-white">
              <table className="w-full text-sm text-center">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-2 border-b">학번</th>
                    <th className="p-2 border-b">이름</th>
                    <th className="p-2 border-b">직업명</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 border-b">{row.학번 || row.studentNumber || '-'}</td>
                      <td className="p-2 border-b">{row.이름 || row.studentName || '-'}</td>
                      <td className="p-2 border-b">{row.직업명 || row.jobName || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default JobAssignByXLSX;
