// src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import LoadingSpinner from './ui/LoadingSpinner';

export default function ProtectedRoute({
  allowedRoles,
  requiredPermission,
  children,
  debugName = "이름 없음"
}) {
  const { userData, loading, hasPermission } = useUser();

  if (!loading) {
    console.log(`--- [ProtectedRoute 실행] 이름: ${debugName} ---`);
    console.log("   - 현재 경로:", window.location.pathname);
    console.log("   - 허용 역할 (allowedRoles):", allowedRoles);
    console.log("   - 필요한 권한 (requiredPermission):", requiredPermission);
    console.log("   - 현재 사용자 역할:", userData?.role);
  }

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!userData) {
    console.log("   - [판단] 비로그인 사용자. 로그인 페이지로 이동합니다.");
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userData.role)) {
    console.warn("   - [판단] 🚫 역할 미일치. 접근 거부 페이지로 이동합니다.");
    return <Navigate to="/access-denied" replace />;
  }

  // ✅ 교사는 requiredPermission 없이도 접근 허용
  if (requiredPermission && userData.role !== 'teacher' && !hasPermission(requiredPermission)) {
    console.warn(`   - [판단] 🚫 ${requiredPermission} 권한 없음! 접근 거부 페이지로 이동합니다.`);
    return <Navigate to="/access-denied" replace />;
  }

  console.log("   - [판단] ✅ 모든 검사 통과. 페이지를 보여줍니다.");
  return children ? children : <Outlet />;
}
