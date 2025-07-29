// /src/pages/tax/tabs/TaxRuleForm.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase'; // Firestore 인스턴스
import {
    doc,
    addDoc,   // 새 문서 (자동 ID) 생성
    updateDoc,
    collection,
    getDocs,
    serverTimestamp,
    query,
    orderBy
} from "firebase/firestore";
import { useUser } from '../../../contexts/UserContext'; // UserContext 훅
import StudentSelector from '../../../components/ui/StudentSelector';

// Firestore 경로 생성 헬퍼 (TaxRuleTab.jsx 와 동일하게 사용 가능, 또는 props로 전달받거나 여기서 정의)
const getPath = (type, classId, docId = null) => {
    if (!classId) { console.error("TaxRuleForm getPath: classId is undefined"); return null; }
    switch (type) {
        case 'taxRules': return `classes/${classId}/taxRules`; // 컬렉션 경로 (addDoc용)
        case 'taxRule': return `classes/${classId}/taxRules/${docId}`; // 문서 경로 (updateDoc용)
        case 'students': return `classes/${classId}/students`;
        case 'jobDefinitions': return `classes/${classId}/jobDefinitions`;
        default: console.error(`Unknown path type in TaxRuleForm: ${type}`); return null;
    }
};

// 스타일 객체 (TaxRuleTab 또는 공통 스타일 사용)
const formStyles = {
    container: { padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fdfdfd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    formRow: { marginBottom: '18px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '0.95em' },
    textarea: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', minHeight: '80px', fontSize: '0.95em' },
    select: { width: '100%', padding: '10px 12px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', backgroundColor: 'white', fontSize: '0.95em' },
    checkboxContainer: { display: 'flex', alignItems: 'center', marginTop: '8px' },
    checkboxInput: { marginRight: '8px', width: '16px', height: '16px' },
    checkboxLabel: { fontWeight: 'normal', cursor: 'pointer', color: '#444' },
    buttonContainer: { marginTop: '30px', textAlign: 'right', paddingTop: '15px', borderTop: '1px solid #eee' },
    button: { padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', marginLeft: '10px', fontSize: '0.95em', fontWeight: '500' },
    saveButton: { backgroundColor: '#28a745', color: 'white' },
    cancelButton: { backgroundColor: '#6c757d', color: 'white' },
    studentListContainer: { maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginTop: '10px', backgroundColor: 'white', borderRadius: '4px' },
    studentListItem: { display: 'flex', alignItems: 'center', marginBottom: '8px', padding: '6px', borderRadius: '3px', cursor: 'pointer' /*, '&:hover': {backgroundColor: '#f0f0f0'}*/ },
    alert: (type) => ({ padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', color: 'white', backgroundColor: type === 'error' ? '#dc3545' : (type === 'info' ? '#17a2b8' : '#28a745') }),
};


const TaxRuleForm = ({ isEditingMode, initialData, onSubmitSuccess, onCancel }) => {
    const { userData, classId, classData, loading: userContextLoading } = useUser();
    const currencyUnit = classData?.currencyUnit || '단위';

    const getInitialFormState = useCallback(() => ({
        name: '',
        description: '',
        type: 'percent', // 기본값
        value: 0,
        // autoDeduct 필드 제거 (항상 true로 간주)
        targetType: 'all',
        targetValueInput: '', // "job" 선택 시 직업명(ID) 저장
        selectedStudentUids: new Set(), // Set으로 초기화
        isActive: true,
    }), []);

    const [formData, setFormData] = useState(getInitialFormState());
    const [studentsForSelection, setStudentsForSelection] = useState([]);
    const [jobDefinitionsForSelection, setJobDefinitionsForSelection] = useState([]); // 직업 목록
    const [isLoading, setIsLoading] = useState({ students: false, jobDefinitions: false, submitting: false });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (isEditingMode && initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                type: initialData.type || 'percent',
                value: initialData.value === undefined ? 0 : initialData.value,
                // autoDeduct: true, // 항상 true
                targetType: initialData.targetType || 'all',
                targetValueInput: (initialData.targetType === 'job' && typeof initialData.targetValue === 'string') ? initialData.targetValue : '',
                selectedStudentUids: new Set( // Set으로 변환
                    (initialData.targetType === 'individual' && Array.isArray(initialData.targetValue)) ? initialData.targetValue : []
                ),
                isActive: initialData.isActive === undefined ? true : initialData.isActive,
            });
        } else {
            setFormData(getInitialFormState());
        }
    }, [isEditingMode, initialData, getInitialFormState]);

    // 학생 목록 로딩 (targetType 'individual' 또는 StudentSelector가 항상 필요로 한다면 조건 없이 로드)
    const fetchStudentsForSelection = useCallback(async () => {
        if (!classId) {
            setStudentsForSelection([]);
            return;
        }
        setIsLoading(prev => ({ ...prev, students: true }));
        setFormError('');
        try {
            const studentsPath = getPath('students', classId);
            if (!studentsPath) throw new Error("학생 목록 경로 오류");

            // ⭐ TaxBillTab 처럼 orderBy("name") 사용 → 일관성 유지
            const q = query(collection(db, studentsPath), orderBy("name"));
            const snapshot = await getDocs(q);

            const students = snapshot.docs.map(d => {
                const role = d.data().role || 'student';
                const studentNumberLabel = role === 'teacher'
                    ? '선생님'
                    : (d.data().studentNumber ? `${d.data().studentNumber}번` : '번호 없음');

                const name = d.data().name || `학생 ${d.id.substring(0, 5)}`;

                return {
                    uid: d.id,
                    name: name,
                    studentNumber: d.data().studentNumber || 'N/A',
                    role: role,
                    displayLabel: `${name} - ${studentNumberLabel}`, // ⭐ TaxBillTab 과 동일한 형식
                };
            });

            setStudentsForSelection(students);
        } catch (err) {
            console.error(err);
            setFormError("대상 학생 목록 로딩 실패.");
        } finally {
            setIsLoading(prev => ({ ...prev, students: false }));
        }
    }, [classId]);

    useEffect(() => {
        // targetType이 individual일 때만 학생 목록을 가져오도록 하거나,
        // StudentSelector를 항상 렌더링하고 내부에서 목록을 보여줄지 말지 결정한다면 항상 fetch
        if (formData.targetType === 'individual') {
            fetchStudentsForSelection();
        } else {
            setStudentsForSelection([]); // 다른 targetType이면 비워줌
        }
    }, [formData.targetType, fetchStudentsForSelection]);

    const fetchJobDefinitionsForSelection = useCallback(async () => {
        if (!classId || formData.targetType !== 'job') {
            setJobDefinitionsForSelection([]); return;
        }
        setIsLoading(prev => ({ ...prev, jobDefinitions: true })); setFormError('');
        try {
            const jobDefsPath = getPath('jobDefinitions', classId);
            if (!jobDefsPath) throw new Error("직업 정의 경로 오류");
            const q = query(collection(db, jobDefsPath), orderBy("name"));
            const snapshot = await getDocs(q);
            const defs = snapshot.docs.map(d => ({ id: d.id, name: d.data().name })); // ID (직업명)와 이름
            setJobDefinitionsForSelection(defs);
        } catch (err) { console.error(err); setFormError("대상 직업 목록 로딩 실패."); }
        finally { setIsLoading(prev => ({ ...prev, jobDefinitions: false })); }
    }, [classId, formData.targetType]);
    useEffect(() => { fetchJobDefinitionsForSelection(); }, [fetchJobDefinitionsForSelection]);


    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormError('');
        if (name === 'targetType') {
            setFormData(prev => ({ ...prev, targetValueInput: '', selectedStudentUids: new Set(), [name]: value }));
        } else {
            setFormData(prev => ({
                ...prev,
                // autoDeduct는 이제 없으므로 관련 로직 제거
                [name]: type === 'checkbox' ? checked : (name === 'value' ? parseFloat(value) || 0 : value)
            }));
        }
    };

    // StudentSelector의 onSelectionChange에 연결될 콜백
    const handleStudentSelectionChangeForForm = (newSelectedUidsSet) => {
        setFormData(prev => ({ ...prev, selectedStudentUids: newSelectedUidsSet }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        // 1. 폼 제출 시작 및 현재 폼 데이터 확인
        console.log("[TaxRuleForm] handleSubmit 시작, formData:", JSON.stringify(formData, null, 2));

        // 2. 유효성 검사 통과 여부 확인
        if (!formData.name.trim()) {
            setFormError("규칙 이름은 필수입니다.");
            return;
        }
        if (formData.value === undefined || formData.value === null || isNaN(parseFloat(formData.value))) {
            setFormError("값/세율은 유효한 숫자여야 합니다.");
            return;
        }
        if (formData.targetType === 'job' && !formData.targetValueInput) {
            setFormError("'특정 직업' 대상 선택 시 직업을 선택해야 합니다.");
            return;
        }
        if (formData.targetType === 'individual' && formData.selectedStudentUids.size === 0) { // .size 사용 확인
            setFormError("'개별 학생 지정' 대상 선택 시 한 명 이상의 학생을 선택해야 합니다.");
            return;
        }

        setIsLoading(prev => ({ ...prev, submitting: true }));

        // 3. Firestore에 저장할 데이터 객체(ruleData) 확인
        const finalTargetValue = formData.targetType === 'individual'
            ? Array.from(formData.selectedStudentUids) // Set을 배열로 변환
            : (formData.targetType === 'all' ? null : formData.targetValueInput.trim());

        const ruleData = {
            name: formData.name.trim(),
            description: formData.description.trim(),
            type: formData.type,
            value: parseFloat(formData.value),
            autoDeduct: true, // 모든 규칙은 자동 공제로 가정
            targetType: formData.targetType,
            targetValue: finalTargetValue,
            isActive: formData.isActive,
            lastModifiedAt: serverTimestamp(), // 수정/추가 모두 마지막 수정 시간 기록
        };

        try {
            if (isEditingMode && initialData?.id) {
                // 수정 모드
                const ruleRefPath = getPath('taxRule', classId, initialData.id); // 문서 경로는 'taxRule'
                if (!ruleRefPath) throw new Error("세금 규칙 수정 경로를 가져올 수 없습니다.");
                const ruleRef = doc(db, ruleRefPath);
                await updateDoc(ruleRef, ruleData); // ruleData에 createdAt은 포함되지 않음 (정상)
                onSubmitSuccess("세금 규칙이 성공적으로 수정되었습니다.");
            } else {
                // 추가 모드
                const rulesColPath = getPath('taxRules', classId); // <<--- 이 부분이 'taxRules' 인지 확인!
                if (!rulesColPath) throw new Error("세금 규칙 추가 경로를 가져올 수 없습니다."); // 여기서 에러 발생 중
                const rulesColRef = collection(db, rulesColPath);
                const docRef = await addDoc(rulesColRef, {
                    ...ruleData, // lastModifiedAt 포함
                    createdAt: serverTimestamp(), // 추가 시에만 createdAt 설정
                });
                onSubmitSuccess("새 세금 규칙이 성공적으로 추가되었습니다.");
            }
            setFormData(getInitialFormState()); // 성공 후 폼 초기화
        } catch (err) {
            setFormError(`저장 중 오류 발생: ${err.message} (자세한 내용은 콘솔을 확인하세요)`);
        } finally {
            setIsLoading(prev => ({ ...prev, submitting: false }));
        }
    };

    if (userContextLoading) return <p>사용자 정보 로딩 중...</p>;
    if (!classId || !userData) return <p style={formStyles.alert('error')}>세금 규칙 폼을 위한 학급 또는 교사 정보가 없습니다.</p>;

    return (
        <div style={formStyles.container}>
            <h3 style={{ marginTop: 0, color: '#34495e', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                {isEditingMode ? `세금 규칙 수정: ${initialData?.name || ''}` : '새 자동 공제 세금 규칙 추가'}
            </h3>

            {formError && <div style={formStyles.alert('error')}>{formError}</div>}

            <form onSubmit={handleSubmit}>
                {/* 규칙 이름 */}
                <div style={formStyles.formRow}>
                    <label htmlFor="taxRuleNameForm" style={formStyles.label}>규칙 이름*:</label>
                    <input style={formStyles.input} type="text" name="name" id="taxRuleNameForm" value={formData.name} onChange={handleInputChange} required disabled={isLoading.submitting} />
                </div>

                {/* 설명 */}
                <div style={formStyles.formRow}>
                    <label htmlFor="taxRuleDescriptionForm" style={formStyles.label}>설명:</label>
                    <textarea style={formStyles.textarea} name="description" id="taxRuleDescriptionForm" value={formData.description} onChange={handleInputChange} disabled={isLoading.submitting}></textarea>
                </div>

                {/* 세금 방식 */}
                <div style={formStyles.formRow}>
                    <label style={formStyles.label}>세금 방식*:</label>
                    <label style={{ marginRight: '15px' }}>
                        <input type="radio" name="type" value="percent" checked={formData.type === 'percent'} onChange={handleInputChange} disabled={isLoading.submitting} /> 비율(%)
                    </label>
                    <label>
                        <input type="radio" name="type" value="fixed" checked={formData.type === 'fixed'} onChange={handleInputChange} disabled={isLoading.submitting} /> 고정액
                    </label>
                </div>

                {/* 값/세율 */}
                <div style={formStyles.formRow}>
                    <label htmlFor="taxRuleValueForm" style={formStyles.label}>
                        {formData.type === 'percent' ? '세율(%)*' : `고정액* (1주 기준 ${currencyUnit})`}
                        <small style={{ fontWeight: 'normal' }}> (음수 입력 시 지원금/감면)</small>
                    </label>
                    <input
                        style={formStyles.input}
                        type="number"
                        step="any"
                        name="value"
                        id="taxRuleValueForm"
                        value={formData.value}
                        onChange={handleInputChange}
                        required
                        disabled={isLoading.submitting}
                    />
                    {formData.type === 'fixed' && (
                        <p style={formStyles.valueDescription}>
                            * 입력된 고정액은 **1주 기준**입니다. <br />
                            (예: Payroll 탭에서 2주치 급여 지급 시, 이 고정액의 2배가 적용됩니다.)
                        </p>
                    )}
                    {formData.type === 'percent' && (
                        <p style={formStyles.valueDescription}>
                            * Payroll 탭에서 계산된 "이번 지급의 실질적 기본급(N주치 총액)"에 대한 비율입니다.
                        </p>
                    )}
                </div>

                {/* 자동 공제 체크박스 UI 제거됨 - 모든 규칙은 autoDeduct: true로 간주 */}

                {/* 적용 대상 타입 */}
                <div style={formStyles.formRow}>
                    <label htmlFor="taxRuleTargetTypeForm" style={formStyles.label}>적용 대상*:</label>
                    <select style={formStyles.select} name="targetType" id="taxRuleTargetTypeForm" value={formData.targetType} onChange={handleInputChange} disabled={isLoading.submitting}>
                        <option value="all">전체 학생</option>
                        <option value="job">특정 직업</option>
                        <option value="individual">개별 학생 지정</option>
                    </select>
                </div>

                {/* 적용 대상 값 - 조건부 UI */}
                {formData.targetType === 'job' && (
                    <div style={formStyles.formRow}>
                        <label htmlFor="taxRuleTargetValueJobForm" style={formStyles.label}>대상 직업명*:</label>
                        {isLoading.jobDefinitions ? <p>직업 목록 로딩 중...</p> : (
                            jobDefinitionsForSelection.length > 0 ? (
                                <select
                                    style={formStyles.select}
                                    name="targetValueInput" // formData.targetValueInput과 연결
                                    id="taxRuleTargetValueJobForm"
                                    value={formData.targetValueInput}
                                    onChange={handleInputChange}
                                    required={formData.targetType === 'job'}
                                    disabled={isLoading.submitting}
                                >
                                    <option value="">-- 직업 선택 --</option>
                                    {jobDefinitionsForSelection.map(job => (
                                        <option key={job.id} value={job.name}>{job.name}</option>
                                    ))}
                                </select>
                            ) : (
                                !isLoading.jobDefinitions && <p style={formStyles.alert('info')}>
                                    정의된 직업이 없습니다. "직업 정의 관리" 탭에서 먼저 직업을 추가해주세요.
                                </p>
                            )
                        )}
                    </div>
                )}
                {formData.targetType === 'individual' && (
                    <div style={formStyles.formRow}>
                        {/* 학생 목록 로딩 상태는 StudentSelector 내부에서 처리하거나,
                StudentSelector를 호출하기 전에 여기서 로딩 상태를 보여줄 수 있습니다.
                여기서는 StudentSelector가 자체적으로 로딩을 처리한다고 가정하거나,
                studentsForSelection이 준비될 때까지 로딩 메시지를 보여줍니다.
            */}
                        {isLoading.students ? <p>학생 목록 로딩 중...</p> : (
                            studentsForSelection.length === 0 && !isLoading.students ?
                                <p style={formStyles.alert('info')}>선택할 학생이 없습니다.</p> :
                                <StudentSelector
                                    allStudents={studentsForSelection}
                                    selectedStudentUids={formData.selectedStudentUids}
                                    onSelectionChange={handleStudentSelectionChangeForForm}
                                    listTitle={`규칙 적용 대상 학생 (${formData.selectedStudentUids.size}명)`}
                                    showSelectAll={true}
                                    initiallyExpanded={true}
                                    disabled={isLoading.submitting}
                                    getLabel={(student) => student.displayLabel || `${student.name}`} // ⭐ 반드시 getLabel 사용
                                />
                        )}
                    </div>
                )}

                {/* 규칙 활성 */}
                <div style={formStyles.formRow}>
                    <div style={formStyles.checkboxContainer}>
                        <input type="checkbox" name="isActive" id="taxRuleIsActiveForm" checked={formData.isActive} onChange={handleInputChange} disabled={isLoading.submitting} style={formStyles.checkboxInput} />
                        <label htmlFor="taxRuleIsActiveForm" style={formStyles.checkboxLabel}>규칙 활성화 (체크 시 이 규칙이 월급 계산 시 실제로 적용됩니다)</label>
                    </div>
                </div>

                <div style={formStyles.buttonContainer}>
                    <button type="button" onClick={onCancel} style={{ ...formStyles.button, ...formStyles.cancelButton }} disabled={isLoading.submitting}>
                        취소
                    </button>
                    <button type="submit" style={{ ...formStyles.button, ...formStyles.saveButton }} disabled={isLoading.submitting}>
                        {isLoading.submitting ? (isEditingMode ? '수정 중...' : '추가 중...') : (isEditingMode ? '규칙 수정' : '새 규칙 추가')}
                    </button>
                </div>
            </form>
        </div>
    );
};
export default TaxRuleForm;