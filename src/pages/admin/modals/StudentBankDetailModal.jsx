import React, { useMemo } from 'react';
import { Modal, Button } from '../../../components/ui';
import dayjs from 'dayjs';
import { PiggyBank, Landmark } from 'lucide-react';

const DetailSection = ({
    title,
    items,
    currencyUnit,
    totalAmount,
    icon: Icon,
    colorClass,
}) => (
    <div>
        <div className="flex justify-between items-center mb-2 pb-2 border-b">
            <h4 className={`font-bold text-md flex items-center gap-2 ${colorClass}`}>
                {Icon && <Icon className="w-5 h-5" />}
                {title} ({items.length}건)
            </h4>
            <p className={`font-bold text-lg ${colorClass}`}>
                총 {totalAmount.toLocaleString()} {currencyUnit}
            </p>
        </div>

        {items.length > 0 ? (
            <ul className="space-y-2 max-h-56 overflow-y-auto p-3 bg-slate-50 border rounded-lg">
                {items.map((item, idx) => (
                    <li key={item.id || idx} className="p-3 bg-white rounded-md text-sm border shadow-sm">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-slate-800">{item.productName || item.name || `상품 ${idx + 1}`}</p>
                            {/* ⭐ 수정: amount 또는 principal 필드를 모두 고려하여 표시 */}
                            <p className={`font-bold text-base sm:ml-4 mt-2 sm:mt-0 whitespace-nowrap ${colorClass}`}>
                                {(item.amount ?? item.principal ?? 0).toLocaleString()} {currencyUnit}
                            </p>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
                            <span>이율: 연 {item.interestRate}%</span>
                            <span>
                                {item.startDate && `가입: ${dayjs(item.startDate.toDate()).format('YYYY.MM.DD')}`}
                                {item.loanDate && `대출: ${dayjs(item.loanDate.toDate()).format('YYYY.MM.DD')}`}
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-center text-slate-500 py-6">해당 내역이 없습니다.</p>
        )}
    </div>
);


const StudentBankDetailModal = ({ isOpen, onClose, modalData, currencyUnit }) => {
    const { studentInfo, savings = [], loans = [] } = modalData || {};

    // ⭐ 수정: amount 또는 principal 필드를 모두 고려하여 합산
    const totalSavings = useMemo(() => savings.reduce((sum, i) => sum + (i.amount ?? i.principal ?? 0), 0), [savings]);
    const totalLoans = useMemo(() => loans.reduce((sum, i) => sum + (i.amount ?? i.principal ?? 0), 0), [loans]);

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`${studentInfo?.name ?? '학생'}님의 은행 상세 내역`}
            size="2xl"
        >
            <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-6">
                <DetailSection
                    title="가입한 예금"
                    items={savings}
                    currencyUnit={currencyUnit}
                    totalAmount={totalSavings}
                    icon={PiggyBank}
                    colorClass="text-blue-600"
                />
                <DetailSection
                    title="보유 중인 대출"
                    items={loans}
                    currencyUnit={currencyUnit}
                    totalAmount={totalLoans}
                    icon={Landmark}
                    colorClass="text-red-600"
                />
            </div>

            <div className="pt-4 mt-4 border-t flex justify-end">
                <Button onClick={onClose} variant="secondary">닫기</Button>
            </div>
        </Modal>
    );
};

export default StudentBankDetailModal;