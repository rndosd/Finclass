// src/pages/dashboard/modals/AssetDetailModal.jsx
import React, { useEffect, useState } from 'react';
import { Modal, Button } from '../../../components/ui';
import { db } from '../../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUser } from '../../../contexts/UserContext';
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip,
    Legend, ResponsiveContainer
} from 'recharts';
import { Wallet, TrendingUp, PiggyBank, Landmark } from 'lucide-react'; // ArrowTrendingUpIcon 수정 필요시 확인

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

const AssetRow = ({ Icon, color, label, value, currencyUnit }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-200 last:border-b-0">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full`} style={{ backgroundColor: `${color}1A` }}>
                <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <span className="text-slate-600">{label}</span>
        </div>
        <span className="font-semibold text-slate-800">
            {value.toLocaleString()} {currencyUnit}
        </span>
    </div>
);

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const AssetDetailModal = ({ isOpen, onClose, currencyUnit = '코인' }) => {
    const { userData, classId } = useUser();
    const [assetDetail, setAssetDetail] = useState({
        cash: 0,
        stockValue: { value: 0, usdValue: 0 },
        deposit: 0,
        loan: 0
    });

    useEffect(() => {
        if (!isOpen || !userData?.uid || !classId) return;

        const studentDocRef = doc(db, `classes/${classId}/students/${userData.uid}`);
        console.log('[AssetDetailModal] 실시간 자산 구독 시작:', `classes/${classId}/students/${userData.uid}`);

        const unsubscribe = onSnapshot(studentDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('[AssetDetailModal] 최신 자산 데이터:', data.assets);

                setAssetDetail({
                    cash: data.assets?.cash ?? 0,
                    stockValue: data.assets?.stockValue ?? { value: 0, usdValue: 0 },
                    deposit: data.assets?.deposit ?? 0,
                    loan: data.assets?.loan ?? 0
                });
            }
        });

        return () => {
            console.log('[AssetDetailModal] 자산 구독 해제');
            unsubscribe();
        };
    }, [isOpen, userData?.uid, classId]);

    const cash = assetDetail?.cash ?? 0;
    const stockValue = assetDetail?.stockValue?.value ?? 0;
    const deposit = assetDetail?.deposit ?? 0;
    const loan = assetDetail?.loan ?? 0;

    const totalAssets = cash + stockValue + deposit - loan;

    const pieData = [
        { name: '현금', value: cash },
        { name: '주식', value: stockValue },
        { name: '예금', value: deposit },
        { name: '대출', value: loan },
    ].filter(item => item.value > 0);

    const assetListData = [
        { Icon: Wallet, color: COLORS[0], label: '현금', value: cash },
        { Icon: TrendingUp, color: COLORS[1], label: '주식 평가액', value: stockValue }, // 아이콘 이름 수정 주의!
        { Icon: PiggyBank, color: COLORS[2], label: '예금', value: deposit },
        { Icon: Landmark, color: COLORS[3], label: '대출', value: -loan },
    ];

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} title="💰 자산 상세 내역" onClose={onClose} size="3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl">
                        {assetListData.map(asset => (
                            <AssetRow
                                key={asset.label}
                                Icon={asset.Icon}
                                color={asset.color}
                                label={asset.label}
                                value={asset.value}
                                currencyUnit={currencyUnit}
                            />
                        ))}
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-xl text-center">
                        <p className="text-sm font-semibold text-indigo-800">총 자산 (현금+주식+예금-대출)</p>
                        <p className="text-3xl font-bold text-indigo-700 mt-1">
                            {totalAssets.toLocaleString()} {currencyUnit}
                        </p>
                    </div>
                </div>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius="100%"
                                innerRadius="60%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(value) => `${value.toLocaleString()} ${currencyUnit}`} />
                            <Legend iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="pt-6 flex justify-end">
                <Button color="gray" onClick={onClose}>닫기</Button>
            </div>
        </Modal>
    );
};

export default AssetDetailModal;
