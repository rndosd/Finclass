// src/pages/admin/StoreManagementPage.jsx (예시)
import React from 'react';
import StorePendingRedemptions from './StorePendingRedemptions';
// 여기에 나중에 카테고리 관리, 상품 관리 컴포넌트도 추가 가능

const StoreManagementPage = () => {
    // 이 페이지는 교사/관리자만 접근 가능하도록 라우팅 처리 필요
    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-2xl font-bold mb-6">상점 관리</h1>
            {/* TODO: 카테고리 관리, 상품 관리 UI 호출 버튼 등 */}

            <StorePendingRedemptions />

            {/* TODO: 지급 완료/취소된 내역 조회 UI (필터 기능 포함) */}
        </div>
    );
};

export default StoreManagementPage;