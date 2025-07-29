// src/pages/tax/components/JobRowEditable.jsx

import React, { useState, useEffect } from 'react';
import { InputField, Button } from '../../../components/ui';
import { Save, Trash2 } from 'lucide-react'; // 저장, 삭제 아이콘

const JobRowEditable = ({ job, onUpdate, onDelete, isLoading, currencyUnit }) => {
    const [editedSalary, setEditedSalary] = useState(job.baseSalary);

    // 부모로부터 받은 데이터(prop)가 변경되면(예: CSV 업로드 후 새로고침)
    // 내부 상태도 그에 맞춰 동기화합니다.
    useEffect(() => {
        setEditedSalary(job.baseSalary);
    }, [job.baseSalary]);

    // '저장' 버튼 클릭 핸들러
    const handleUpdateClick = () => {
        const parsedSalary = parseInt(editedSalary, 10);
        if (isNaN(parsedSalary) || parsedSalary < 0) {
            alert("올바른 주급(0 이상)을 입력하세요.");
            return;
        }
        // id를 사용하여 업데이트
        onUpdate(job.id, { baseSalary: parsedSalary });
    };

    // '삭제' 버튼 클릭 핸들러
    const handleDeleteClick = () => {
        // window.confirm을 훅이 아닌 UI 컴포넌트에서 처리하는 것이 더 좋습니다.
        if (window.confirm(`'${job.name}' 직업을 정말 삭제하시겠습니까?`)) {
            onDelete(job.id);
        }
    };

    // ⭐ 현재 주급과 수정된 주급이 다른지 확인하는 변수
    const isChanged = job.baseSalary !== Number(editedSalary);

    return (
        // ⭐ 주급이 변경되면 배경색을 살짝 변경하여 시각적 피드백 제공
        <tr className={`hover:bg-slate-50 ${isChanged ? 'bg-yellow-50' : 'bg-white'}`}>
            <td className="p-3 font-medium text-slate-800">{job.name}</td>
            <td className="p-2 w-40">
                <InputField
                    type="number"
                    value={editedSalary}
                    onChange={(e) => setEditedSalary(e.target.value)}
                    className="text-right"
                    disabled={isLoading}
                />
            </td>
            <td className="p-2 text-center w-48">
                <div className="flex justify-center gap-2">
                    {/* ⭐ '저장' 버튼: 변경되었을 때만 활성화 */}
                    <Button
                        size="sm"
                        color={isChanged ? "green" : "gray"}
                        onClick={handleUpdateClick}
                        disabled={!isChanged || isLoading}
                        isLoading={isLoading}
                        icon={Save}
                    >
                        저장
                    </Button>
                    {/* ⭐ '삭제' 버튼 */}
                    <Button
                        size="sm"
                        variant="outline"
                        color="red"
                        onClick={handleDeleteClick}
                        disabled={isLoading}
                        icon={Trash2}
                    >
                        삭제
                    </Button>
                </div>
            </td>
        </tr>
    );
};

export default JobRowEditable;