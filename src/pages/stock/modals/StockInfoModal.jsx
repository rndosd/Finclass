// src/pages/stock/modals/StockInfoModal.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Spinner, Alert } from '../../../components/ui';
import TabButtonOriginal from '../../../components/ui/TabButton';
import { Building2, ExternalLink } from 'lucide-react';
import { useStockContext } from '../../../contexts/StockContext';

const TabButton = TabButtonOriginal;

const StockInfoModal = ({ isOpen, onClose, symbol }) => {
    const {
        profileMap,
        fetchProfile,
        isLoadingProfileMap,
        errorProfileMap
    } = useStockContext();

    const [activeTab, setActiveTab] = useState('profile');
    const lastFetchedTab = useRef(null);

    useEffect(() => {
        if (isOpen && symbol && activeTab === 'profile' && lastFetchedTab.current !== 'profile') {
            fetchProfile(symbol);
            lastFetchedTab.current = 'profile';
        }
    }, [isOpen, symbol, activeTab]);

    if (!isOpen) return null;

    const profile = profileMap[symbol];
    const isLoading = isLoadingProfileMap[symbol];
    const error = errorProfileMap[symbol];

    return (
        <Modal
            title={`${symbol || ''} 상세 정보${profile?._source === 'cache-firestore' ? ' (캐시)' : ''}`}
            onClose={onClose}
            size="2xl"
        >
            <div className="mb-4 border-b border-slate-200">
                <nav className="flex space-x-1 -mb-px" aria-label="Tabs">
                    <TabButton isActive> <Building2 className="h-4 w-4 mr-1.5" />기본 정보 </TabButton>
                </nav>
            </div>

            {isLoading && (
                <div className="text-center py-10">
                    <Spinner size="lg" />
                    <p className="mt-2">프로필 정보 로딩 중...</p>
                </div>
            )}

            {error && !isLoading && (
                <div className="my-4">
                    <Alert type="error" message={`프로필 정보 로드 실패: ${error}`} />
                </div>
            )}

            {!isLoading && profile && !profile.error && (
                <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 mb-2">
                        {profile.image && (
                            <img
                                src={profile.image}
                                alt={`${profile.companyName || symbol} 로고`}
                                className="h-14 w-14 rounded-md object-contain bg-slate-100 p-1 shadow"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        )}
                        <h3 className="text-2xl font-bold text-slate-800">{profile.companyName || symbol}</h3>
                    </div>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto p-1 bg-slate-50 rounded">
                        {profile.description || "상세 설명 정보가 없습니다."}
                    </p>
                    {profile.website && (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-1 text-xs">
                            <ExternalLink className="h-3.5 w-3.5" /> 웹사이트 방문
                        </a>
                    )}
                    <div className="text-xs text-slate-500 pt-3 border-t mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                        <p><strong className="text-slate-600">산업:</strong> {profile.industry || 'N/A'}</p>
                        <p><strong className="text-slate-600">섹터:</strong> {profile.sector || 'N/A'}</p>
                        <p><strong className="text-slate-600">거래소:</strong> {profile.exchangeShortName || 'N/A'}</p>
                        <p><strong className="text-slate-600">국가:</strong> {profile.country || 'N/A'}</p>
                        {profile.ceo && <p><strong className="text-slate-600">CEO:</strong> {profile.ceo}</p>}
                        {profile.employees && <p><strong className="text-slate-600">직원 수:</strong> {Number(profile.employees).toLocaleString()}</p>}
                        {profile.mktCap && <p><strong className="text-slate-600">시가총액:</strong> ${(Number(profile.mktCap) / 1e9).toFixed(2)}B USD</p>}
                    </div>
                </div>
            )}

            <div className="mt-6 pt-4 border-t text-right">
                <Button onClick={onClose} variant="secondary" color="gray">닫기</Button>
            </div>
        </Modal>
    );
};

export default StockInfoModal;
