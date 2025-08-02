// src/pages/tax/tabs/PayrollTab.jsx
import React, { useContext } from 'react';
import { Card, Button, InputField, Spinner, Alert, Badge, Checkbox, SelectField } from '../../../components/ui';
import JobAssignByCSV from '../components/JobAssignByXLSX';
import JobAssignByXLSX from '../components/JobAssignByXLSX';
import MultiJobSelector from '../components/MultiJobSelector';
import { usePayrollManager } from '../hooks/usePayrollManager';
import { useFeedback } from '../../../contexts/FeedbackContext';

const PayrollTab = () => {
    const { showFeedback } = useFeedback();

    const {
        students,
        jobDefinitions,
        isLoading,
        paymentStartDate, setPaymentStartDate,
        numberOfWeeksToPay, setNumberOfWeeksToPay,
        calculatedEndDate,
        editedStudentJobs,
        selectedStudentsForPayroll,
        paidStatus,
        individualPayProcessing,
        processingPayroll,
        handleSaveStudentJobs,
        handleStudentJobChange,
        handlePayIndividualSalary,
        handlePayJobSalary, // ✅ 새로운 다중 직업 급여 지급 함수
        handleProcessBulkPayroll,
        handleToggleStudentSelection,
        handleToggleSelectAllStudents,
        fetchAllData
    } = usePayrollManager();

    // 로딩 상태에 따른 UI
    if (isLoading.students || isLoading.jobDefinitions || isLoading.taxRules) {
        return <div className="text-center p-10"><Spinner message="급여 관리 데이터 로딩 중..." /></div>;
    }

    // ✅ Excel 처리 결과 핸들러 (중앙 집중식 피드백 관리)
    const handleExcelProcessingDone = async (result) => {
        console.log('Excel 처리 결과:', result);

        // 데이터 새로고침 강제 실행 (UI 업데이트 보장)
        await fetchAllData();

        // 통합된 피드백 메시지 (toastId로 중복 방지)
        if (result.success) {
            if (result.errorCount > 0 && result.updatedCount > 0) {
                showFeedback(
                    `📄 Excel 업로드 완료: ${result.updatedCount}명 성공, ${result.errorCount}건 오류`,
                    'warning',
                    { toastId: 'job-update-result', autoClose: 4000 }
                );
            } else if (result.updatedCount > 0) {
                showFeedback(
                    `📄 Excel: ${result.updatedCount}명의 직업이 업데이트되었습니다`,
                    'success',
                    { toastId: 'job-update-result', autoClose: 3000 }
                );
            } else if (result.errorCount > 0) {
                showFeedback(
                    `📄 Excel: ${result.errorCount}건의 오류가 발생했습니다`,
                    'error',
                    { toastId: 'job-update-result', autoClose: 4000 }
                );
            } else {
                showFeedback(
                    `📄 Excel: 모든 학생의 직업이 이미 최신 상태입니다`,
                    'info',
                    { toastId: 'job-update-result', autoClose: 3000 }
                );
            }
        } else {
            // Excel 처리 실패
            showFeedback(
                `📄 Excel 처리 실패: ${result.error}`,
                'error',
                { toastId: 'job-update-result', autoClose: 4000 }
            );
        }
    };

    // ✅ 개선된 직업 저장 핸들러 (불필요한 메시지 제거)
    const handleSaveJobsWithFeedback = async () => {
        try {
            console.log('=== 직업 저장 시작 ===');
            console.log('편집된 직업들:', editedStudentJobs);
            console.log('편집된 학생 수:', Object.keys(editedStudentJobs).length);

            if (Object.keys(editedStudentJobs).length === 0) {
                showFeedback(
                    '변경된 직업이 없습니다',
                    'warning',
                    { toastId: 'job-update-result', autoClose: 3000 }
                );
                return;
            }

            // 유효성 검사
            const invalidJobs = [];
            Object.entries(editedStudentJobs).forEach(([studentUid, jobData]) => {
                const student = students.find(s => s.uid === studentUid);
                const jobs = Array.isArray(jobData) ? jobData : [jobData];

                if (!student) {
                    invalidJobs.push(`학생 ID ${studentUid}: 학생을 찾을 수 없음`);
                }

                jobs.forEach(jobName => {
                    if (jobName !== "없음") {
                        const jobExists = jobDefinitions.find(j => j.name === jobName);
                        if (!jobExists) {
                            invalidJobs.push(`${student?.name || studentUid}: 직업 "${jobName}"이 존재하지 않음`);
                        }
                    }
                });
            });

            if (invalidJobs.length > 0) {
                console.error('유효하지 않은 직업 배정:', invalidJobs);
                showFeedback(
                    `유효하지 않은 직업: ${invalidJobs.join(', ')}`,
                    'error',
                    { toastId: 'job-update-result', autoClose: 5000 }
                );
                return;
            }

            // "저장 중..." 메시지 제거 (불필요)
            const result = await handleSaveStudentJobs();

            if (result && result.success) {
                showFeedback(
                    `✏️ 수동 변경: ${Object.keys(editedStudentJobs).length}명의 직업이 저장되었습니다`,
                    'success',
                    { toastId: 'job-update-result', autoClose: 3000 }
                );

                // 데이터 새로고침
                await fetchAllData();
                console.log('데이터 새로고침 완료');
            } else {
                throw new Error(result?.error || '저장 중 알 수 없는 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('직업 저장 오류:', error);
            showFeedback(
                `직업 저장 실패: ${error.message}`,
                'error',
                { toastId: 'job-update-result', autoClose: 4000 }
            );
        }
    };

    // ✅ 개선된 직업 변경 핸들러 (에러 메시지만 유지)
    const handleJobChangeWithValidation = (studentUid, jobData) => {
        try {
            console.log(`=== 직업 변경: 학생 ${studentUid} -> ${JSON.stringify(jobData)} ===`);

            const student = students.find(s => s.uid === studentUid);
            if (!student) {
                console.error('학생을 찾을 수 없음:', studentUid);
                showFeedback(
                    '학생 정보를 찾을 수 없습니다',
                    'error',
                    { toastId: 'job-validation-error', autoClose: 3000 }
                );
                return;
            }

            // 직업 데이터 정규화
            const newJobs = Array.isArray(jobData) ? jobData : [jobData];
            const validJobs = newJobs.filter(job => job && job !== "없음");

            // 기존 직업과 비교
            const currentJobs = Array.isArray(student.jobs)
                ? student.jobs.filter(job => job !== "없음")
                : (student.job && student.job !== "없음" ? [student.job] : []);

            // 동일한지 확인 (순서 무관)
            const isSame = validJobs.length === currentJobs.length &&
                validJobs.every(job => currentJobs.includes(job)) &&
                currentJobs.every(job => validJobs.includes(job));

            if (isSame) {
                console.log('동일한 직업으로 변경 시도, 편집 목록에서 제거');
                handleStudentJobChange(studentUid, null);
                return;
            }

            // 직업 유효성 검사
            for (const jobName of validJobs) {
                const jobExists = jobDefinitions.find(j => j.name === jobName);
                if (!jobExists) {
                    console.error('존재하지 않는 직업:', jobName);
                    showFeedback(
                        `직업 "${jobName}"이 존재하지 않습니다`,
                        'error',
                        { toastId: 'job-validation-error', autoClose: 3000 }
                    );
                    return;
                }
            }

            // 최종 데이터 설정
            const finalJobs = validJobs.length > 0 ? validJobs : ["없음"];
            handleStudentJobChange(studentUid, finalJobs);
            console.log('직업 변경 완료');
        } catch (error) {
            console.error('직업 변경 오류:', error);
            showFeedback(
                `직업 변경 실패: ${error.message}`,
                'error',
                { toastId: 'job-validation-error', autoClose: 3000 }
            );
        }
    };

    // 학생의 현재 직업 목록 가져오기 (편집된 것 우선)
    const getStudentJobs = (student) => {
        const hasEdit = editedStudentJobs.hasOwnProperty(student.uid);
        if (hasEdit) {
            const editedJobs = editedStudentJobs[student.uid];
            return Array.isArray(editedJobs) ? editedJobs : [editedJobs];
        }

        if (Array.isArray(student.jobs)) {
            return student.jobs;
        } else if (student.job) {
            return [student.job];
        }
        return ["없음"];
    };

    // 디버깅: 전체 상태 로그 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
        console.log('=== PayrollTab Debug Info ===');
        console.log('students:', students);
        console.log('jobDefinitions:', jobDefinitions);
        console.log('isLoading:', isLoading);
        console.log('editedStudentJobs:', editedStudentJobs);
        console.log('selectedStudentsForPayroll:', selectedStudentsForPayroll);
        console.log('===========================');
    }

    return (
        <div className="space-y-6">
            {/* 지급 기간 설정 및 일괄 지급 */}
            <Card>
                <Card.Header className="flex flex-col sm:flex-row justify-between items-center gap-2">
                    <Card.Title>🗓️ 지급 기간 설정 및 일괄 지급</Card.Title>
                    <Button
                        onClick={handleProcessBulkPayroll}
                        disabled={selectedStudentsForPayroll.size === 0 || isLoading.payroll}
                        isLoading={isLoading.payroll}
                        color="indigo"
                    >
                        선택된 {selectedStudentsForPayroll.size}명 일괄 지급
                    </Button>
                </Card.Header>
                <Card.Content className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <InputField
                        label="지급 시작일" type="date"
                        value={paymentStartDate} onChange={e => setPaymentStartDate(e.target.value)}
                    />
                    <InputField
                        label="지급 주 수" type="number"
                        value={numberOfWeeksToPay} onChange={e => setNumberOfWeeksToPay(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1} max={52} className="w-24"
                    />
                    <div className="flex items-end text-sm text-slate-600">
                        {calculatedEndDate && `(지급 기간: ${paymentStartDate} ~ ${calculatedEndDate})`}
                    </div>
                </Card.Content>
            </Card>

            {/* 학생 목록 및 직업 배정 */}
            <Card>
                <Card.Header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <Card.Title>👩‍🎓 학생별 직업 배정 및 개별 지급</Card.Title>
                        <Card.Description>학생의 직업을 변경하고 저장하거나, 직업별로 개별 급여를 지급할 수 있습니다. (최대 2개 직업)</Card.Description>
                    </div>
                    <div className="flex gap-2">
                        {Object.keys(editedStudentJobs).length > 0 && (
                            <Alert variant="info" className="text-sm">
                                {Object.keys(editedStudentJobs).length}건의 변경사항이 있습니다.
                            </Alert>
                        )}
                        <Button
                            onClick={handleSaveJobsWithFeedback}
                            disabled={Object.keys(editedStudentJobs).length === 0 || isLoading.savingJobs}
                            isLoading={isLoading.savingJobs}
                            color="green"
                        >
                            변경된 직업 저장 ({Object.keys(editedStudentJobs).length}건)
                        </Button>
                    </div>
                </Card.Header>
                <Card.Content className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1100px]">
                        <thead className="text-center text-xs text-slate-500 bg-slate-100">
                            <tr>
                                <th className="p-3 w-12">
                                    <Checkbox
                                        checked={students.length > 0 && selectedStudentsForPayroll.size === students.length}
                                        onChange={handleToggleSelectAllStudents}
                                    />
                                </th>
                                <th className="p-3 w-24">학번</th>
                                <th className="p-3 w-32">이름</th>
                                <th className="p-3 w-64">현재 직업 (최대 2개)</th>
                                <th className="p-3 w-32 text-right">주급 정보</th>
                                <th className="p-3 w-32">지급 상태</th>
                                <th className="p-3 w-40">개별 지급</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.map(student => {
                                const hasEdit = editedStudentJobs.hasOwnProperty(student.uid);
                                const displayJobs = getStudentJobs(student);
                                const validJobs = displayJobs.filter(job => job && job !== "없음");

                                return (
                                    <tr key={student.uid} className={`hover:bg-slate-50 ${hasEdit ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-white'}`}>
                                        <td className="p-2 text-center">
                                            <Checkbox
                                                checked={selectedStudentsForPayroll.has(student.uid)}
                                                onChange={() => handleToggleStudentSelection(student.uid)}
                                            />
                                        </td>
                                        <td className="p-3 text-center">{student.studentNumber || '-'}</td>
                                        <td className="p-3 text-center font-medium text-slate-800">
                                            {student.name}
                                            {hasEdit && <span className="ml-1 text-yellow-600 text-xs">●</span>}
                                        </td>
                                        <td className="p-2">
                                            <MultiJobSelector
                                                student={student}
                                                jobDefinitions={jobDefinitions}
                                                onChange={handleJobChangeWithValidation}
                                                disabled={isLoading.savingJobs || isLoading.payroll || individualPayProcessing[student.uid]}
                                                editedJobs={editedStudentJobs}
                                            />
                                            {hasEdit && (
                                                <div className="text-xs text-yellow-700 mt-1">
                                                    원래: {Array.isArray(student.jobs)
                                                        ? student.jobs.filter(job => job !== "없음").join(', ') || '없음'
                                                        : (student.job || '없음')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {validJobs.length > 0 ? (
                                                <div className="space-y-1">
                                                    {validJobs.map(jobName => {
                                                        const jobDef = jobDefinitions.find(jd => jd.name === jobName);
                                                        const salary = jobDef ? jobDef.baseSalary : 0;
                                                        return (
                                                            <div key={jobName} className="text-sm">
                                                                <div className="font-medium text-slate-700">{jobName}</div>
                                                                <div className="text-slate-500">{salary.toLocaleString()}/주</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-slate-400">-</div>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            {validJobs.length === 0 ? (
                                                <Badge color="blue">지급대상 아님</Badge>
                                            ) : (
                                                <div className="space-y-1">
                                                    {validJobs.map(jobName => {
                                                        const paidKey = `${student.uid}_${jobName}_${paymentStartDate}_${numberOfWeeksToPay}`;
                                                        const isPaid = paidStatus[paidKey] === 'paid';
                                                        const processingKey = `${student.uid}_${jobName}`;
                                                        const isJobProcessing = individualPayProcessing[processingKey];

                                                        return (
                                                            <div key={jobName} className="flex items-center justify-center">
                                                                <Badge
                                                                    color={isPaid ? "green" : isJobProcessing ? "yellow" : "gray"}
                                                                    size="sm"
                                                                >
                                                                    {jobName}: {isPaid ? "완료" : isJobProcessing ? "처리중" : "미지급"}
                                                                </Badge>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            {validJobs.length === 0 ? (
                                                <Badge color="blue" size="sm">지급불가</Badge>
                                            ) : (
                                                <div className="space-y-1">
                                                    {validJobs.map(jobName => {
                                                        const jobDef = jobDefinitions.find(jd => jd.name === jobName);
                                                        const salary = jobDef ? jobDef.baseSalary : 0;
                                                        const paidKey = `${student.uid}_${jobName}_${paymentStartDate}_${numberOfWeeksToPay}`;
                                                        const isPaid = paidStatus[paidKey] === 'paid';
                                                        const processingKey = `${student.uid}_${jobName}`;
                                                        const isJobProcessing = individualPayProcessing[processingKey];

                                                        return (
                                                            <div key={jobName} className="flex items-center gap-1">
                                                                <Button
                                                                    size="xs"
                                                                    onClick={() => {
                                                                        console.log(`=== ${jobName} 급여 지급: ${student.name} ===`);
                                                                        handlePayJobSalary(student.uid, jobName);
                                                                    }}
                                                                    disabled={isPaid || isJobProcessing || isLoading.payroll || salary <= 0}
                                                                    isLoading={isJobProcessing}
                                                                    className="flex-1 text-xs"
                                                                >
                                                                    {jobName}
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card.Content>
            </Card>

            {/* ✅ Excel 일괄 직업 배정 - 중앙 집중식 피드백 관리 */}
            <JobAssignByXLSX
                students={students}
                jobDefinitions={jobDefinitions}
                onProcessingDone={handleExcelProcessingDone}
            />

        </div>
    );
};

export default PayrollTab;