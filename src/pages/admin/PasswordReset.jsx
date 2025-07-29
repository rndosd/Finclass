// src/pages/PasswordReset.jsx
// 또는 src/pages/home/management/PasswordReset.jsx (사용자님의 경로에 맞게)
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase"; // Firebase 설정 파일 경로를 확인하세요!
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { LockKeyhole, Users, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'; // 아이콘 추가

// --- UI 컴포넌트 (이 파일 내에서만 사용하거나, 공통 컴포넌트로 분리 가능) ---
function SelectField({ id, label, value, onChange, options, valueKey = "uid", nameKey = "name", emailKey = "email", disabled, className = '' }) {
    return (
        <div>
            {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
            <select
                id={id}
                name={id}
                value={value}
                onChange={onChange}
                disabled={disabled}
                className={`w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${className} ${disabled ? "bg-slate-50 cursor-not-allowed" : ""}`}
            >
                <option value="">-- 학생을 선택하세요 --</option>
                {options.map((option) => (
                    <option key={option[valueKey]} value={option[valueKey]}>
                        {option[nameKey]} {option[emailKey] ? `(${option[emailKey]})` : ''}
                    </option>
                ))}
            </select>
        </div>
    );
}

function Button({ onClick, disabled, children, className = '', type = "button", icon: Icon }) {
    const iconIsLoader = Icon === Loader2;
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed ${className}`}
        >
            {Icon && <Icon className={`h-5 w-5 ${children && !disabled ? 'mr-1.5' : ''} ${disabled && iconIsLoader ? 'animate-spin' : ''}`} />}
            {children}
        </button>
    );
}

function Alert({ message, type }) {
    if (!message) return null;
    const bgColor = type === "success" ? "bg-green-50" : type === "error" ? "bg-red-50" : "bg-blue-50";
    const textColor = type === "success" ? "text-green-700" : type === "error" ? "text-red-700" : "text-blue-700";
    const IconElement = type === "success" ? CheckCircle : type === "error" ? AlertTriangle : Users;

    return (
        <div className={`mt-4 p-3 rounded-md text-sm flex items-center gap-2 ${bgColor} ${textColor}`}>
            <IconElement className="h-5 w-5 flex-shrink-0" />
            <p>{message}</p>
        </div>
    );
}
// --- UI 컴포넌트 끝 ---

export default function PasswordReset() {
    const [students, setStudents] = useState([]);
    const [selectedStudentUid, setSelectedStudentUid] = useState("");
    // selectedStudentEmail은 더 이상 직접적인 상태로 필요 없을 수 있으나, 메시지 표시를 위해 유지하거나 필요시 students 배열에서 찾음
    const [message, setMessage] = useState({ text: "", type: "" }); // 메시지 객체로 변경
    const [authStatus, setAuthStatus] = useState({ loading: true, role: null, classId: null });
    const [isProcessing, setIsProcessing] = useState(false); // setIsLoading -> isProcessing으로 변경 (일관성)
    const navigate = useNavigate();

    const fetchStudentsCallback = useCallback(async (currentUser) => {
        setIsProcessing(true);
        setMessage({ text: "", type: "" });
        try {
            const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (!userDocSnap.exists()) {
                throw new Error("현재 사용자 정보를 찾을 수 없습니다.");
            }
            const currentUserData = userDocSnap.data();
            const role = currentUserData.role;
            const userClassId = currentUserData.classId || currentUserData.className || null;

            setAuthStatus({ loading: false, role: role, classId: userClassId });

            if (role !== "admin" && role !== "teacher") {
                throw new Error("이 페이지에 접근할 권한이 없습니다.");
            }
            if (role === "teacher" && !userClassId) {
                throw new Error("담당 학급 정보가 없습니다. 먼저 학급 정보를 설정해주세요.");
            }

            let studentsQuery;
            if (role === "teacher") {
                studentsQuery = query(
                    collection(db, "users"),
                    where("role", "==", "student"),
                    where("classId", "==", userClassId)
                );
            } else { // admin
                studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
            }

            const studentDocsSnap = await getDocs(studentsQuery);
            const studentList = studentDocsSnap.docs.map(snap => ({
                uid: snap.id,
                name: snap.data().name || "이름없음",
                email: snap.data().email || "이메일 정보 없음",
            }));
            studentList.sort((a, b) => a.name.localeCompare(b.name));
            setStudents(studentList);

            if (studentList.length === 0 && role === "teacher") {
                setMessage({ text: "담당 학급에 등록된 학생이 없습니다.", type: "info" });
            } else if (studentList.length === 0 && role === "admin") {
                setMessage({ text: "등록된 학생이 없습니다.", type: "info" });
            }

        } catch (error) {
            console.error("학생 목록 로딩 또는 사용자 정보 오류:", error);
            setMessage({ text: `❌ 오류: ${error.message}`, type: "error" });
            setAuthStatus(prev => ({ ...prev, loading: false }));
            if (error.message.includes("권한이 없습니다")) navigate("/");
        } finally {
            setIsProcessing(false);
        }
    }, [navigate]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchStudentsCallback(user);
            } else {
                setAuthStatus({ loading: false, role: null, classId: null });
                navigate("/login");
            }
        });
        return () => unsubscribe();
    }, [navigate, fetchStudentsCallback]);

    const handleReset = async () => {
        if (!selectedStudentUid) {
            setMessage({ text: "❗ 학생을 선택해주세요.", type: "error" });
            return;
        }
        setIsProcessing(true);
        setMessage({ text: "", type: "" });

        const studentToReset = students.find(s => s.uid === selectedStudentUid);
        const studentEmailForDisplay = studentToReset ? studentToReset.email : "선택된 학생";

        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error("로그인 정보가 유효하지 않습니다. 다시 로그인해주세요.");
            }
            const idToken = await user.getIdToken();

            // ==============================================================================
            // 중요: 아래 URL을 실제 배포된 resetPasswordHttp Cloud Function의 URL로 변경하세요!
            // 예: "https://asia-northeast3-YOUR_PROJECT_ID.cloudfunctions.net/resetPasswordHttp"
            // ==============================================================================
            const CLOUD_FUNCTION_URL = "https://resetpasswordhttp-owtl5m4mhq-du.a.run.app";
            if (CLOUD_FUNCTION_URL === "YOUR_CORRECT_RESET_PASSWORD_HTTP_FUNCTION_URL") {
                throw new Error("Cloud Function URL이 설정되지 않았습니다. 관리자에게 문의하세요.");
            }


            const response = await fetch(
                CLOUD_FUNCTION_URL,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ uid: selectedStudentUid }), // UID를 올바르게 전송
                }
            );

            let responseData;
            const responseText = await response.text(); // 우선 텍스트로 받아봄
            try {
                responseData = JSON.parse(responseText); // 그 다음 JSON 파싱 시도
            } catch (parseError) {
                console.error("Error parsing JSON response from server:", parseError);
                console.error("Response status:", response.status, response.statusText);
                console.error("Raw response text:", responseText); // 서버에서 온 실제 응답 내용 확인
                throw new Error(`서버 응답을 처리할 수 없습니다 (상태: ${response.status}). 서버 응답: ${responseText.substring(0, 150)}...`);
            }

            if (!response.ok) {
                console.error("Server responded with an error status:", response.status, responseData);
                throw new Error(responseData.message || responseData.error || `서버 오류 (${response.status})`);
            }

            setMessage({
                text: `✅ ${responseData.message || `${studentEmailForDisplay} 학생의 비밀번호가 성공적으로 초기화되었습니다.`}`,
                type: "success"
            });
            setSelectedStudentUid(""); // 성공 후 선택 초기화

        } catch (err) {
            console.error("비밀번호 초기화 중 최종 오류:", err);
            setMessage({ text: `❌ 오류: ${err.message || "알 수 없는 오류가 발생했습니다."}`, type: "error" });
        } finally {
            setIsProcessing(false);
        }
    };

    if (authStatus.loading) {
        return <div className="p-6 text-center flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /> 인증 정보 확인 중...</div>;
    }
    if (authStatus.role !== "admin" && authStatus.role !== "teacher") {
        return <div className="p-6 text-center text-red-600">이 페이지에 접근할 권한이 없습니다.</div>;
    }
    // 교사인데 classId가 없는 경우 (fetchStudentsCallback에서 메시지 설정됨)
    if (authStatus.role === "teacher" && !authStatus.classId && students.length === 0 && message.text) {
        // Alert 컴포넌트가 메시지를 표시하도록 함
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 px-4 py-12">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg">
                <div className="flex flex-col items-center mb-6">
                    <div className="p-3 bg-indigo-100 rounded-full mb-4">
                        <LockKeyhole className="h-10 w-10 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">학생 비밀번호 초기화</h2>
                </div>

                {isProcessing && authStatus.role && students.length === 0 && <div className="text-center text-slate-500 my-4"><Loader2 className="h-6 w-6 animate-spin inline mr-2" />학생 목록을 불러오는 중...</div>}

                <div className="space-y-5">
                    <SelectField
                        id="studentSelect"
                        label="초기화할 학생 선택"
                        value={selectedStudentUid}
                        onChange={(e) => setSelectedStudentUid(e.target.value)}
                        options={students}
                        valueKey="uid"
                        nameKey="name"
                        emailKey="email" // 옵션에 이메일도 표시하도록
                        disabled={isProcessing || students.length === 0}
                        className={isProcessing || students.length === 0 ? "bg-slate-50" : ""}
                    />
                    <Button
                        onClick={handleReset}
                        disabled={isProcessing || !selectedStudentUid}
                        icon={isProcessing ? Loader2 : CheckCircle}
                        className={isProcessing ? "animate-pulse" : ""}
                    >
                        {isProcessing ? "처리 중..." : "선택한 학생 비밀번호 초기화"}
                    </Button>
                </div>

                <Alert message={message.text} type={message.type} />

                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate("/")}
                        className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                        메인으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
}