// src/pages/dashboard/modals/PaySlipModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, Card, Spinner } from '../../../components/ui';
import { X, FileText, Calendar, User, Briefcase, Clock, ChevronDown } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import { db } from '../../../firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const PaySlipModal = ({ isOpen, onClose, employeeData, currencyUnit }) => {
    const { classId, userData, classData } = useUser(); // userData와 classData 정보 가져오기
    const [allPaySlips, setAllPaySlips] = useState([]);
    const [selectedPaySlipId, setSelectedPaySlipId] = useState('');
    const [loading, setLoading] = useState(true);

    // 최신 급여 지급 내역 여러 개 가져오기
    useEffect(() => {
        const fetchLatestPaySlips = async () => {
            if (!isOpen || !classId || !employeeData?.uid) {
                setAllPaySlips([]);
                setSelectedPaySlipId('');
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const paySlipsRef = collection(db, 'classes', classId, 'students', employeeData.uid, 'paySlips');

                // 최근 10개 급여 내역 가져오기
                const q = query(
                    paySlipsRef,
                    orderBy('generatedAt', 'desc'),
                    limit(10)
                );

                const querySnapshot = await getDocs(q);
                const fetchedPaySlips = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllPaySlips(fetchedPaySlips);

                // 첫 번째 명세서를 기본으로 선택
                if (fetchedPaySlips.length > 0) {
                    setSelectedPaySlipId(fetchedPaySlips[0].id);
                }

            } catch (error) {
                console.error('급여 내역 조회 오류:', error);
                setAllPaySlips([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLatestPaySlips();
    }, [isOpen, classId, employeeData]);

    if (!isOpen) return null;

    // 선택된 ID에 해당하는 명세서 찾기
    const displayedPayslip = allPaySlips.find(p => p.id === selectedPaySlipId);

    // 헤더 제목 결정 로직
    const getHeaderTitle = () => {
        // 1순위: 학급명이 있는 경우 (classData에서 가져오기)
        if (classData?.className) {
            return `🏫 ${classData.className}`;
        }
        // 2순위: 선생님 이름이 있는 경우 (userData는 선생님이 아닐 수 있으므로 일반적인 표현 사용)
        if (userData?.email) {
            const emailName = userData.email.split('@')[0];
            return `🏫 ${emailName} 학급`;
        }
        // 기본값
        return '🏫 우리 학급 경제 시스템';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <div className="flex flex-col max-h-[90vh]">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-indigo-600" />
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">급여 명세서</h2>
                            {/* 급여 내역 선택 드롭다운 */}
                            {allPaySlips.length > 0 && (
                                <div className="relative mt-2">
                                    <select
                                        value={selectedPaySlipId}
                                        onChange={(e) => setSelectedPaySlipId(e.target.value)}
                                        className="appearance-none bg-white border border-slate-300 rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {allPaySlips.map(ps => (
                                            <option key={ps.id} value={ps.id}>
                                                {ps.studentJob} ({ps.generatedAt?.toDate().toLocaleDateString('ko-KR')} 지급)
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                </div>
                            )}
                        </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* 명세서 내용 */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner message="급여 내역을 불러오는 중..." />
                        </div>
                    ) : !displayedPayslip ? (
                        <div className="text-center py-12">
                            <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-600 mb-2">급여 내역이 없습니다</h3>
                            <p className="text-slate-500">아직 급여를 받은 기록이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* 회사/학급 정보 - 개인화된 헤더 */}
                            <div className="text-center border-b border-slate-200 pb-4">
                                <h1 className="text-2xl font-bold text-slate-800 mb-2">
                                    {getHeaderTitle()}
                                </h1>
                                <p className="text-slate-600">급여 명세서 (Pay Slip)</p>
                                {/* 추가: 학급 설명이나 부제목이 있다면 표시 */}
                                {classData?.description && (
                                    <p className="text-sm text-slate-500 mt-1">{classData.description}</p>
                                )}
                            </div>

                            {/* 직원 정보 및 급여 정보 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <Card.Header>
                                        <Card.Title className="text-base flex items-center gap-2">
                                            <User className="h-4 w-4" /> 직원 정보
                                        </Card.Title>
                                    </Card.Header>
                                    <Card.Content className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">이름:</span>
                                            <span className="font-medium">{displayedPayslip.studentName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">학번:</span>
                                            <span className="font-medium">{employeeData.studentNumber}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">직급:</span>
                                            <span className="font-medium">{displayedPayslip.studentJob}</span>
                                        </div>
                                    </Card.Content>
                                </Card>

                                <Card>
                                    <Card.Header>
                                        <Card.Title className="text-base flex items-center gap-2">
                                            <Calendar className="h-4 w-4" /> 급여 정보
                                        </Card.Title>
                                    </Card.Header>
                                    <Card.Content className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">급여 기간:</span>
                                            <span className="font-medium text-sm">
                                                {displayedPayslip.paymentPeriodDescription}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">지급일:</span>
                                            <span className="font-medium">
                                                {displayedPayslip.generatedAt?.toDate().toLocaleDateString('ko-KR')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">지급 주수:</span>
                                            <span className="font-medium">{displayedPayslip.numberOfWeeksPaid}주</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">통화:</span>
                                            <span className="font-medium">{displayedPayslip.currencyUnit}</span>
                                        </div>
                                    </Card.Content>
                                </Card>
                            </div>

                            {/* 급여 상세 내역 */}
                            <Card>
                                <Card.Header>
                                    <Card.Title className="text-base flex items-center gap-2">
                                        <Briefcase className="h-4 w-4" />
                                        급여 내역
                                    </Card.Title>
                                </Card.Header>
                                <Card.Content>
                                    <div className="space-y-4">
                                        {/* 지급 항목 */}
                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-green-800 mb-3">💰 지급 항목</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-700">주급 기본급</span>
                                                    <span className="font-medium text-green-700">
                                                        {displayedPayslip.originalWeeklyBaseSalary.toLocaleString()} {displayedPayslip.currencyUnit}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-700">지급 주수</span>
                                                    <span className="font-medium text-green-700">
                                                        × {displayedPayslip.numberOfWeeksPaid}주
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="border-t border-green-200 mt-3 pt-3">
                                                <div className="flex justify-between items-center font-semibold">
                                                    <span className="text-green-800">지급 총액</span>
                                                    <span className="text-green-800 text-lg">
                                                        {displayedPayslip.baseSalary.toLocaleString()} {displayedPayslip.currencyUnit}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 공제 항목 */}
                                        <div className="bg-red-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-red-800 mb-3">📉 공제 항목</h4>
                                            <div className="space-y-2">
                                                {displayedPayslip.deductions && displayedPayslip.deductions.length > 0 ? (
                                                    displayedPayslip.deductions.map((deduction, index) => (
                                                        <div key={index} className="flex justify-between items-center">
                                                            <span className="text-slate-700">
                                                                {deduction.name}
                                                                {deduction.originalRuleType === 'percent' &&
                                                                    ` (${deduction.originalRuleValue}%)`
                                                                }
                                                            </span>
                                                            <span className="font-medium text-red-700">
                                                                -{deduction.amount.toLocaleString()} {displayedPayslip.currencyUnit}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-slate-500 text-center py-2">공제 항목이 없습니다</div>
                                                )}
                                            </div>
                                            <div className="border-t border-red-200 mt-3 pt-3">
                                                <div className="flex justify-between items-center font-semibold">
                                                    <span className="text-red-800">공제 총액</span>
                                                    <span className="text-red-800 text-lg">
                                                        -{displayedPayslip.totalDeductions.toLocaleString()} {displayedPayslip.currencyUnit}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 실지급액 */}
                                        <div className="bg-indigo-50 p-6 rounded-lg border-2 border-indigo-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xl font-bold text-indigo-800">💵 실지급액</span>
                                                <span className="text-3xl font-bold text-indigo-800">
                                                    {displayedPayslip.netSalary.toLocaleString()} {displayedPayslip.currencyUnit}
                                                </span>
                                            </div>
                                            <p className="text-sm text-indigo-600 mt-2">
                                                위 금액이 귀하의 계좌로 입금되었습니다.
                                            </p>
                                        </div>
                                    </div>
                                </Card.Content>
                            </Card>

                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PaySlipModal;