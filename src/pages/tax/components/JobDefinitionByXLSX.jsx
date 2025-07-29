import React, { useState, useRef } from 'react';
import { db } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { getPath } from '../utils/taxPathUtils';
import * as XLSX from 'xlsx';

import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Card, Button, Spinner, Badge } from '../../../components/ui';
import { Download, UploadCloud } from 'lucide-react';

const JobDefinitionByCSV = ({ onProcessingDone, jobDefinitions }) => {
    const { classId } = useUser();
    const { showFeedback } = useFeedback();

    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [jobsToProcess, setJobsToProcess] = useState([]);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileName(file.name);
        setJobsToProcess([]);
        setIsProcessing(true);
        showFeedback('파일 분석 중...', 'info');

        const reader = new FileReader();
        reader.readAsArrayBuffer(file);

        reader.onload = (event) => {
            try {
                const bufferArray = event.target.result;
                const wb = XLSX.read(bufferArray, { type: 'buffer' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const existingJobNames = new Set(jobDefinitions.map(j => j.name.toLowerCase()));

                const processedData = data.map(row => {
                    const nameValue = (row['직업명'] || row['jobName'] || row['name'] || '');
                    const salaryValue = (row['주급'] || row['baseSalary'] || row['salary'] || '');

                    const name = String(nameValue).trim();
                    const baseSalary = parseInt(String(salaryValue).trim(), 10);

                    if (!name || isNaN(baseSalary)) {
                        return { name: name || '이름 없음', baseSalary: '유효하지 않음', status: 'invalid' };
                    }

                    const isExisting = existingJobNames.has(name.toLowerCase());
                    return { name, baseSalary, status: isExisting ? 'update' : 'new' };
                }).filter(item => item.name);

                if (processedData.length === 0) {
                    showFeedback('엑셀에서 유효한 데이터를 찾을 수 없습니다.', 'warning');
                } else {
                    showFeedback(`분석 완료: ${processedData.length}건 확인.`, 'success');
                }

                setJobsToProcess(processedData);
            } catch (error) {
                showFeedback('파일 처리 중 오류가 발생했습니다.', 'error');
                console.error('Error processing file:', error);
            } finally {
                setIsProcessing(false);
            }
        };

        reader.onerror = () => {
            showFeedback('파일을 읽는 데 실패했습니다.', 'error');
            setIsProcessing(false);
        };

        e.target.value = null;
    };

    const handleUpload = async () => {
        const validJobs = jobsToProcess.filter(job => job.status !== 'invalid');
        if (!classId || validJobs.length === 0) {
            showFeedback('업로드할 유효한 직업 정보가 없습니다.', 'warning');
            return;
        }

        setIsUploading(true);
        const batch = writeBatch(db);

        validJobs.forEach(job => {
            const docRef = doc(db, getPath('jobDefinition', classId, { docId: job.name }));
            const jobData = { name: job.name, baseSalary: job.baseSalary, updatedAt: serverTimestamp() };

            if (job.status === 'new') {
                batch.set(docRef, { ...jobData, createdAt: serverTimestamp() });
            } else {
                batch.update(docRef, jobData);
            }
        });

        try {
            await batch.commit();
            showFeedback(`총 ${validJobs.length}건의 직업 정보가 성공적으로 반영되었습니다.`, 'success');
            if (onProcessingDone) onProcessingDone();
            setJobsToProcess([]);
            setFileName('');
        } catch (err) {
            showFeedback('업로드 중 오류 발생: ' + err.message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const handleDownloadSample = () => {
        const worksheetData = [
            ['직업명', '주급'],
            ['프로그래머', 200],
            ['디자이너', 180]
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '직업정의샘플');

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', '직업정의_샘플.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Card>
            <Card.Header>
                <Card.Title>📄 직업 정의 파일 업로드/수정</Card.Title>
                <Card.Description>
                    아래의 샘플 엑셀 파일을 다운로드한 뒤 수정하여 업로드하세요. <br />
                    <span className="text-indigo-700 font-semibold">xlsx 형식만 지원</span>합니다.
                </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <Button
                        variant="secondary"
                        icon={UploadCloud}
                        disabled={isProcessing}
                        onClick={handleButtonClick}
                    >
                        엑셀 파일 선택
                    </Button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={handleFileChange}
                        disabled={isProcessing}
                    />

                    {fileName && <p className="text-sm text-slate-600 truncate flex-1" title={fileName}>{fileName}</p>}
                    <Button onClick={handleDownloadSample} variant="ghost" size="sm" icon={Download} disabled={isProcessing}>
                        샘플 엑셀 다운로드
                    </Button>
                </div>

                {isProcessing && <Spinner message="파일 분석 중..." />}

                {!isProcessing && jobsToProcess.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                        <h4 className="font-semibold text-sm text-slate-700">업로드 될 내용 확인 ({jobsToProcess.length}건)</h4>
                        <div className="overflow-x-auto border rounded-md max-h-60 bg-white">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 text-center sticky top-0">
                                    <tr>
                                        <th className="p-2 border-b font-semibold">상태</th>
                                        <th className="p-2 border-b font-semibold">직업명</th>
                                        <th className="p-2 border-b font-semibold">주급</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobsToProcess.map((job, idx) => (
                                        <tr key={idx} className={job.status === 'invalid' ? 'bg-red-50 text-red-500' : ''}>
                                            <td className="p-2 border-b text-center">
                                                {job.status === 'new' && <Badge color="green">신규</Badge>}
                                                {job.status === 'update' && <Badge color="sky">수정</Badge>}
                                                {job.status === 'invalid' && <Badge color="red">오류</Badge>}
                                            </td>
                                            <td className="p-2 border-b text-center">{job.name}</td>
                                            <td className="p-2 border-b text-right">{typeof job.baseSalary === 'number' ? job.baseSalary.toLocaleString() : job.baseSalary}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Button onClick={handleUpload} disabled={isUploading} isLoading={isUploading} color="indigo" className="w-full mt-2">
                            확인 및 업로드
                        </Button>
                    </div>
                )}
            </Card.Content>
        </Card>
    );
};

export default JobDefinitionByCSV;
