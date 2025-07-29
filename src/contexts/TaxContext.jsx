import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { db } from '../firebase';

import { useUser } from './UserContext';
import { useFeedback } from './FeedbackContext';
import { getPath } from '../pages/tax/utils/taxPathUtils';

import {
    query, collection, collectionGroup,
    where, orderBy, getDocs,
    doc, writeBatch, serverTimestamp,
    increment, Timestamp
} from 'firebase/firestore';





import dayjs from 'dayjs';

const TaxContext = createContext(null);

export const TaxProvider = ({ children }) => {
    // === 1. 상태(State) 선언 ===
    const { classId, userData, classData } = useUser();
    const { showFeedback } = useFeedback(); // ⭐ 전역 피드백 함수 가져오기

    const currencyUnit = classData?.currencyUnit || '단위';
    const teacherUid = userData?.uid;

    // 데이터 상태 (여러 탭에서 공유)
    const [students, setStudents] = useState([]);
    const [jobDefinitions, setJobDefinitions] = useState([]);
    const [taxRules, setTaxRules] = useState([]); // 모든 세금 규칙 (TaxRuleTab용)
    const [allPayslipsCache, setAllPayslipsCache] = useState(new Map());

    // UI 제어 상태 (주로 PayrollTab에서 사용하지만, 로직이 Provider에 있으므로 함께 관리)
    const [editedStudentJobs, setEditedStudentJobs] = useState({});
    const [paymentStartDate, setPaymentStartDate] = useState('');
    const [numberOfWeeksToPay, setNumberOfWeeksToPay] = useState(1);
    const [calculatedEndDate, setCalculatedEndDate] = useState('');
    const [paidStatus, setPaidStatus] = useState({});
    const [selectedStudentsForPayroll, setSelectedStudentsForPayroll] = useState(new Set());
    const [activeAutoTaxRules, setActiveAutoTaxRules] = useState([]);
    const [individualPayProcessing, setIndividualPayProcessing] = useState({});
    const [processingPayroll, setProcessingPayroll] = useState(false);

    // 로딩 상태
    const [isLoading, setIsLoading] = useState({
        students: true,
        jobDefinitions: true,
        taxRules: true,
        savingJobs: false,
        payroll: false,
        payslipsCache: true
    });

    // --- 1. 데이터 로딩 함수 ---
    const fetchAllData = useCallback(async () => {
        if (!classId) return;
        setIsLoading({ students: true, jobDefinitions: true, taxRules: true, payroll: false, payslipsCache: true });
        try {
            const studentsQuery = query(collection(db, getPath('students', classId)), orderBy("studentNumber"));
            const jobDefsQuery = query(collection(db, getPath('jobDefinitions', classId)), orderBy("name"));
            const taxRulesQuery = query(collection(db, getPath('taxRules', classId)), where("autoDeduct", "==", true), where("isActive", "==", true));
            const payslipsQuery = query(collectionGroup(db, 'paySlips'), where('classId', '==', classId));

            const [studentsSnap, jobDefsSnap, taxRulesSnap, payslipsSnap] = await Promise.all([
                getDocs(studentsQuery), getDocs(jobDefsQuery), getDocs(taxRulesQuery), getDocs(payslipsQuery)
            ]);

            const studentList = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
            setStudents(studentList);
            setJobDefinitions(jobDefsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setActiveAutoTaxRules(taxRulesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

            const payslipsByStudent = new Map();
            payslipsSnap.forEach(doc => {
                const data = doc.data();
                const studentPayslips = payslipsByStudent.get(data.studentUid) || [];
                payslipsByStudent.set(data.studentUid, [...studentPayslips, data]);
            });
            setAllPayslipsCache(payslipsByStudent);

        } catch (err) {
            console.error("Error fetching payroll data:", err);
            showFeedback("데이터 로딩 실패: " + err.message, 'error');
        } finally {
            setIsLoading({ students: false, jobDefinitions: false, taxRules: false, savingJobs: false, payroll: false, payslipsCache: false });
        }
    }, [classId, showFeedback]);

    // --- 2. 월급 계산 로직 ---
    const calculatePayrollForStudent = (
        student, // { uid, name, job, creditScore (현재 미사용), assets: { cash } }
        startDateStr, // 지급 시작일 (YYYY-MM-DD 문자열)
        numWeeks,     // 지급할 주 수 (Number)
        currentJobDefinitions,
        currentActiveAutoTaxRules,
        currentCurrencyUnit
    ) => {
        const jobName = editedStudentJobs[student.uid] || student.job || "없음";
        const studentJobDef = currentJobDefinitions.find(jd => jd.name === jobName);

        if (jobName === "없음") {
            return { error: `${student.name || student.uid}: 직업이 "없음"으로 설정되어 급여를 계산할 수 없습니다. 먼저 직업을 배정해주세요.` };
        }

        if (!studentJobDef || typeof studentJobDef.baseSalary !== 'number') {
            return { error: `${student.name || student.uid}: 직업(${jobName})의 주급 정보를 찾을 수 없습니다.` };
        }

        const weeklyBaseSalary = studentJobDef.baseSalary;
        const actualBasePayment = weeklyBaseSalary * numWeeks;

        let netSalary = actualBasePayment;
        const deductions = [];
        let totalDeductions = 0;

        // === ⭐ 안전하게 처리하는 부분 → toLowerCase() 사용!
        for (const rule of currentActiveAutoTaxRules) {
            let applies = false;

            if (rule.targetType === 'all') applies = true;
            else if (rule.targetType === 'job' && jobName === rule.targetValue) applies = true;
            else if (rule.targetType === 'individual' && Array.isArray(rule.targetValue) && rule.targetValue.includes(student.uid)) applies = true;

            if (applies) {
                let deductionAmount = 0;

                const ruleTypeSafe = (rule.type || '').toLowerCase(); // ⭐ 안전하게 처리

                if (ruleTypeSafe === 'percent') {
                    deductionAmount = Math.round(actualBasePayment * (rule.value / 100));
                } else if (ruleTypeSafe === 'fixed') {
                    deductionAmount = rule.value * numWeeks;
                } else {
                    console.warn(`알 수 없는 세금 유형: ${rule.type} → rule.id=${rule.id}`); // 디버그 안전장치
                }

                if (deductionAmount !== 0) {
                    deductions.push({
                        taxRuleId: rule.id,
                        name: rule.name,
                        amount: deductionAmount,
                        originalRuleType: rule.type,
                        originalRuleValue: rule.value,
                    });
                    totalDeductions += deductionAmount;
                }
            }
        }

        netSalary = actualBasePayment - totalDeductions;
        netSalary = Math.max(0, netSalary);

        // --- UTC 자정 기준 Timestamp 생성 ---
        const [year, month, day] = startDateStr.split('-').map(Number);
        const sDateUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        const eDateUTC = new Date(sDateUTC);
        eDateUTC.setUTCDate(sDateUTC.getUTCDate() + (numWeeks * 7) - 1);

        return {
            paymentStartDate: Timestamp.fromDate(sDateUTC),
            paymentEndDate: Timestamp.fromDate(eDateUTC),
            numberOfWeeksPaid: Number(numWeeks),
            paymentPeriodDescription: `${numWeeks}주분 급여 (${startDateStr} ~ ${eDateUTC.toISOString().split('T')[0]})`,
            studentUid: student.uid,
            studentName: student.name || 'N/A',
            studentJob: jobName,
            originalWeeklyBaseSalary: weeklyBaseSalary,
            baseSalary: actualBasePayment,
            deductions,
            totalDeductions,
            netSalary,
            currencyUnit: currentCurrencyUnit,
        };
    };
    
    const savePayslipAndBalance = useCallback(async (batch, studentUid, payrollData, actorForLog) => {
        // 1. 월급 명세서(paySlips) 저장
        const payslipCollectionPath = getPath('paySlips', classId, studentUid); // ✅ 수정
        const newPayslipRef = doc(collection(db, payslipCollectionPath));

        const payslipDocData = {
            ...payrollData,
            classId: classId,
            studentUid: studentUid,
            generatedBy: teacherUid,
            generatedAt: serverTimestamp(),
        };
        batch.set(newPayslipRef, payslipDocData);

        // 2. 학생 자산(assets.cash)에 순수령액 입금
        const studentPath = `${getPath('students', classId)}/${studentUid}`; // ✅ 수정
        batch.update(doc(db, studentPath), { "assets.cash": increment(payrollData.netSalary) });

        return { id: newPayslipRef.id, studentUid, ...payslipDocData };
    }, [classId, teacherUid]);

    // --- 지급 기간 중복 체크 헬퍼 함수 ---
    const checkForOverlappingPayslips = useCallback((studentUid, newPStartDate, newPEndDate) => {
        if (!studentUid || !newPStartDate || !newPEndDate) {
            return "날짜 정보가 유효하지 않습니다.";
        }

        // ⭐ 1. 로컬 캐시에서 해당 학생의 명세서 목록을 가져옵니다.
        const studentPayslips = allPayslipsCache.get(studentUid) || [];

        if (studentPayslips.length === 0) {
            return false; // 캐시에 기록이 없으면 중복될 것도 없음
        }

        const newStartTimestamp = new Date(newPStartDate);
        newStartTimestamp.setHours(0, 0, 0, 0);
        const newEndTimestamp = new Date(newPEndDate);
        newEndTimestamp.setHours(23, 59, 59, 999);

        // ⭐ 2. 가져온 학생의 명세서 목록만 순회하며 중복을 확인합니다.
        for (const payslip of studentPayslips) {
            if (payslip.paymentStartDate && payslip.paymentEndDate) {
                const existingStart = payslip.paymentStartDate.toDate();
                const existingEnd = payslip.paymentEndDate.toDate();

                // (A시작 <= B끝) AND (A끝 >= B시작)
                if (
                    newStartTimestamp.getTime() <= existingEnd.getTime() &&
                    newEndTimestamp.getTime() >= existingStart.getTime()
                ) {
                    const 기간문자열 = `${dayjs(existingStart).format('YYYY.MM.DD')} ~ ${dayjs(existingEnd).format('YYYY.MM.DD')}`;
                    return `이미 급여가 지급된 기간과 중복됩니다 (기존: ${기간문자열}).`;
                }
            }
        }

        return false; // 중복 없음
    }, [allPayslipsCache]);

    const checkPaidStatusForPeriod = useCallback((studentsToCheck, startDateStr, numWeeks) => {
        if (!startDateStr || !(numWeeks > 0) || !studentsToCheck || studentsToCheck.length === 0) {
            setPaidStatus({}); // 조건이 안 맞으면 상태를 비워줌
            return;
        }

        const newPaidStatusUpdates = {};
        const newPaymentStartJSDate = new Date(startDateStr);
        newPaymentStartJSDate.setHours(0, 0, 0, 0);

        const newPaymentEndJSDate = new Date(newPaymentStartJSDate);
        newPaymentEndJSDate.setDate(newPaymentStartJSDate.getDate() + (Number(numWeeks) * 7) - 1);
        newPaymentEndJSDate.setHours(23, 59, 59, 999);

        studentsToCheck.forEach(student => {
            const paidKey = `${student.uid}_${startDateStr}_${Number(numWeeks)}`;

            // ⭐ 1. Map에서 해당 학생의 명세서 목록만 가져옵니다. (훨씬 효율적)
            const studentPayslips = allPayslipsCache.get(student.uid) || [];

            // ⭐ 2. .some()을 사용하여 겹치는 내역이 하나라도 있는지 확인합니다.
            const isPaid = studentPayslips.some(payslip => {
                if (payslip.paymentStartDate && payslip.paymentEndDate) {
                    const existingStart = payslip.paymentStartDate.toDate();
                    const existingEnd = payslip.paymentEndDate.toDate();

                    // 기간 중첩 비교
                    return newPaymentStartJSDate.getTime() <= existingEnd.getTime() &&
                        newPaymentEndJSDate.getTime() >= existingStart.getTime();
                }
                return false;
            });

            newPaidStatusUpdates[paidKey] = isPaid ? 'paid' : undefined;
        });

        setPaidStatus(prev => ({ ...prev, ...newPaidStatusUpdates }));
    }, [allPayslipsCache]);



    // UI 핸들러
    const handleStudentJobChange = useCallback((uid, newJob) => {
        setEditedStudentJobs(prev => ({ ...prev, [uid]: newJob }));
    }, []);

    const handleSaveStudentJobs = useCallback(async () => {
        if (Object.keys(editedStudentJobs).length === 0) {
            showFeedback("변경된 직업 정보가 없습니다.", 'info');
            return;
        }
        setIsLoading(prev => ({ ...prev, savingJobs: true }));
        const batch = writeBatch(db);
        Object.entries(editedStudentJobs).forEach(([uid, jobName]) => {
            const path = getPath('student', classId, uid);
            if (path) batch.update(doc(db, path), { job: jobName });
        });
        try {
            await batch.commit();
            showFeedback("학생 직업 정보가 성공적으로 저장되었습니다.", 'success');
            await fetchAllData();
            setEditedStudentJobs({});
        } catch (err) {
            showFeedback("학생 직업 정보 저장 중 오류 발생: " + err.message, 'error');
        } finally {
            setIsLoading(prev => ({ ...prev, savingJobs: false }));
        }
    }, [editedStudentJobs, classId, fetchAllData, showFeedback]);

    // --- 3. ⭐ 핵심 로직을 담당할 새로운 내부 함수 ---
    const processSinglePayroll = useCallback(async (student, startDate, numWeeks, batch) => {
        const paidKey = `${student.uid}_${startDate}_${numWeeks}`;
        if (paidStatus[paidKey] === 'paid' || individualPayProcessing[student.uid]) {
            return { success: false, skip: true, message: "이미 처리되었거나 개별 처리 중입니다." };
        }

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + numWeeks * 7 - 1);
        const overlapError = await checkForOverlappingPayslips(student.uid, startDate, endDate.toISOString().split('T')[0]);
        if (overlapError) {
            setPaidStatus(prev => ({ ...prev, [paidKey]: 'failed_check' }));
            return { success: false, message: overlapError, studentName: student.name };
        }

        const payrollData = calculatePayrollForStudent(student, startDate, numWeeks, jobDefinitions, activeAutoTaxRules, currencyUnit);
        if (payrollData.error) {
            setPaidStatus(prev => ({ ...prev, [paidKey]: 'failed_calc' }));
            return { success: false, message: payrollData.error, studentName: student.name };
        }

        // 성공 시, 쓰기 작업을 batch에 추가
        await savePayslipAndBalance(batch, student.uid, payrollData);
        return { success: true, data: payrollData };

    }, [paidStatus, individualPayProcessing, checkForOverlappingPayslips, calculatePayrollForStudent, jobDefinitions, activeAutoTaxRules, currencyUnit, savePayslipAndBalance]);

    // --- 4. 수정된 UI 이벤트 핸들러 ---
    const handlePayIndividualSalary = useCallback(async (studentUid) => {
        if (!teacherUid) {
            showFeedback("교사 정보가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.", 'error');
            return;
        }

        if (!paymentStartDate || numberOfWeeksToPay < 1) {
            showFeedback("지급 시작일과 주 수를 선택하세요.", 'error');
            return;
        }
        const student = students.find(s => s.uid === studentUid);
        if (!student) return;

        setIndividualPayProcessing(prev => ({ ...prev, [studentUid]: true }));
        try {
            const batch = writeBatch(db);
            const result = await processSinglePayroll(student, paymentStartDate, numberOfWeeksToPay, batch);

            if (result.success) {
                await batch.commit();
                showFeedback(`${student.name}님 월급 지급 완료.`, 'success');
                fetchAllData(); // 데이터 새로고침
            } else if (!result.skip) {
                showFeedback(`${result.studentName}: ${result.message}`, 'error');
            }
        } catch (err) {
            showFeedback(`${student.name}님 월급 지급 중 오류 발생: ${err.message}`, 'error');
        } finally {
            setIndividualPayProcessing(prev => ({ ...prev, [studentUid]: false }));
        }
    }, [students, paymentStartDate, numberOfWeeksToPay, processSinglePayroll, fetchAllData, teacherUid, showFeedback]);

    const handleProcessBulkPayroll = useCallback(async () => {
        const studentsToPay = students.filter(s => selectedStudentsForPayroll.has(s.uid));
        if (studentsToPay.length === 0) {
            showFeedback("월급을 지급할 학생을 선택해주세요.", 'info');
            return;
        }

        setProcessingPayroll(true);
        const batch = writeBatch(db);
        const errors = [];
        let successCount = 0;

        for (const student of studentsToPay) {
            const result = await processSinglePayroll(student, paymentStartDate, numberOfWeeksToPay, batch);
            if (result.success) {
                successCount++;
            } else if (!result.skip) {
                errors.push(`${result.studentName}: ${result.message}`);
            }
        }

        try {
            if (successCount > 0) {
                await batch.commit();
            }
            showFeedback(`일괄 지급 완료: 성공 ${successCount}건, 오류/건너뜀 ${errors.length}건`, errors.length > 0 ? 'warning' : 'success');
            if (errors.length > 0) console.error("일괄 지급 오류 내역:", errors);
            if (successCount > 0) fetchAllData();
        } catch (err) {
            showFeedback("일괄 지급 최종 저장 중 오류: " + err.message, 'error');
        } finally {
            setProcessingPayroll(false);
        }
    }, [students, selectedStudentsForPayroll, paymentStartDate, numberOfWeeksToPay, processSinglePayroll, fetchAllData, showFeedback, teacherUid]);

    // --- 학생 선택 관련 핸들러 함수 추가 ---
    const handleToggleStudentSelection = useCallback((uid) => {
        setSelectedStudentsForPayroll(prev => {
            const next = new Set(prev);
            if (next.has(uid)) next.delete(uid);
            else next.add(uid);
            return next;
        });
    }, []);

    const handleToggleSelectAllStudents = useCallback(() => {
        setSelectedStudentsForPayroll(prev => (
            prev.size === students.length
                ? new Set()
                : new Set(students.map(s => s.uid))
        ));
    }, [students]);

    // --- 5. 데이터 흐름 제어 useEffect ---
    useEffect(() => {
        if (classId) {
            fetchAllData();
            setPaymentStartDate(new Date().toISOString().split('T')[0]);
        }
    }, [classId, fetchAllData]);

    useEffect(() => {
        if (students.length > 0 && paymentStartDate && numberOfWeeksToPay > 0 && !isLoading.payslipsCache) {
            const newEndDate = new Date(paymentStartDate);
            newEndDate.setDate(newEndDate.getDate() + (numberOfWeeksToPay * 7) - 1);
            setCalculatedEndDate(newEndDate.toISOString().split('T')[0]);
            checkPaidStatusForPeriod(students, paymentStartDate, numberOfWeeksToPay);
        }
    }, [students, paymentStartDate, numberOfWeeksToPay, isLoading.payslipsCache, checkPaidStatusForPeriod]);

    // --- 6. 최종 반환 객체 ---
    return (
        <TaxContext.Provider value={{
            students,
            jobDefinitions,
            paidStatus,
            currencyUnit,
            calculatedEndDate,
            editedStudentJobs,
            paymentStartDate,
            numberOfWeeksToPay,
            selectedStudentsForPayroll,
            isLoading,
            fetchAllData,
            setPaymentStartDate,
            setNumberOfWeeksToPay,
            handleStudentJobChange,
            handleSaveStudentJobs,
            handlePayIndividualSalary,
            handleProcessBulkPayroll,
            handleToggleStudentSelection,
            handleToggleSelectAllStudents,
            refreshData: fetchAllData
        }}>
            {children}
        </TaxContext.Provider>
    );
};

// ⭐ 요거 추가!
export const useTaxContext = () => {
    const context = useContext(TaxContext);
    if (!context) {
        throw new Error('useTaxContext must be used within <TaxProvider>');
    }
    return context;
};

