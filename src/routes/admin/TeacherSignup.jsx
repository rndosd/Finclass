// src/pages/auth/TeacherSignup.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useFeedback } from "../../contexts/FeedbackContext";
import { Button, InputField } from "../../components/ui";
import { v4 as uuidv4 } from "uuid";

export default function TeacherSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { showFeedback } = useFeedback();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!schoolName.trim() || !grade.trim() || !classNum.trim()) {
      setError("학교, 학년, 반 정보를 모두 입력해주세요.");
      return;
    }

    const classDocId = `${schoolName.trim()}초 ${grade.trim()}-${classNum.trim()}`;
    const requestedClassId = uuidv4(); // 무작위 고유 ID 생성

    const functions = getFunctions(getApp(), "asia-northeast3");
    const requestTeacherAccount = httpsCallable(functions, "requestTeacherAccount");

    setIsLoading(true);
    try {
      await requestTeacherAccount({
        name,
        email,
        password,
        requestedClassId, // 커스텀 클레임용 (영문, 안전한 값)
        classDocId,       // Firestore 문서용 (사람이 읽기 쉬운 값)
      });

      showFeedback("가입 신청이 완료되었습니다. 관리자 승인을 기다려주세요.", "success", {
        autoClose: 5000,
      });

      navigate("/login");
    } catch (err) {
      console.error("교사 회원가입 오류:", err);
      const msg = err?.message || err?.code || "알 수 없는 오류입니다.";
      if (msg.includes("auth/email-already-exists")) {
        setError("이미 사용 중인 이메일입니다.");
      } else if (msg.includes("class_already_exists")) {
        setError("이미 사용 중인 반 이름입니다.");
      } else {
        setError("가입 요청 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-700 mt-4">FinClass</h1>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 text-center text-slate-800 flex items-center justify-center gap-2">
            <UserPlus className="h-6 w-6 text-indigo-500" />
            교사 계정 등록
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4 text-sm">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <InputField label="이름" value={name} onChange={(e) => setName(e.target.value)} required />
            <InputField label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <InputField label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">담당 반 정보</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  placeholder="예: 서울"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <span className="text-sm text-gray-600">초</span>
                <input
                  type="number"
                  placeholder="6"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-20 text-center px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <span className="text-sm text-gray-600">학년</span>
                <input
                  type="number"
                  placeholder="3"
                  value={classNum}
                  onChange={(e) => setClassNum(e.target.value)}
                  className="w-20 text-center px-2 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <span className="text-sm text-gray-600">반</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isLoading ? "등록 중..." : "계정 등록 및 학급 생성 신청"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 text-sm inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              이미 계정이 있으신가요? 로그인
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} FinClass. All rights reserved.
        </p>
      </div>
    </div>
  );
}
