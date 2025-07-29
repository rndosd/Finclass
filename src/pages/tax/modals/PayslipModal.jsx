// /src/components/modals/PayslipModal.jsx

import React, { useState, useEffect } from 'react';
// import { getStudentPayslips } from '../../api'; // 학생의 월급 명세서 목록을 가져오는 API 함수 (가상)

const PayslipModal = ({ isOpen, onClose, studentId, studentName, userRole }) => {
    const [payslips, setPayslips] = useState([]); // 전체 월급 명세서 목록
    const [selectedPayslip, setSelectedPayslip] = useState(null); // 선택된 월급 명세서
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- 가상 데이터 (API 연동 전 테스트용) ---
    const MOCK_PAYSLIPS = [
        {
            id: '2025-04', // YYYY-MM 형식의 문서 ID
            period: '2025년 4월',
            baseSalary: 300,
            deductions: [
                { taxRuleId: 'envTaxRuleId', name: '환경세', amount: 30 },
                { taxRuleId: 'elecTaxRuleId', name: '전기세', amount: 10 },
            ],
            netSalary: 260,
            generatedAt: { seconds: 1713000000, nanoseconds: 0 }, // 예시 Timestamp
            currencyUnit: '코인'
        },
        {
            id: '2025-03',
            period: '2025년 3월',
            baseSalary: 290,
            deductions: [
                { taxRuleId: 'envTaxRuleId', name: '환경세', amount: 29 },
                { taxRuleId: 'nationalPension', name: '국민연금(가상)', amount: 20 },
            ],
            netSalary: 241,
            generatedAt: { seconds: 1710000000, nanoseconds: 0 },
            currencyUnit: '코인'
        },
    ];

    useEffect(() => {
        if (isOpen && studentId) {
            setIsLoading(true);
            setError(null);
            // --- 실제 API 호출 로직 (주석 처리) ---
            // getStudentPayslips(studentId)
            //   .then(data => {
            //     setPayslips(data); // API 응답 형식에 맞게 데이터 가공 필요
            //     if (data.length > 0) {
            //       setSelectedPayslip(data[0]); // 기본으로 첫 번째 명세서 선택
            //     }
            //     setIsLoading(false);
            //   })
            //   .catch(err => {
            //     console.error("Error fetching payslips:", err);
            //     setError("월급 명세서를 불러오는 데 실패했습니다.");
            //     setIsLoading(false);
            //   });

            // --- 가상 API 호출 (테스트용) ---
            setTimeout(() => {
                setPayslips(MOCK_PAYSLIPS);
                if (MOCK_PAYSLIPS.length > 0) {
                    setSelectedPayslip(MOCK_PAYSLIPS[0]);
                }
                setIsLoading(false);
            }, 500);
        } else if (!isOpen) {
            // 모달이 닫힐 때 선택된 명세서 초기화
            setSelectedPayslip(null);
            setPayslips([]);
        }
    }, [isOpen, studentId]); // studentId도 의존성 배열에 추가

    const handleSelectPayslip = (payslip) => {
        setSelectedPayslip(payslip);
    };

    const calculateTotalDeductions = (deductions) => {
        if (!deductions) return 0;
        return deductions.reduce((total, item) => total + item.amount, 0);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        // Firestore Timestamp 객체를 Date 객체로 변환
        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
        return date.toLocaleDateString('ko-KR');
    };

    if (!isOpen) {
        return null;
    }

    // --- 모달 스타일 (인라인 스타일 예시) ---
    const modalStyle = {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'white',
        padding: '20px',
        zIndex: 1000,
        width: '80%',
        maxWidth: '700px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
        borderRadius: '8px',
        fontFamily: 'Arial, sans-serif'
    };

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 999
    };

    const listPaneStyle = {
        width: '30%',
        float: 'left',
        borderRight: '1px solid #eee',
        paddingRight: '15px',
        maxHeight: 'calc(80vh - 100px)', // 헤더, 푸터 제외 높이
        overflowY: 'auto'
    };

    const detailPaneStyle = {
        width: '65%', // 패딩 고려
        float: 'left',
        paddingLeft: '15px',
        maxHeight: 'calc(80vh - 100px)',
        overflowY: 'auto'
    };

    const listItemStyle = (isSelected) => ({
        padding: '10px',
        cursor: 'pointer',
        backgroundColor: isSelected ? '#e0e0e0' : 'transparent',
        borderBottom: '1px solid #f0f0f0',
        borderRadius: '4px',
        marginBottom: '5px'
    });

    const clearFloatStyle = {
        clear: 'both'
    };


    return (
        <>
            <div style={overlayStyle} onClick={onClose} />
            <div style={modalStyle}>
                <button onClick={onClose} style={{ float: 'right', padding: '5px 10px', cursor: 'pointer' }}>X</button>
                <h2>{studentName ? `${studentName}님의 ` : ''}월급 명세서 내역</h2>

                {isLoading && <p>로딩 중...</p>}
                {error && <p style={{ color: 'red' }}>{error}</p>}

                {!isLoading && !error && payslips.length === 0 && <p>표시할 월급 명세서가 없습니다.</p>}

                {!isLoading && !error && payslips.length > 0 && (
                    <>
                        <div style={listPaneStyle}>
                            <h4>지급 기간 목록</h4>
                            {payslips.map(ps => (
                                <div
                                    key={ps.id}
                                    style={listItemStyle(selectedPayslip && selectedPayslip.id === ps.id)}
                                    onClick={() => handleSelectPayslip(ps)}
                                >
                                    {ps.period || ps.id}
                                </div>
                            ))}
                        </div>

                        <div style={detailPaneStyle}>
                            {selectedPayslip ? (
                                <>
                                    <h4>{selectedPayslip.period || selectedPayslip.id} 상세 내역</h4>
                                    <p><strong>지급일:</strong> {formatDate(selectedPayslip.generatedAt)}</p>
                                    <p><strong>기본급:</strong> {selectedPayslip.baseSalary} {selectedPayslip.currencyUnit}</p>
                                    <div>
                                        <strong>공제 항목:</strong>
                                        {selectedPayslip.deductions && selectedPayslip.deductions.length > 0 ? (
                                            <ul style={{ listStyleType: 'none', paddingLeft: '15px' }}>
                                                {selectedPayslip.deductions.map((deduction, index) => (
                                                    <li key={index}>
                                                        {deduction.name}: {deduction.amount} {selectedPayslip.currencyUnit}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p>공제 항목 없음</p>}
                                    </div>
                                    <p><strong>총 공제액:</strong> {calculateTotalDeductions(selectedPayslip.deductions)} {selectedPayslip.currencyUnit}</p>
                                    <hr />
                                    <p><strong>실수령액:</strong> {selectedPayslip.netSalary} {selectedPayslip.currencyUnit}</p>
                                </>
                            ) : (
                                <p>목록에서 지급 기간을 선택해주세요.</p>
                            )}
                        </div>
                        <div style={clearFloatStyle}></div>
                    </>
                )}
                <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 15px' }}>닫기</button>
            </div>
        </>
    );
};

export default PayslipModal;