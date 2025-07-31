import React from 'react';
import { Routes, Route } from 'react-router-dom';
import RealEstatePage from '../../pages/realestate';
import ProtectedRoute from '../../components/ProtectedRoute';

// SeatLayoutEditor를 lazy loading으로 변경
const SeatLayoutEditor = React.lazy(() => import('../../pages/realestate/components/SeatLayoutEditor'));

const RealEstateRoutes = () => {
  return (
    <Routes>
      {/* 학생용 - 일반 부동산 보기 */}
      <Route path="/" element={<RealEstatePage />} />

      {/* 교사용 - 배치 편집기 (교사/관리자만 접근) */}
      <Route
        path="/layout"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin']} debugName="좌석 배치 편집기">
            <React.Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
              <SeatLayoutEditor />
            </React.Suspense>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default RealEstateRoutes;