// src/pages/tax/tabs/JobDefinitionTab.jsx

import React, { useState } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { useJobDefinitionsManager } from '../hooks/useJobDefinitionsManager';
import JobDefinitionByXLSX from '../components/JobDefinitionByXLSX';
import JobRowEditable from '../components/JobRowEditable';
import { Card, Button, InputField, Spinner } from '../../../components/ui';
import { Plus } from 'lucide-react';

const JobDefinitionTab = () => {
    const { classData } = useUser();
    const currencyUnit = classData?.currencyUnit || '단위';

    const {
        jobDefinitions, isLoading, fetchAllData: refreshJobs,
        handleAddJob, handleUpdateJob, handleDeleteJob
    } = useJobDefinitionsManager();

    const [newJobName, setNewJobName] = useState('');
    const [newJobSalary, setNewJobSalary] = useState('');

    const onAddJobClick = async () => {
        // handleAddJob이 성공하면 입력 필드를 초기화하도록 콜백 전달
        await handleAddJob(newJobName, newJobSalary, () => {
            setNewJobName('');
            setNewJobSalary('');
        });
    };

    if (isLoading.list && jobDefinitions.length === 0) {
        return <div className="text-center p-10"><Spinner message="직업 정의 데이터 로딩 중..." /></div>;
    }

    return (
        <div className="space-y-6">
            {/* 직업 목록 및 개별 추가 카드 */}
            <Card>
                <Card.Header>
                    <Card.Title>📋 직업 목록 및 주급 설정</Card.Title>
                    <Card.Description>직업을 추가, 수정, 삭제할 수 있습니다. 주급은 1주 기준입니다.</Card.Description>
                </Card.Header>
                <Card.Content className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-xs text-slate-500 bg-slate-100">
                            <tr>
                                <th className="p-3 font-semibold w-1/2">직업명</th>
                                <th className="p-3 font-semibold w-48 text-right">주급 ({currencyUnit})</th>
                                <th className="p-3 font-semibold w-48 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {jobDefinitions.map((job) => (
                                <JobRowEditable
                                    key={job.id}
                                    job={job}
                                    onUpdate={handleUpdateJob}
                                    onDelete={() => handleDeleteJob(job.id, job.name)} // ✅ 이름까지 전달
                                    isLoading={isLoading.delete || isLoading.update}
                                    currencyUnit={currencyUnit}
                                />
                            ))}
                            {/* --- 새 직업 추가 행 --- */}
                            <tr className="bg-slate-50/50">
                                <td className="p-2">
                                    <InputField
                                        placeholder="새 직업명 입력..."
                                        value={newJobName}
                                        onChange={(e) => setNewJobName(e.target.value)}
                                        disabled={isLoading.add}
                                    />
                                </td>
                                <td className="p-2">
                                    <InputField
                                        type="number"
                                        placeholder="주급 입력..."
                                        value={newJobSalary}
                                        onChange={(e) => setNewJobSalary(e.target.value)}
                                        min="0"
                                        disabled={isLoading.add}
                                        className="text-right"
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <Button
                                        size="sm"
                                        color="indigo"
                                        onClick={onAddJobClick}
                                        disabled={!newJobName.trim() || !newJobSalary || isLoading.add}
                                        isLoading={isLoading.add}
                                        icon={Plus}
                                    >
                                        추가
                                    </Button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    {jobDefinitions.length === 0 && !isLoading.list && (
                        <div className="text-slate-500 text-center py-10">등록된 직업이 없습니다. 새 직업을 추가하거나 CSV로 업로드하세요.</div>
                    )}
                </Card.Content>
            </Card>

            {/* CSV 업로드 카드 */}
            <JobDefinitionByXLSX
                jobDefinitions={jobDefinitions}
                onProcessingDone={refreshJobs}
            />
        </div>
    );
};

export default JobDefinitionTab;