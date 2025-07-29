// /src/components/modals/StudentTaxManagementModal.jsx

import React, { useState, useEffect } from 'react';
// import { getStudentUnpaidBills, getStudentTaxPayments, payTaxBill } from '../../api'; // API 함수 (가상)

const StudentTaxManagementModal = ({ isOpen, onClose, studentId, studentName, userRole }) => {
    const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid' 또는 'history'
    const [unpaidBills, setUnpaidBills] = useState([]);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [payingBillId, setPayingBillId] = useState(null); // 현재 납부 처리 중인 bill ID

    // --- 가상 데이터 (API 연동 전 테스트용) ---
    const MOCK_UNPAID_BILLS = [
        {
            id: 'bill001',
            name: '특별 활동 참가비',
            amount: 75,
            reason: '봄 소풍 참가 비용',
            issuedAt: { seconds: 1712500000, nanoseconds: 0 },
            dueDate: { seconds: 1713500000, nanoseconds: 0 },
            currencyUnit: '코인',
            isPaid: false,
        },
        {
            id: 'bill002',
            name: '도서관 연체료',
            amount: 15,
            reason: '반납일 3일 초과',
            issuedAt: { seconds: 1712800000, nanoseconds: 0 },
            dueDate: { seconds: 1714000000, nanoseconds: 0 },
            currencyUnit: '코인',
            isPaid: false,
        },
    ];

    const MOCK_PAYMENT_HISTORY = [
        {
            id: 'payment001',
            billId: 'billOld003', // 원래 납부했던 bill의 ID (선택적)
            taxName: '환경미화 기여금',
            amount: 20,
            paidAt: { seconds: 1712000000, nanoseconds: 0 },
            currencyUnit: '코인',
            paymentMethod: '수동납부' // '자동공제' 또는 '수동납부' 등
        },
        {
            id: 'payment002',
            taxName: '전기세 (자동공제)',
            amount: 10,
            paidAt: { seconds: 1710000000, nanoseconds: 0 }, // 월급 지급일과 유사
            currencyUnit: '코인',
            paymentMethod: '자동공제'
        },
    ];

    useEffect(() => {
        if (isOpen && studentId) {
            setIsLoading(true);
            setError(null);

            // --- 가상 API 호출 (테스트용) ---
            setTimeout(() => {
                if (activeTab === 'unpaid') {
                    setUnpaidBills(MOCK_UNPAID_BILLS.filter(bill => !bill.isPaid));
                } else {
                    // 실제로는 자동 공제된 내역도 포함하여 구성
                    setPaymentHistory(MOCK_PAYMENT_HISTORY.concat(
                        MOCK_UNPAID_BILLS.filter(bill => bill.isPaid).map(bill => ({
                            id: `paid_${bill.id}`,
                            billId: bill.id,
                            taxName: bill.name,
                            amount: bill.amount,
                            paidAt: new Date().getTime() / 1000, // 임시 납부일
                            currencyUnit: bill.currencyUnit,
                            paymentMethod: '수동납부'
                        }))
                    ));
                }
                setIsLoading(false);
            }, 500);

            // --- 실제 API 호출 로직 (주석 처리) ---
            // if (activeTab === 'unpaid') {
            //   getStudentUnpaidBills(studentId)
            //     .then(data => { setUnpaidBills(data); setIsLoading(false); })
            //     .catch(err => { setError("미납 세금 정보를 가져오지 못했습니다."); setIsLoading(false); });
            // } else {
            //   getStudentTaxPayments(studentId) // 자동 공제 내역도 포함하도록 API 설계 필요
            //     .then(data => { setPaymentHistory(data); setIsLoading(false); })
            //     .catch(err => { setError("납부 내역을 가져오지 못했습니다."); setIsLoading(false); });
            // }
        }
    }, [isOpen, studentId, activeTab]);

    const handlePayBill = async (bill) => {
        if (userRole === 'teacher') {
            alert("교사는 학생의 세금을 직접 납부할 수 없습니다. (관리 기능은 별도 구현)");
            return;
        }
        setPayingBillId(bill.id);
        // --- 가상 납부 처리 ---
        console.log(`Paying bill: ${bill.name} (${bill.amount} ${bill.currencyUnit})`);
        setTimeout(() => {
            // 1. 로컬 상태에서 해당 고지서 제거
            setUnpaidBills(prev => prev.filter(b => b.id !== bill.id));
            // 2. 가상으로 납부 내역에 추가 (실제로는 API 성공 후 상태 업데이트)
            const newPayment = {
                id: `payment_${Date.now()}`,
                billId: bill.id,
                taxName: bill.name,
                amount: bill.amount,
                paidAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }, // 현재 시간
                currencyUnit: bill.currencyUnit,
                paymentMethod: '수동납부'
            };
            setPaymentHistory(prev => [newPayment, ...prev]); // 최신 내역을 위로
            alert(`${bill.name} 납부가 완료되었습니다.`);
            setPayingBillId(null);
        }, 1000);

        // --- 실제 API 호출 로직 (주석 처리) ---
        // try {
        //   await payTaxBill(studentId, bill.id, bill.amount); // API에 학생 잔액 차감, bill 상태 변경, payment 기록 생성 요청
        //   setUnpaidBills(prev => prev.filter(b => b.id !== bill.id)); // 성공 시 UI 업데이트
        //   // 필요하다면 paymentHistory도 업데이트
        //   alert(`${bill.name} 납부가 완료되었습니다.`);
        // } catch (err) {
        //   console.error("Error paying bill:", err);
        //   alert(`${bill.name} 납부 중 오류가 발생했습니다.`);
        // } finally {
        //   setPayingBillId(null);
        // }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
        return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) {
        return null;
    }

    // --- 모달 스타일 (인라인 스타일 예시, PayslipModal과 유사) ---
    const modalStyle = { /* PayslipModal의 modalStyle과 유사하게 설정 */
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        backgroundColor: 'white', padding: '20px', zIndex: 1000, width: '80%',
        maxWidth: '700px', maxHeight: '80vh', overflowY: 'auto',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)', borderRadius: '8px', fontFamily: 'Arial, sans-serif'
    };
    const overlayStyle = { /* PayslipModal의 overlayStyle과 유사하게 설정 */
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999
    };
    const tabButtonStyle = (isActive) => ({
        padding: '10px 15px', cursor: 'pointer', border: '1px solid #ccc',
        borderBottom: isActive ? 'none' : '1px solid #ccc',
        backgroundColor: isActive ? 'white' : '#f0f0f0',
        marginRight: '5px', borderRadius: '4px 4px 0 0'
    });
    const tabContentStyle = { border: '1px solid #ccc', padding: '15px', borderTop: 'none' };

    return (
        <>
            <div style={overlayStyle} onClick={onClose} />
            <div style={modalStyle}>
                <button onClick={onClose} style={{ float: 'right', padding: '5px 10px', cursor: 'pointer' }}>X</button>
                <h2>{studentName ? `${studentName}님의 ` : ''}세금 관리</h2>

                <div>
                    <button style={tabButtonStyle(activeTab === 'unpaid')} onClick={() => setActiveTab('unpaid')}>
                        미납 세금 ({activeTab === 'unpaid' && !isLoading ? unpaidBills.length : '...'})
                    </button>
                    <button style={tabButtonStyle(activeTab === 'history')} onClick={() => setActiveTab('history')}>
                        납부 완료 내역 ({activeTab === 'history' && !isLoading ? paymentHistory.length : '...'})
                    </button>
                </div>

                <div style={tabContentStyle}>
                    {isLoading && <p>로딩 중...</p>}
                    {error && <p style={{ color: 'red' }}>{error}</p>}

                    {!isLoading && !error && activeTab === 'unpaid' && (
                        unpaidBills.length === 0 ? <p>미납된 세금이 없습니다.</p> :
                            unpaidBills.map(bill => (
                                <div key={bill.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                                    <h4>{bill.name}</h4>
                                    <p><strong>금액:</strong> {bill.amount} {bill.currencyUnit}</p>
                                    <p><strong>사유:</strong> {bill.reason || 'N/A'}</p>
                                    <p><strong>발행일:</strong> {formatDate(bill.issuedAt)}</p>
                                    <p><strong>납부 기한:</strong> {formatDate(bill.dueDate)}</p>
                                    {userRole === 'student' && (
                                        <button
                                            onClick={() => handlePayBill(bill)}
                                            disabled={payingBillId === bill.id}
                                            style={{ backgroundColor: 'green', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            {payingBillId === bill.id ? '납부 처리 중...' : '납부하기'}
                                        </button>
                                    )}
                                    {userRole === 'teacher' && <small>(교사는 학생 세금 정보 조회만 가능)</small>}
                                </div>
                            ))
                    )}

                    {!isLoading && !error && activeTab === 'history' && (
                        paymentHistory.length === 0 ? <p>납부 내역이 없습니다.</p> :
                            paymentHistory.map(payment => (
                                <div key={payment.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                                    <h4>{payment.taxName}</h4>
                                    <p><strong>납부 금액:</strong> {payment.amount} {payment.currencyUnit}</p>
                                    <p><strong>납부일:</strong> {formatDate(payment.paidAt)}</p>
                                    <p><strong>납부 방식:</strong> {payment.paymentMethod}</p>
                                </div>
                            ))
                    )}
                </div>
                <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 15px' }}>닫기</button>
            </div>
        </>
    );
};

export default StudentTaxManagementModal;