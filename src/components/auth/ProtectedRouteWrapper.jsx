// src/components/auth/ProtectedRouteWrapper.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext'; // UserContext 경로 확인
import LoadingSpinner from '../common/LoadingSpinner'; // LoadingSpinner 경로 확인
import { auth } from '../../firebase'; // Firebase auth 객체 (선택적)

export default function ProtectedRouteWrapper({ allowedRoles, children }) {
    const { userData, loading: userContextLoading } = useUser(); // UserContext에서 정보 가져오기
    const location = useLocation();
    const currentAuthUser = auth.currentUser; // 현재 Firebase 인증 사용자 정보

    if (userContextLoading) {
        return <LoadingSpinner />;
    }

    // 1. Firebase 인증 상태 확인 (UserContext의 userData보다 우선적으로 확인 가능)
    if (!currentAuthUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. userData (Firestore에서 가져온 정보) 기반 로직
    // UserContext에서 userData가 null이면 Firestore 문서가 없거나 로드 실패일 수 있음
    // 하지만 currentAuthUser가 있다는 것은 Firebase 로그인은 된 상태임.

    // 3. 비밀번호 강제 변경 필요 여부 확인
    if (userData && userData.forcePasswordChange === true) {
        if (location.pathname !== "/force-change-password") {
            return <Navigate to="/force-change-password" state={{ from: location }} replace />;
        }
    } else if (userData && userData.forcePasswordChange === false && location.pathname === "/force-change-password") {
        // 강제 변경이 필요 없는데 변경 페이지에 접근하려 하면 홈으로 리디렉션
        return <Navigate to="/" replace />;
    }

    // 4. 역할 기반 접근 제어
    if (allowedRoles && allowedRoles.length > 0) {
        if (!userData || !allowedRoles.includes(userData.role)) {
            console.warn(`접근 거부: 사용자 역할(${userData?.role})이 ${location.pathname} 경로에 대한 허용된 역할(${allowedRoles.join(", ")})에 포함되지 않습니다.`);
            // 필요하다면 접근 거부 전용 페이지로 리디렉션하거나, 홈으로 보냅니다.
            return <Navigate to="/" replace />;
        }
    }

    // children이 있으면 children을, 없으면 중첩 라우팅을 위해 Outlet을 렌더링
    return children ? children : <Outlet />;
}