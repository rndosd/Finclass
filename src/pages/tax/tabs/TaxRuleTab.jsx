// /src/pages/tax/tabs/TaxRuleTab.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase'; // Firestore 인스턴스
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    query,
    orderBy
} from "firebase/firestore";
import { useUser } from '../../../contexts/UserContext';
import TaxRuleForm from './TaxRuleForm'; // TaxRuleForm 컴포넌트 import

// Firestore 경로 생성 헬퍼
const getPath = (type, classId, docId = null) => {
    if (!classId) { console.error("TaxRuleTab getPath: classId is undefined"); return null; }
    switch (type) {
        case 'taxRules': return `classes/${classId}/taxRules`;
        case 'taxRule': return `classes/${classId}/taxRules/${docId}`;
        default: console.error(`Unknown path type in TaxRuleTab: ${type}`); return null;
    }
};

// 스타일 객체
const tabStyles = {
    button: { padding: '10px 18px', border: 'none', borderRadius: '5px', cursor: 'pointer', backgroundColor: '#3498db', color: 'white', fontSize: '0.95em', textDecoration: 'none', marginBottom: '15px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', fontSize: '0.9em' },
    th: { backgroundColor: '#f0f4f7', padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', fontWeight: '600', color: '#495057' },
    td: { padding: '12px', border: '1px solid #dee2e6', textAlign: 'left', verticalAlign: 'middle', wordBreak: 'break-word' },
    actionButton: { padding: '6px 10px', fontSize: '0.85em', marginRight: '5px', cursor: 'pointer', borderRadius: '4px', border: '1px solid transparent' },
    editButton: { backgroundColor: '#ffc107', color: '#212529', borderColor: '#ffc107' },
    deleteButton: { backgroundColor: '#dc3545', color: 'white', borderColor: '#dc3545' },
    alert: (type) => ({ padding: '12px 15px', margin: '15px 0', borderRadius: '5px', color: 'white', backgroundColor: type === 'error' ? '#e74c3c' : (type === 'success' ? '#2ecc71' : '#17a2b8') }),
};

const targetTypeDisplayNames = {
    all: "전체 학생",
    job: "특정 직업",
    individual: "개별 학생",
    // 'tier'는 현재 사용 안 함
};

const TaxRuleTab = () => {
    const { classId, classData, loading: userContextLoading } = useUser();
    const currencyUnit = classData?.currencyUnit || '단위'; // TaxRuleForm에 전달할 필요 없음 (Form이 직접 Context 사용)

    const [taxRules, setTaxRules] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // 목록 로딩 및 삭제 작업 로딩
    const [isFetching, setIsFetching] = useState(false); // 목록 새로고침 중 상태 (초기 로드 포함)
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    const [showForm, setShowForm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRuleToEdit, setCurrentRuleToEdit] = useState(null);

    const showAppFeedback = (message, type = 'info', duration = 4000) => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: '', type: '' }), duration);
    };

    const fetchTaxRules = useCallback(async () => {
        if (!classId) return;
        setIsFetching(true);
        setFeedback({ message: '', type: '' });
        try {
            const taxRulesPath = getPath('taxRules', classId);
            if (!taxRulesPath) throw new Error("세금 규칙 경로를 가져올 수 없습니다.");
            const q = query(collection(db, taxRulesPath), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const rules = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTaxRules(rules);
        } catch (err) {
            console.error("Error fetching tax rules:", err);
            showAppFeedback("세금 규칙 목록 로딩 중 오류 발생: " + err.message, 'error');
        } finally {
            setIsFetching(false);
        }
    }, [classId]);

    useEffect(() => {
        if (!userContextLoading && classId) {
            fetchTaxRules();
        }
    }, [userContextLoading, classId, fetchTaxRules]);

    const handleDeleteRule = async (ruleId) => {
        if (!classId || !ruleId) {
            showAppFeedback("삭제할 규칙 정보가 올바르지 않습니다.", "error");
            return;
        }
        if (!window.confirm("정말로 이 세금 규칙을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;

        setIsLoading(true); // 작업 로딩 상태 (isFetching과 별개)
        try {
            const rulePath = getPath('taxRule', classId, ruleId);
            if (!rulePath) throw new Error("세금 규칙 삭제 경로를 가져올 수 없습니다.");
            await deleteDoc(doc(db, rulePath));
            showAppFeedback(`세금 규칙(ID: ${ruleId})이 성공적으로 삭제되었습니다.`, 'success');
            fetchTaxRules(); // 목록 새로고침
        } catch (err) {
            console.error("Error deleting tax rule:", err);
            showAppFeedback("세금 규칙 삭제 중 오류가 발생했습니다: " + err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenNewRuleForm = () => {
        setIsEditing(false);
        setCurrentRuleToEdit(null);
        setShowForm(true);
        setFeedback({ message: '', type: '' });
    };

    const handleOpenEditRuleForm = (rule) => {
        setIsEditing(true);
        setCurrentRuleToEdit(rule);
        setShowForm(true);
        setFeedback({ message: '', type: '' });
    };

    const handleFormSubmitSuccess = (message) => {
        setShowForm(false);
        setCurrentRuleToEdit(null); // 폼 닫을 때 편집 데이터 초기화
        fetchTaxRules(); // 목록 새로고침
        showAppFeedback(message, 'success');
    };

    const handleFormCancel = () => {
        setShowForm(false);
        setCurrentRuleToEdit(null); // 폼 닫을 때 편집 데이터 초기화
    };

    if (userContextLoading && !classId) {
        return <p>사용자 및 학급 정보 로딩 중...</p>;
    }
    if (!classId && !userContextLoading) {
        return <p style={tabStyles.alert('error')}>현재 학급 정보를 찾을 수 없습니다. (UserContext)</p>;
    }
    // 초기 목록 로딩 중 메시지
    if (isFetching && taxRules.length === 0) {
        return <p>세금 규칙 목록을 불러오는 중입니다...</p>;
    }

    return (
        <div>
            {feedback.message && <div style={tabStyles.alert(feedback.type)}>{feedback.message}</div>}

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4em', margin: 0 }}>세금 규칙 목록</h2>
                {!showForm ? (
                    <button
                        style={tabStyles.button}
                        onClick={handleOpenNewRuleForm}
                        disabled={isLoading || isFetching || !classId}
                    >
                        + 새 세금 규칙 추가
                    </button>
                ) : (
                    <button
                        style={{ ...tabStyles.button, backgroundColor: '#6c757d' }}
                        onClick={handleFormCancel}
                        // TaxRuleForm 내부의 isSubmitting 상태를 여기서는 알 수 없으므로,
                        // 폼이 열려있을 때는 이 버튼의 disabled는 isLoading (목록 삭제 등) 기준으로만
                        disabled={isLoading}
                    >
                        목록으로 돌아가기
                    </button>
                )}
            </header>

            {showForm ? (
                <TaxRuleForm
                    // classId, teacherId, currencyUnit props는 TaxRuleForm 내부에서 useUser()로 직접 가져옴
                    isEditingMode={isEditing}
                    initialData={currentRuleToEdit}
                    onSubmitSuccess={handleFormSubmitSuccess}
                    onCancel={handleFormCancel}
                />
            ) : (
                <>
                    {isFetching && taxRules.length > 0 && <p style={{ color: '#3498db', fontStyle: 'italic' }}>목록을 새로고침 중...</p>}
                    <table style={tabStyles.table}>
                        <thead>
                            <tr>
                                <th style={tabStyles.th}>규칙 이름</th>
                                <th style={tabStyles.th}>설명</th>
                                <th style={tabStyles.th}>방식</th>
                                <th style={tabStyles.th}>값/세율</th>
                                <th style={tabStyles.th}>자동공제</th>
                                <th style={tabStyles.th}>적용대상</th>
                                <th style={tabStyles.th}>대상 상세</th>
                                <th style={tabStyles.th}>상태</th>
                                <th style={tabStyles.th}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taxRules.length === 0 && !isLoading && !isFetching && (
                                <tr><td colSpan="9" style={{ ...tabStyles.td, textAlign: 'center' }}>등록된 세금 규칙이 없습니다. "새 세금 규칙 추가" 버튼을 눌러 규칙을 만드세요.</td></tr>
                            )}
                            {taxRules.map(rule => {
                                // 대상값 표시 로직
                                let targetValueDisplay = 'N/A';
                                if (rule.targetType === 'all') {
                                    targetValueDisplay = '-'; // 또는 "해당 없음"
                                } else if (rule.targetType === 'job') {
                                    targetValueDisplay = rule.targetValue || '지정 안됨';
                                } else if (rule.targetType === 'individual' && Array.isArray(rule.targetValue)) {
                                    targetValueDisplay = `${rule.targetValue.length}명 지정됨`;
                                } else if (rule.targetValue) { // 혹시 모를 다른 타입의 targetValue
                                    targetValueDisplay = String(rule.targetValue);
                                }

                                return (
                                    <tr key={rule.id}>
                                        <td style={tabStyles.td}>{rule.name}</td>
                                        <td style={tabStyles.td} title={rule.description || ''}>{rule.description ? `${rule.description.substring(0, 25)}${rule.description.length > 25 ? '...' : ''}` : '-'}</td>
                                        <td style={tabStyles.td}>{rule.type === 'percent' ? '비율(%)' : '고정액'}</td>
                                        <td style={tabStyles.td}>
                                            {rule.value}
                                            {rule.type === 'percent' ? '%' : (classData?.currencyUnit ? ` ${classData.currencyUnit}` : '')}
                                            {rule.type === 'fixed' && <small style={{ display: 'block', color: '#777' }}>(1주 기준)</small>}
                                        </td>
                                        <td style={tabStyles.td}>{rule.autoDeduct ? '예' : '아니오'}</td>
                                        {/* 적용대상 한글로 표시 */}
                                        <td style={tabStyles.td}>{targetTypeDisplayNames[rule.targetType] || rule.targetType}</td>
                                        {/* 대상 상세 (대상값) 표시 */}
                                        <td style={tabStyles.td}>{targetValueDisplay}</td>
                                        <td style={tabStyles.td}>{rule.isActive === undefined || rule.isActive ? '활성' : '비활성'}</td>
                                        <td style={tabStyles.td}>
                                            <button
                                                style={{ ...tabStyles.actionButton, ...tabStyles.editButton }}
                                                onClick={() => handleOpenEditRuleForm(rule)}
                                                disabled={isLoading || isFetching}
                                            >수정</button>
                                            <button
                                                style={{ ...tabStyles.actionButton, ...tabStyles.deleteButton }}
                                                onClick={() => handleDeleteRule(rule.id)}
                                                disabled={isLoading || isFetching}
                                            >삭제</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
};

export default TaxRuleTab;