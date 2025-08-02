import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { useTaxContext } from '../../../contexts/TaxContext';

import { db } from '../../../firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { Card, Button, Spinner, Alert } from '../../../components/ui';
import { UploadCloud, Download, Info } from 'lucide-react';
import { getPath } from '../utils/taxPathUtils';

const JobAssignByXLSX = ({ students, jobDefinitions, onProcessingDone }) => {
  const { classId } = useUser();
  const { showFeedback, dismissFeedback } = useFeedback();
  const { fetchAllData } = useTaxContext();

  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [processingToastId, setProcessingToastId] = useState(null);
  const [lastProcessingResult, setLastProcessingResult] = useState(null); // ✅ 추가

  // ✅ 다중 직업 별도 컬럼 지원 샘플 XLSX 다운로드
  const handleDownloadSampleXLSX = () => {
    const worksheetData = [
      ['학번', '이름', '직업1', '직업2', '직업3', '직업4', '직업5'],
      ['1', '김철수', '프로그래머', '', '', '', ''],
      ['2', '이영희', '디자이너', '청소부', '', '', ''],
      ['3', '박지민', '없음', '', '', '', ''],
      ['4', '최민수', '급식도우미', '환경미화원', '체육도우미', '', ''],
      ['5', '정수아', '도서관 사서', '방송부', '학급 관리자', '보건실 도우미', ''],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // 컬럼 너비 설정
    worksheet['!cols'] = [
      { width: 10 }, // 학번
      { width: 15 }, // 이름
      { width: 20 }, // 직업1
      { width: 20 }, // 직업2
      { width: 20 }, // 직업3
      { width: 20 }, // 직업4
      { width: 20 }, // 직업5
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '직업배정샘플');

    const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '직업배정_샘플파일_다중직업.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ✅ 여러 컬럼에서 직업들을 추출하는 함수
  const extractJobsFromRow = (row) => {
    const jobColumns = ['직업1', '직업2', '직업3', '직업4', '직업5', '직업6', '직업7', '직업8'];
    const jobs = [];

    // 직업1부터 직업N까지 순차적으로 확인
    jobColumns.forEach((colName, index) => {
      const jobValue = (row[colName] || row[`job${index + 1}`])?.toString().trim();
      if (jobValue && jobValue !== '' && jobValue !== '없음') {
        jobs.push(jobValue);
      }
    });

    // 빈 배열이면 "없음" 반환
    return jobs.length > 0 ? jobs : ['없음'];
  };

  // ✅ 직업 유효성 검사 함수
  const validateJobs = (jobs, studentName) => {
    const errors = [];

    for (const jobName of jobs) {
      if (jobName !== '없음' && !jobDefinitions.some(jd => jd.name === jobName)) {
        errors.push(`직업명 '${jobName}'이(가) 정의되지 않음 (학생: ${studentName})`);
      }
    }

    return errors;
  };

  // ✅ 확인 버튼 핸들러
  const handleConfirmAndApply = () => {
    if (lastProcessingResult && onProcessingDone) {
      // PayrollTab에 결과 전달하여 데이터 새로고침 및 피드백
      onProcessingDone(lastProcessingResult);

      // 미리보기 및 결과 초기화
      setPreviewData([]);
      setLastProcessingResult(null);
    }
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

        console.log(`📊 Excel 파일 읽기 완료: ${rows.length}행 발견`);

        const batch = writeBatch(db);
        let jobUpdatesCount = 0;
        const errors = [];
        const processedData = [];

        for (const [index, row] of rows.entries()) {
          const studentNumberFromXLSX = (row.학번 || row.studentNumber)?.toString().trim();

          // 학생 찾기
          const student = students.find(
            s => String(s.studentNumber).trim() === studentNumberFromXLSX
          );

          if (!student) {
            errors.push(`학번 ${studentNumberFromXLSX} 학생을 찾을 수 없음.`);
            processedData.push({
              ...row,
              status: 'error',
              message: '학생을 찾을 수 없음',
              extractedJobs: [],
              studentName: '알 수 없음'
            });
            continue;
          }

          // 여러 컬럼에서 직업들 추출
          const extractedJobs = extractJobsFromRow(row);

          // 직업 유효성 검사
          const jobErrors = validateJobs(extractedJobs, student.name);
          if (jobErrors.length > 0) {
            errors.push(...jobErrors);
            processedData.push({
              ...row,
              status: 'error',
              message: '유효하지 않은 직업명',
              extractedJobs: extractedJobs,
              studentName: student.name
            });
            continue;
          }

          // 기존 직업과 비교
          const currentJobs = Array.isArray(student.jobs)
            ? student.jobs.filter(job => job !== "없음")
            : (student.job && student.job !== "없음" ? [student.job] : []);

          const newJobs = extractedJobs.filter(job => job !== "없음");

          // 직업이 변경되었는지 확인 (순서 무관)
          const isChanged = newJobs.length !== currentJobs.length ||
            !newJobs.every(job => currentJobs.includes(job)) ||
            !currentJobs.every(job => newJobs.includes(job));

          if (isChanged) {
            const basePath = getPath('students', classId);
            const studentPath = `${basePath}/${student.uid}`;

            // 다중 직업 저장 (jobs 배열과 호환성을 위한 job 필드)
            const updateData = {
              jobs: extractedJobs,
              job: extractedJobs[0] || "없음"
            };

            batch.update(doc(db, studentPath), updateData);
            jobUpdatesCount++;

            console.log(`${student.name} 직업 업데이트:`, { 이전: currentJobs, 변경후: extractedJobs });

            processedData.push({
              ...row,
              status: 'updated',
              message: '업데이트됨',
              extractedJobs: extractedJobs,
              previousJobs: currentJobs,
              studentName: student.name
            });
          } else {
            processedData.push({
              ...row,
              status: 'unchanged',
              message: '변경사항 없음',
              extractedJobs: extractedJobs,
              studentName: student.name
            });
          }
        }

        console.log(`처리 결과: 업데이트 ${jobUpdatesCount}건, 오류 ${errors.length}건`);
        console.log('processedData:', processedData); // 디버깅

        // 배치 커밋
        if (jobUpdatesCount > 0) {
          await batch.commit();
        }

        // ✅ 미리보기 데이터 먼저 설정
        setPreviewData(processedData);
        console.log('미리보기 데이터 설정 완료:', processedData.length, '건'); // 디버깅

        // ✅ 기존 토스트 제거
        toast.dismiss();

        console.log('Excel 처리 완료:', { jobUpdatesCount, errorsCount: errors.length });

        // ✅ 결과를 저장해두고 확인 버튼 클릭 시 전달
        setLastProcessingResult({
          type: 'excel-upload',
          success: true,
          updatedCount: jobUpdatesCount,
          errorCount: errors.length,
          errors: errors,
          processedData: processedData
        });

      } catch (err) {
        console.error('엑셀 파일 처리 오류:', err);
        toast.dismiss();

        // 에러도 부모 컴포넌트에 전달
        if (onProcessingDone) {
          onProcessingDone({
            type: 'excel-upload',
            success: false,
            error: err.message,
            updatedCount: 0,
            errorCount: 1
          });
        }
      } finally {
        setIsProcessing(false);
        setFileName('');
        if (fileInputRef.current) fileInputRef.current.value = null;
        setProcessingToastId(null);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>📄 직업 배정 파일 업로드 (무제한 다중 직업)</Card.Title>
        <Card.Description>
          샘플 엑셀 파일을 다운로드해 수정한 뒤 업로드해주세요.
          <br />
          <span className="text-indigo-700 font-semibold">xlsx 형식만 지원</span>합니다.
        </Card.Description>
      </Card.Header>

      <Card.Content className="space-y-4">
        {/* 다중 직업 안내 */}
        <Alert variant="info" className="mb-4">
          <Info className="h-4 w-4" />
          <div>
            <strong>무제한 다중 직업 사용법:</strong>
            <ul className="mt-1 text-sm list-disc list-inside space-y-1">
              <li>각 학생에게 원하는 만큼 직업을 배정할 수 있습니다</li>
              <li><strong>별도 컬럼</strong>에 각각 입력합니다: <code>직업1</code>, <code>직업2</code>, <code>직업3</code>...</li>
              <li>빈 칸은 자동으로 무시됩니다</li>
              <li>직업이 없는 경우 직업1에 <code>없음</code>을 입력하거나 모든 직업 컬럼을 비워두세요</li>
            </ul>
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
              <strong>예시:</strong>
              <table className="mt-1 text-xs">
                <thead>
                  <tr>
                    <td className="pr-2 font-medium">학번</td>
                    <td className="pr-2 font-medium">이름</td>
                    <td className="pr-2 font-medium">직업1</td>
                    <td className="pr-2 font-medium">직업2</td>
                    <td className="pr-2 font-medium">직업3</td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pr-2">001</td>
                    <td className="pr-2">김철수</td>
                    <td className="pr-2">청소부</td>
                    <td className="pr-2">도서관사서</td>
                    <td className="pr-2">급식도우미</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Alert>

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
            disabled={isProcessing}
          >
            엑셀 파일 선택
          </Button>
          {fileName && <p className="text-sm text-slate-600 truncate flex-1" title={fileName}>{fileName}</p>}
          <Button
            onClick={handleDownloadSampleXLSX}
            variant="ghost"
            size="sm"
            icon={Download}
            disabled={isProcessing}
          >
            샘플 엑셀 다운로드
          </Button>
        </div>

        {isProcessing && <Spinner message="파일 처리 중..." />}

        {/* ✅ 미리보기 테이블 (확인 버튼 포함) */}
        {previewData.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold">📋 처리 결과 미리보기 ({previewData.length}건)</h4>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPreviewData([]);
                    setLastProcessingResult(null);
                  }}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  color="green"
                  onClick={handleConfirmAndApply}
                  disabled={!lastProcessingResult}
                >
                  확인 및 적용
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-60 border rounded bg-white">
              <table className="w-full text-sm text-center">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="p-2 border-b">학번</th>
                    <th className="p-2 border-b">이름</th>
                    <th className="p-2 border-b">추출된 직업들</th>
                    <th className="p-2 border-b">이전 직업</th>
                    <th className="p-2 border-b">상태</th>
                    <th className="p-2 border-b">메시지</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50 ${row.status === 'error' ? 'bg-red-50' :
                        row.status === 'updated' ? 'bg-green-50' :
                          'bg-gray-50'
                      }`}>
                      <td className="p-2 border-b">{row.학번 || row.studentNumber || '-'}</td>
                      <td className="p-2 border-b">{row.studentName || '-'}</td>
                      <td className="p-2 border-b">
                        {row.extractedJobs && row.extractedJobs.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {row.extractedJobs.map((job, jobIdx) => (
                              <span
                                key={jobIdx}
                                className={`px-2 py-1 rounded text-xs ${job === '없음' ? 'bg-gray-200 text-gray-600' : 'bg-blue-200 text-blue-800'
                                  }`}
                              >
                                {job}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="p-2 border-b">
                        {row.previousJobs && row.previousJobs.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {row.previousJobs.map((job, jobIdx) => (
                              <span
                                key={jobIdx}
                                className="px-2 py-1 rounded text-xs bg-yellow-200 text-yellow-800"
                              >
                                {job}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">없음</span>
                        )}
                      </td>
                      <td className="p-2 border-b">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${row.status === 'error' ? 'bg-red-200 text-red-800' :
                            row.status === 'updated' ? 'bg-green-200 text-green-800' :
                              'bg-gray-200 text-gray-800'
                          }`}>
                          {row.status === 'error' ? '오류' :
                            row.status === 'updated' ? '업데이트' :
                              '변경없음'}
                        </span>
                      </td>
                      <td className="p-2 border-b text-xs">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 통계 정보 */}
            <div className="mt-2 flex gap-4 text-xs text-slate-600">
              <span>업데이트: {previewData.filter(row => row.status === 'updated').length}건</span>
              <span>변경없음: {previewData.filter(row => row.status === 'unchanged').length}건</span>
              <span>오류: {previewData.filter(row => row.status === 'error').length}건</span>
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default JobAssignByXLSX;