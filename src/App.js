// src/App.jsx

import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

// === Provider Contexts ===
import { UserProvider, useUser } from "./contexts/UserContext";
import { FeedbackProvider } from "./contexts/FeedbackContext";
import { StockProvider } from "./contexts/StockContext";

// === Common Components ===
import LoadingSpinner from "./components/ui/LoadingSpinner";
import ProtectedRoute from "./components/ProtectedRoute";

// === Constants ===
import { PERMISSIONS } from "./constants/permissions";

// === Pages: Auth ===
import Login from "./routes/auth/Login";
import ChangePasswordPage from "./routes/auth/ChangePassword";
import TeacherSignup from "./routes/admin/TeacherSignup";

// === Pages: Main Features ===
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import Bank from "./pages/bank/Bank";
import StockPage from "./pages/stock/StockPage";
import TaxDash from "./pages/tax/TaxDash";
import Store from "./pages/store/Store";
import PolicePage from "./pages/police/PolicePage";
import Credit from "./pages/credit/Credit";
import AssemblyHome from "./pages/assembly/AssemblyHome";
import LawBoard from "./pages/assembly/LawBoard";
import MissionPage from "./pages/missions/MissionPage";

// === Pages: Admin & Teacher ===
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAssetManager from "./pages/admin/AdminAssetManager";
import AdminStudentManager from "./pages/admin/AdminStudentManager";
import AdminPermissionManager from "./pages/admin/AdminPermissionManager";
import StudentRegistration from "./pages/admin/StudentRegistration";
import DeleteStudents from "./pages/admin/DeleteStudents";
import PasswordReset from "./pages/admin/PasswordReset";

// === Pages: Feedback ===
import FeedbackBoard from "./pages/feedback/FeedbackBoard";

// === Pages: Errors ===
import AccessDeniedPage from "./pages/error/AccessDeniedPage";
import NotFoundPage from "./pages/error/NotFoundPage";

function App() {
  return (
    <UserProvider>
      <FeedbackProvider>
        <StockProvider>
          <AppRoutes />
        </StockProvider>
      </FeedbackProvider>
    </UserProvider>
  );
}

const AppRoutes = () => {
  const { userData, loading } = useUser();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      {/* 🌐 PUBLIC ROUTES */}
      <Route
        path="/login"
        element={!userData ? <Login /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/signup/teacher"
        element={
          !userData ? <TeacherSignup /> : <Navigate to="/dashboard" replace />
        }
      />
      <Route
        path="/force-change-password"
        element={
          userData?.forcePasswordChange ? (
            <ChangePasswordPage />
          ) : (
            <Navigate to={userData ? "/dashboard" : "/login"} replace />
          )
        }
      />

      {/* 🛡️ ADMIN ROUTES */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]} debugName="어드민 대시보드">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* 🧑‍🏫 TEACHER MANAGE ROUTES */}
      <Route
        path="/manage"
        element={
          <ProtectedRoute
            allowedRoles={["admin", "teacher"]}
            debugName="관리 메뉴"
          >
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route path="students" element={<AdminStudentManager />} />
        <Route path="assets" element={<AdminAssetManager />} />
        <Route path="permissions" element={<AdminPermissionManager />} />
        <Route path="students/create" element={<StudentRegistration />} />
        <Route path="students/delete" element={<DeleteStudents />} />
        <Route path="students/reset" element={<PasswordReset />} />
      </Route>

      {/* 📝 FEEDBACK ROUTES - 교사/관리자만 접근 가능 */}
      <Route
        path="/feedback"
        element={
          <ProtectedRoute
            allowedRoles={["admin", "teacher"]}
            debugName="앱 피드백 게시판"
          >
            <FeedbackBoard />
          </ProtectedRoute>
        }
      />

      {/* 🔒 PROTECTED USER ROUTES */}
      <Route
        path="/"
        element={
          <ProtectedRoute debugName="루트 리디렉션">
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute debugName="대시보드">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank"
        element={
          <ProtectedRoute
            requiredPermission={PERMISSIONS.BANK}
            debugName="은행 페이지"
          >
            <Bank />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute
            requiredPermission={PERMISSIONS.STOCK}
            debugName="주식 페이지"
          >
            <StockPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/store"
        element={
          <ProtectedRoute
            requiredPermission={PERMISSIONS.STORE}
            debugName="상점 페이지"
          >
            <Store />
          </ProtectedRoute>
        }
      />
      <Route
        path="/police"
        element={
          <ProtectedRoute
            requiredPermission={PERMISSIONS.POLICE}
            debugName="경찰청 페이지"
          >
            <PolicePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/credit"
        element={
          <ProtectedRoute
            requiredPermission={PERMISSIONS.CREDIT}
            debugName="신용등급 페이지"
          >
            <Credit />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tax"
        element={
          <ProtectedRoute
            requiredPermission={PERMISSIONS.TAX}
            debugName="세금 페이지"
          >
            <TaxDash />
          </ProtectedRoute>
        }
      />
      <Route
        path="/missions"
        element={
          <ProtectedRoute
            requiredPermission={PERMISSIONS.MISSION_PAGE}
            debugName="도전과제 페이지"
          >
            <MissionPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assembly"
        element={
          <ProtectedRoute
            requiredPermission={PERMISSIONS.ASSEMBLY_PAGE}
            debugName="의회 페이지"
          >
            <AssemblyHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assembly/laws"
        element={
          <ProtectedRoute
            requiredPermission={PERMISSIONS.ASSEMBLY_PAGE}
            debugName="법안 페이지"
          >
            <LawBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/changepassword"
        element={
          <ProtectedRoute debugName="비밀번호 변경">
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />

      {/* 🚫 ERROR / FALLBACK */}
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
