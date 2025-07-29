// src/pages/tax/tabs/PayrollTab.jsx
import React, { useContext } from 'react';
import { Card, Button, InputField, Spinner, Alert, Badge, Checkbox, SelectField } from '../../../components/ui';
import JobAssignByCSV from '../components/JobAssignByXLSX';
import { usePayrollManager } from '../hooks/usePayrollManager';

const PayrollTab = () => {
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
        showFeedback,
        handleSaveStudentJobs,
        handleStudentJobChange,
        handlePayIndividualSalary,
        handleProcessBulkPayroll,
        handleToggleStudentSelection,
        handleToggleSelectAllStudents,
        fetchAllData
    } = usePayrollManager();

    // 로딩 상태에 따른 UI
    if (isLoading.students || isLoading.jobDefinitions || isLoading.taxRules) {
        return <div className="text-center p-10"><Spinner message="급여 관리 데이터 로딩 중..." /></div>;
    }

    // 디버깅: 전체 상태 로그
    console.log('=== PayrollTab Debug Info ===');
    console.log('students:', students);
    console.log('jobDefinitions:', jobDefinitions);
    console.log('isLoading:', isLoading);
    console.log('paymentStartDate:', paymentStartDate);
    console.log('numberOfWeeksToPay:', numberOfWeeksToPay);
    console.log('editedStudentJobs:', editedStudentJobs);
    console.log('selectedStudentsForPayroll:', selectedStudentsForPayroll);
    console.log('paidStatus:', paidStatus);
    console.log('individualPayProcessing:', individualPayProcessing);
    console.log('===========================');

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
                        <Card.Description>학생의 직업을 변경하고 저장하거나, 개별적으로 급여를 지급할 수 있습니다.</Card.Description>
                    </div>
                    <Button
                        onClick={handleSaveStudentJobs}
                        disabled={Object.keys(editedStudentJobs).length === 0 || isLoading.savingJobs}
                        isLoading={isLoading.savingJobs}
                        color="green"
                    >
                        변경된 직업 저장 ({Object.keys(editedStudentJobs).length}건)
                    </Button>
                </Card.Header>
                <Card.Content className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[900px]">
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
                                <th className="p-3 w-52">현재 직업</th>
                                <th className="p-3 w-24 text-right">주급</th>
                                <th className="p-3 w-32">지급 상태</th>
                                <th className="p-3 w-32">개별 지급</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.map(student => {
                                const displayJobName = (editedStudentJobs || {})[student.uid] || student.job || "없음";
                                const paidKey = `${student.uid}_${paymentStartDate}_${numberOfWeeksToPay}`;
                                const status = (paidStatus || {})[paidKey];
                                const isProcessing = (individualPayProcessing || {})[student.uid];
                                // 기본 권한(교사, 관리자 등)은 급여 지급 대상이 아니지만, 다른 직업 선택 시에는 지급 가능
                                const isNonPayableRole = ['교사', '관리자', '선생님', '없음'].includes(displayJobName);
                                const jobDef = jobDefinitions.find(jd => jd.name === displayJobName);
                                const weeklySalary = jobDef ? jobDef.baseSalary : 0;

                                // 디버깅: 각 학생별 상세 정보
                                console.log(`--- 학생 디버그: ${student.name} ---`);
                                console.log('학생 UID:', student.uid);
                                console.log('학생 원본 직업:', student.job);
                                console.log('편집된 직업:', editedStudentJobs[student.uid]);
                                console.log('표시될 직업명:', displayJobName);
                                console.log('JobDefinitions 전체:', jobDefinitions.map(jd => ({ name: jd.name, id: jd.id, baseSalary: jd.baseSalary })));
                                console.log('찾기 시도 - 직업명 매칭:', jobDefinitions.find(jd => jd.name === displayJobName));
                                console.log('찾기 시도 - 직업명 트림 매칭:', jobDefinitions.find(jd => jd.name?.trim() === displayJobName?.trim()));
                                console.log('지급불가 역할 여부:', isNonPayableRole);
                                console.log('찾은 직업 정의:', jobDef);
                                console.log('주급:', weeklySalary);
                                console.log('지급 키:', paidKey);
                                console.log('지급 상태:', status);
                                console.log('개별 처리중:', isProcessing);
                                console.log('버튼 비활성화 조건:');
                                console.log('  - 이미 지급됨:', status === 'paid');
                                console.log('  - 처리중:', isProcessing);
                                console.log('  - 전체 급여처리중:', isLoading.payroll);
                                console.log('  - 주급이 0 이하:', weeklySalary <= 0);
                                console.log('버튼 최종 비활성화:', status === 'paid' || isProcessing || isLoading.payroll || weeklySalary <= 0);
                                console.log('----------------------------');

                                return (
                                    <tr key={student.uid} className={`hover:bg-slate-50 ${editedStudentJobs[student.uid] ? 'bg-yellow-50' : 'bg-white'}`}>
                                        <td className="p-2 text-center">
                                            <Checkbox
                                                checked={selectedStudentsForPayroll.has(student.uid)}
                                                onChange={() => handleToggleStudentSelection(student.uid)}
                                            />
                                        </td>
                                        <td className="p-3 text-center">{student.studentNumber || '-'}</td>
                                        <td className="p-3 text-center font-medium text-slate-800">{student.name}</td>
                                        <td className="p-2">
                                            <SelectField
                                                value={displayJobName}
                                                onChange={e => handleStudentJobChange(student.uid, e.target.value)}
                                                disabled={isLoading.savingJobs || isLoading.payroll || isProcessing}
                                                className="w-full"
                                            >
                                                <option value="없음">없음</option>
                                                {jobDefinitions.map(job => (
                                                    <option key={job.id} value={job.name}>{job.name}</option>
                                                ))}
                                            </SelectField>
                                        </td>
                                        <td className="p-3 text-right font-semibold">{weeklySalary.toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            {isNonPayableRole ? (
                                                <Badge color="blue">지급대상 아님</Badge>
                                            ) : (
                                                status === 'paid' ? <Badge color="green">지급완료</Badge> :
                                                    status === 'pending' || isProcessing ? <Badge color="yellow">처리중</Badge> :
                                                        status?.startsWith('failed') ? <Badge color="red">오류</Badge> :
                                                            <Badge color="gray">미지급</Badge>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <Button
                                                size="xs"
                                                onClick={() => {
                                                    console.log(`=== 지급 버튼 클릭: ${student.name} ===`);
                                                    console.log('학생 UID:', student.uid);
                                                    console.log('주급:', weeklySalary);
                                                    console.log('지급 시작일:', paymentStartDate);
                                                    console.log('지급 주수:', numberOfWeeksToPay);
                                                    console.log('지급불가 역할 여부:', isNonPayableRole);
                                                    console.log('handlePayIndividualSalary 호출 시작');
                                                    handlePayIndividualSalary(student.uid);
                                                    console.log('handlePayIndividualSalary 호출 완료');
                                                    console.log('===============================');
                                                }}
                                                disabled={status === 'paid' || isProcessing || isLoading.payroll || weeklySalary <= 0 || isNonPayableRole}
                                            >
                                                {isNonPayableRole ? '지급불가' : '지급'}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Card.Content>
            </Card>

            {/* CSV 일괄 직업 배정 */}
            <Card>
                <Card.Header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                        <Card.Title>📄 CSV 일괄 직업 배정</Card.Title>
                        <Card.Description>CSV 파일을 업로드하여 학생들의 직업을 일괄 배정할 수 있습니다.</Card.Description>
                    </div>
                </Card.Header>
                <Card.Content>
                    <JobAssignByCSV
                        students={students}
                        jobDefinitions={jobDefinitions}
                        onProcessingDone={async () => {
                            console.log('CSV 처리 완료, 데이터 새로고침 시작');
                            await fetchAllData(); // ✅ 이거 하나로 모든 데이터 새로고침
                            showFeedback("CSV 처리가 완료되었습니다!", 'success');
                            console.log('데이터 새로고침 완료');
                        }}
                    />
                </Card.Content>
            </Card>
        </div>
    );
};

export default PayrollTab;