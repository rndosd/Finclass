// src/pages/stock/components/StockSidebar.jsx

import React from 'react';
import { Briefcase, Repeat, Settings2, Home as HomeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StockSidebar = ({
    balanceBIL,
    balanceUSD,
    conversionRate,
    isStockAdmin,
    onOpenPortfolioModal,
    onOpenExchangeModal,
    onOpenMarketSettingsModal,
    user,
    isLoadingUserData,
    isLoadingConversionRate,
    currencyUnit
}) => {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    const getButtonClass = (disabled = false) =>
        `w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${disabled
            ? 'text-slate-400 cursor-not-allowed'
            : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
        }`;

    return (
        <aside className="w-full md:w-64 p-4 bg-white shadow-lg border-r border-slate-200 space-y-6 min-h-screen">
            {/* 홈 버튼 */}
            <div className="mb-6">
                <button
                    onClick={handleGoHome}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-indigo-700 hover:text-indigo-900 text-sm font-bold transition"
                >
                    <HomeIcon className="h-5 w-5" />
                    <span className="text-lg">홈</span>
                </button>
            </div>

            {/* USD 잔액 */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">내 USD 자산</h3>
                <div className="p-4 bg-green-50 rounded-lg text-green-700 flex items-center justify-center">
                    <p className="text-2xl font-bold">
                        ${balanceUSD !== null
                            ? balanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '---'}
                    </p>
                </div>
            </div>

            {/* 버튼들 (텍스트 기반으로 변경) */}
            <button
                onClick={onOpenPortfolioModal}
                className={getButtonClass(!user || isLoadingUserData)}
                disabled={!user || isLoadingUserData}
            >
                <Briefcase className="h-5 w-5" />
                보유종목 확인
            </button>

            <button
                onClick={onOpenExchangeModal}
                className={getButtonClass(!user || isLoadingUserData || isLoadingConversionRate)}
                disabled={!user || isLoadingUserData || isLoadingConversionRate}
            >
                <Repeat className="h-5 w-5" />
                환전하기
            </button>

            {isStockAdmin && (
                <button
                    onClick={onOpenMarketSettingsModal}
                    className={getButtonClass()}
                >
                    <Settings2 className="h-5 w-5" />
                    시장 설정 (관리자)
                </button>
            )}

            {/* 환율 정보 */}
            <div className="text-xs text-slate-500 pt-3 border-t border-slate-200">
                현재 환율: 1 USD = {typeof conversionRate === 'number' ? conversionRate.toFixed(2) : 'N/A'} {currencyUnit} |
                1 {currencyUnit} ≈ {(conversionRate ? 1 / conversionRate : 0).toFixed(4)} USD
            </div>
        </aside>
    );
};

export default StockSidebar;
