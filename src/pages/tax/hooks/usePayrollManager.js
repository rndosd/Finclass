import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';
import { getPath } from '../utils/taxPathUtils';
import {
    query, collection, collectionGroup,
    where, orderBy, getDocs,
    doc, writeBatch, serverTimestamp,
    increment, Timestamp
} from 'firebase/firestore';
import dayjs from 'dayjs';

export const usePayrollManager = () => {
    // === 1. 상태(State) 및 컨텍스트 선언 ===
    const { classId, userData, classData } = useUser();
    const { showFeedback } = useFeedback();

    const currencyUnit = classData?.currencyUnit || '단위';
    const teacherUid = userData?.uid;

    // 데이터 상태
    const [students, setStudents] = useState([]);
    const [jobDefinitions, setJobDefinitions] = useState([]);
    const [allPayslipsCache, setAllPayslipsCache] = useState(new Map());
    const [activeAutoTaxRules, setActiveAutoTaxRules] = useState([]);

    // UI 제어 상태
    const [editedStudentJobs, setEditedStudentJobs] = useState({});
    const [paymentStartDate, setPaymentStartDate] = useState('');
    const [numberOfWeeksToPay, setNumberOfWeeksToPay] = useState(1);
    const [calculatedEndDate, setCalculatedEndDate] = useState('');
    const [paidStatus, setPaidStatus] = useState({});
    const [selectedStudentsForPayroll, setSelectedStudentsForPayroll] = useState(new Set());
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

    // --- 2. 데이터 로딩 및 캐싱 함수 ---
    const fetchAllData = useCallback(async () => {
        if (!classId) return;
        setIsLoading({ students: true, jobDefinitions: true, taxRules: true, payroll: false, payslipsCache: true, savingJobs: false });

        try {
            const studentsQuery = query(collection(db, getPath('students', classId)), orderBy("studentNumber"));
            const jobDefsQuery = query(collection(db, getPath('jobDefinitions', classId)), orderBy("name"));
            const taxRulesQuery = query(collection(db, getPath('taxRules', classId)), where("autoDeduct", "==", true), where("isActive", "==", true));
            const payslipsQuery = query(collectionGroup(db, 'paySlips'), where('classId', '==', classId));

            const [studentsSnap, jobDefsSnap, taxRulesSnap, payslipsSnap] = await Promise.all([
                getDocs(studentsQuery), getDocs(jobDefsQuery), getDocs(taxRulesQuery), getDocs(payslipsQuery)
            ]);

            setStudents(studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() })));
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

    // --- 3. 핵심 로직 및 헬퍼 함수 ---

    const savePayslipAndBalance = useCallback(async (batch, studentUid, payrollData) => {
        const payslipCollectionPath = getPath('paySlips', classId, { studentUid });
        const newPayslipRef = doc(collection(db, payslipCollectionPath));
        const payslipDocData = {
            ...payrollData,
            classId: classId,
            studentUid: studentUid,
            generatedBy: teacherUid,
            generatedAt: serverTimestamp(),
        };
        batch.set(newPayslipRef, payslipDocData);

        const studentPath = getPath('student', classId, { studentUid });
        batch.update(doc(db, studentPath), { "assets.cash": increment(payrollData.netSalary) });
    }, [classId, teacherUid]);

    const checkForOverlappingPayslips = useCallback((studentUid, newPStartDate, newPEndDate, jobName) => {
        if (!studentUid || !newPStartDate || !newPEndDate || !jobName) {
            return "기간 중복 체크를 위한 정보가 부족합니다.";
        }
        const studentPayslips = allPayslipsCache.get(studentUid) || [];
        if (studentPayslips.length === 0) return false;

        const newStart = dayjs(newPStartDate).startOf('day');
        const newEnd = dayjs(newPEndDate).endOf('day');

        for (const payslip of studentPayslips) {
            // 해당 직업의 명세서가 아니거나, 날짜 정보가 없으면 건너뜀
            if (payslip.studentJob !== jobName || !payslip.paymentStartDate || !payslip.paymentEndDate) {
                continue;
            }
            const existingStart = dayjs(payslip.paymentStartDate.toDate());
            const existingEnd = dayjs(payslip.paymentEndDate.toDate());

            // (A시작 <= B끝) AND (A끝 >= B시작)
            if (newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart)) {
                return `'${jobName}' 직업에 대해 이미 급여가 지급된 기간(${existingStart.format('YYYY.MM.DD')}~${existingEnd.format('YYYY.MM.DD')})과 중복됩니다.`;
            }
        }
        return false; // 중복 없음
    }, [allPayslipsCache]);

    const calculatePayrollForSingleJob = useCallback((student, jobName, startDateStr, numWeeks) => {
        const jobDef = jobDefinitions.find(jd => jd.name === jobName);
        if (!jobDef || typeof jobDef.baseSalary !== 'number') {
            return { error: `직업(${jobName})의 주급 정보를 찾을 수 없습니다.` };
        }

        const weeklyBaseSalary = jobDef.baseSalary;
        const baseSalary = weeklyBaseSalary * numWeeks;
        const deductions = [];
        let totalDeductions = 0;

        activeAutoTaxRules.forEach(rule => {
            let applies = false;
            if (rule.targetType === 'all') applies = true;
            else if (rule.targetType === 'job' && jobName === rule.targetValue) applies = true;
            else if (rule.targetType === 'individual' && Array.isArray(rule.targetValue) && rule.targetValue.includes(student.uid)) applies = true;

            if (applies) {
                let deductionAmount = 0;
                const ruleTypeSafe = (rule.type || '').toLowerCase();
                if (ruleTypeSafe === 'percent') {
                    deductionAmount = Math.round(baseSalary * (rule.value / 100));
                } else if (ruleTypeSafe === 'fixed') {
                    deductionAmount = rule.value * numWeeks;
                }
                if (deductionAmount > 0) {
                    deductions.push({ taxRuleId: rule.id, name: rule.name, amount: deductionAmount, originalRuleType: rule.type, originalRuleValue: rule.value });
                    totalDeductions += deductionAmount;
                }
            }
        });

        const netSalary = Math.max(0, baseSalary - totalDeductions);
        const sDateUTC = dayjs(startDateStr).startOf('day').toDate();
        const eDateUTC = dayjs(sDateUTC).add(numWeeks * 7 - 1, 'day').endOf('day').toDate();

        return {
            paymentStartDate: Timestamp.fromDate(sDateUTC),
            paymentEndDate: Timestamp.fromDate(eDateUTC),
            numberOfWeeksPaid: Number(numWeeks),
            paymentPeriodDescription: `${numWeeks}주분 급여 (${startDateStr} ~ ${dayjs(eDateUTC).format('YYYY-MM-DD')})`,
            studentUid: student.uid,
            studentName: student.name || 'N/A',
            studentJob: jobName,
            originalWeeklyBaseSalary: weeklyBaseSalary,
            baseSalary,
            deductions,
            totalDeductions,
            netSalary,
            currencyUnit,
        };
    }, [jobDefinitions, activeAutoTaxRules, currencyUnit]);

    const processAllJobsForStudent = useCallback(async (student, startDate, numWeeks, batch) => {
        const studentJobs = Array.isArray(student.jobs) ? student.jobs.filter(j => j && j !== "없음") : [];
        if (studentJobs.length === 0) {
            return { successCount: 0, errors: [`${student.name}: 배정된 직업이 없습니다.`] };
        }

        const endDate = dayjs(startDate).add(numWeeks * 7 - 1, 'day').format('YYYY-MM-DD');
        let successCount = 0;
        const errors = [];

        for (const jobName of studentJobs) {
            const processingKey = `${student.uid}_${jobName}`;
            if (individualPayProcessing[processingKey]) {
                errors.push(`${student.name}(${jobName}): 이미 개별 처리 중입니다.`);
                continue;
            }

            const overlapError = checkForOverlappingPayslips(student.uid, startDate, endDate, jobName);
            if (overlapError) {
                errors.push(`${student.name}: ${overlapError}`);
                continue;
            }

            const payrollData = calculatePayrollForSingleJob(student, jobName, startDate, numWeeks);
            if (payrollData.error) {
                errors.push(`${student.name}(${jobName}): ${payrollData.error}`);
                continue;
            }

            await savePayslipAndBalance(batch, student.uid, payrollData);
            successCount++;
        }

        return { successCount, errors };

    }, [individualPayProcessing, checkForOverlappingPayslips, calculatePayrollForSingleJob, savePayslipAndBalance]);

    const checkPaidStatusForPeriod = useCallback((studentsToCheck, startDateStr, numWeeks) => {
        if (!startDateStr || !(numWeeks > 0) || !studentsToCheck || studentsToCheck.length === 0) {
            setPaidStatus({});
            return;
        }

        const newPaidStatusUpdates = {};
        const newStart = dayjs(startDateStr).startOf('day');
        const newEnd = dayjs(startDateStr).add(numWeeks * 7 - 1, 'day').endOf('day');

        studentsToCheck.forEach(student => {
            const studentJobs = Array.isArray(student.jobs) ? student.jobs.filter(j => j && j !== "없음") : [];
            const studentPayslips = allPayslipsCache.get(student.uid) || [];

            studentJobs.forEach(jobName => {
                const paidKey = `${student.uid}_${jobName}_${startDateStr}_${numWeeks}`;
                const isPaidForPeriod = studentPayslips.some(payslip => {
                    if (payslip.studentJob !== jobName || !payslip.paymentStartDate || !payslip.paymentEndDate) {
                        return false;
                    }
                    const existingStart = dayjs(payslip.paymentStartDate.toDate());
                    const existingEnd = dayjs(payslip.paymentEndDate.toDate());
                    return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
                });
                newPaidStatusUpdates[paidKey] = isPaidForPeriod ? 'paid' : 'unpaid';
            });
        });

        setPaidStatus(newPaidStatusUpdates);
    }, [allPayslipsCache]);

    // --- 4. UI 이벤트 핸들러 ---

    const handleStudentJobChange = useCallback((uid, newJobs) => {
        setEditedStudentJobs(prev => {
            const updated = { ...prev };
            // 직업이 없거나 빈 배열이면 편집 목록에서 제거
            if (!newJobs || (Array.isArray(newJobs) && newJobs.length === 0)) {
                delete updated[uid];
            } else {
                updated[uid] = newJobs;
            }
            return updated;
        });
    }, []);

    const handleSaveStudentJobs = useCallback(async () => {
        if (Object.keys(editedStudentJobs).length === 0) {
            showFeedback("변경된 직업 정보가 없습니다.", 'info');
            return { success: false, error: "변경사항 없음" };
        }
        if (!classId) {
            showFeedback("학급 정보가 없습니다.", 'error');
            return { success: false, error: "학급 정보 없음" };
        }

        setIsLoading(prev => ({ ...prev, savingJobs: true }));
        try {
            const batch = writeBatch(db);
            let batchCount = 0;

            Object.entries(editedStudentJobs).forEach(([uid, jobData]) => {
                const studentPath = getPath('student', classId, { studentUid: uid });
                if (studentPath) {
                    const jobsToSave = Array.isArray(jobData) ? jobData : [jobData];
                    batch.update(doc(db, studentPath), {
                        jobs: jobsToSave,
                        job: jobsToSave[0] || "없음" // 호환성을 위해 첫 번째 직업 저장
                    });
                    batchCount++;
                }
            });

            if (batchCount === 0) throw new Error('업데이트할 유효한 학생이 없습니다.');

            await batch.commit();

            await fetchAllData(); // 데이터 새로고침
            setEditedStudentJobs({}); // 편집 상태 초기화
            return { success: true };

        } catch (err) {
            console.error('학생 직업 정보 저장 오류:', err);
            showFeedback("학생 직업 정보 저장 중 오류 발생: " + err.message, 'error');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(prev => ({ ...prev, savingJobs: false }));
        }
    }, [editedStudentJobs, classId, fetchAllData, showFeedback]);

    // ✅ 새로 추가: 개별 직업별 급여 지급 함수
    const handlePayJobSalary = useCallback(async (studentUid, jobName) => {
        if (!teacherUid) {
            showFeedback("교사 정보가 로드되지 않았습니다. 잠시 후 다시 시도해주세요.", 'error');
            return;
        }

        if (!paymentStartDate || numberOfWeeksToPay < 1) {
            showFeedback("지급 시작일과 주 수를 선택하세요.", 'error');
            return;
        }

        const student = students.find(s => s.uid === studentUid);
        if (!student) {
            showFeedback("학생 정보를 찾을 수 없습니다.", 'error');
            return;
        }

        const jobDef = jobDefinitions.find(jd => jd.name === jobName);
        if (!jobDef) {
            showFeedback(`직업 "${jobName}"을 찾을 수 없습니다.`, 'error');
            return;
        }

        const processingKey = `${studentUid}_${jobName}`;
        setIndividualPayProcessing(prev => ({ ...prev, [processingKey]: true }));

        try {
            // 중복 지급 체크
            const endDate = dayjs(paymentStartDate).add(numberOfWeeksToPay * 7 - 1, 'day').format('YYYY-MM-DD');
            const overlapError = checkForOverlappingPayslips(studentUid, paymentStartDate, endDate, jobName);

            if (overlapError) {
                showFeedback(overlapError, 'error');
                return;
            }

            // 급여 계산
            const payrollData = calculatePayrollForSingleJob(student, jobName, paymentStartDate, numberOfWeeksToPay);
            if (payrollData.error) {
                showFeedback(`급여 계산 오류: ${payrollData.error}`, 'error');
                return;
            }

            // Firestore에 저장
            const batch = writeBatch(db);
            await savePayslipAndBalance(batch, studentUid, payrollData);
            await batch.commit();

            showFeedback(`${student.name}님의 ${jobName} 급여가 지급되었습니다. (${payrollData.netSalary.toLocaleString()}${currencyUnit})`, 'success');
            await fetchAllData();

        } catch (error) {
            console.error('급여 지급 오류:', error);
            showFeedback(`급여 지급 중 오류가 발생했습니다: ${error.message}`, 'error');
        } finally {
            setIndividualPayProcessing(prev => ({ ...prev, [processingKey]: false }));
        }
    }, [
        students, jobDefinitions, paymentStartDate, numberOfWeeksToPay,
        teacherUid, checkForOverlappingPayslips, calculatePayrollForSingleJob,
        savePayslipAndBalance, fetchAllData, showFeedback, currencyUnit
    ]);

    const handlePayIndividualSalary = useCallback(async (studentUid) => {
        if (!paymentStartDate || numberOfWeeksToPay < 1) {
            showFeedback("지급 시작일과 주 수를 선택하세요.", 'error');
            return;
        }
        const student = students.find(s => s.uid === studentUid);
        if (!student) return;

        setIndividualPayProcessing(prev => ({ ...prev, [studentUid]: true }));
        try {
            const batch = writeBatch(db);
            const { successCount, errors } = await processAllJobsForStudent(student, paymentStartDate, numberOfWeeksToPay, batch);

            if (errors.length > 0) {
                showFeedback(errors.join('\n'), 'error');
            }
            if (successCount > 0) {
                await batch.commit();
                showFeedback(`${student.name}님에게 ${successCount}건의 급여 지급 완료.`, 'success');
                await fetchAllData();
            }
        } catch (err) {
            showFeedback(`${student.name}님 급여 지급 중 오류 발생: ${err.message}`, 'error');
        } finally {
            setIndividualPayProcessing(prev => ({ ...prev, [studentUid]: false }));
        }
    }, [students, paymentStartDate, numberOfWeeksToPay, processAllJobsForStudent, fetchAllData, showFeedback]);

    const handleProcessBulkPayroll = useCallback(async () => {
        const studentsToPay = students.filter(s => selectedStudentsForPayroll.has(s.uid));
        if (studentsToPay.length === 0) {
            showFeedback("월급을 지급할 학생을 선택해주세요.", 'info');
            return;
        }

        setProcessingPayroll(true);
        const batch = writeBatch(db);
        const allErrors = [];
        let totalSuccessCount = 0;

        for (const student of studentsToPay) {
            const { successCount, errors } = await processAllJobsForStudent(student, paymentStartDate, numberOfWeeksToPay, batch);
            if (successCount > 0) totalSuccessCount += successCount;
            if (errors.length > 0) allErrors.push(...errors);
        }

        try {
            if (totalSuccessCount > 0) {
                await batch.commit();
            }
            showFeedback(`일괄 지급 완료: 성공 ${totalSuccessCount}건, 오류 ${allErrors.length}건`, allErrors.length > 0 ? 'warning' : 'success');
            if (allErrors.length > 0) console.error("일괄 지급 오류 내역:", allErrors);
            if (totalSuccessCount > 0) await fetchAllData();

        } catch (err) {
            showFeedback("일괄 지급 최종 저장 중 오류: " + err.message, 'error');
        } finally {
            setProcessingPayroll(false);
        }
    }, [students, selectedStudentsForPayroll, paymentStartDate, numberOfWeeksToPay, processAllJobsForStudent, fetchAllData, showFeedback]);

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
            const newEndDate = dayjs(paymentStartDate).add(numberOfWeeksToPay * 7 - 1, 'day').format('YYYY-MM-DD');
            setCalculatedEndDate(newEndDate);
            checkPaidStatusForPeriod(students, paymentStartDate, numberOfWeeksToPay);
        }
    }, [students, paymentStartDate, numberOfWeeksToPay, isLoading.payslipsCache, checkPaidStatusForPeriod]);

    // --- 6. 최종 반환 객체 ---
    return {
        // 상태
        students,
        jobDefinitions,
        paidStatus,
        currencyUnit,
        calculatedEndDate,
        editedStudentJobs,
        paymentStartDate,
        numberOfWeeksToPay,
        selectedStudentsForPayroll,
        individualPayProcessing,
        processingPayroll,
        isLoading,
        // 상태 설정 함수
        setPaymentStartDate,
        setNumberOfWeeksToPay,
        // 핸들러 함수
        handleStudentJobChange,
        handleSaveStudentJobs,
        handlePayIndividualSalary,
        handlePayJobSalary, // ✅ 새로 추가된 개별 직업 급여 지급 함수
        handleProcessBulkPayroll,
        handleToggleStudentSelection,
        handleToggleSelectAllStudents,
        // 데이터 관리
        refreshData: fetchAllData,
        fetchAllData, // ✅ PayrollTab에서 사용
        showFeedback, // ✅ PayrollTab에서 사용
    };
};