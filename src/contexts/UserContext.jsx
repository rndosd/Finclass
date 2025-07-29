// src/contexts/UserContext.jsx

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [userData, setUserData] = useState(null);
  const [classId, setClassId] = useState(null);
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setUserData(null);
      setClassId(null);
      setClassData(null);

      if (user) {
        try {
          await user.getIdToken(true);
          const tokenResult = await user.getIdTokenResult();
          const claims = tokenResult.claims;

          if (!claims?.isApproved || !claims?.role) {
            console.warn("⛔ 승인되지 않은 사용자 또는 role 없음:", claims);
            setUserData(null);
            setLoading(false);
            return;
          }

          const baseUserInfo = {
            uid: user.uid,
            email: user.email,
            role: claims.role,
            classId: claims.classId || null,
            isApproved: claims.isApproved === true,
          };

          const foundClassId = baseUserInfo.classId;
          let finalUserData = { ...baseUserInfo };

          if (foundClassId && claims.role !== "admin") {
            const studentDocRef = doc(db, "classes", foundClassId, "students", user.uid);
            const classDocRef = doc(db, "classes", foundClassId);

            const [studentSnap, classSnap] = await Promise.all([
              getDoc(studentDocRef),
              getDoc(classDocRef),
            ]);

            if (studentSnap.exists()) {
              finalUserData = { ...studentSnap.data(), ...baseUserInfo };
            } else {
              console.warn(`학생 문서 없음: classes/${foundClassId}/students/${user.uid}`);
            }

            if (classSnap.exists()) {
              setClassData({ ...classSnap.data(), classId: foundClassId });
            }
          } else if (foundClassId) {
            // 관리자일 경우 student 문서 생략, class 문서만 가져옴
            const classDocRef = doc(db, "classes", foundClassId);
            const classSnap = await getDoc(classDocRef);
            if (classSnap.exists()) {
              setClassData({ ...classSnap.data(), classId: foundClassId });
            }
          }

          setUserData(finalUserData);
          setClassId(foundClassId);
        } catch (err) {
          console.error("UserContext 에러:", err);
          setUserData(null);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => authUnsubscribe();
  }, []);

  const value = useMemo(() => {
    const hasPermission = (permissionKey) => {
      if (userData?.role === "admin" || userData?.role === "teacher") return true;
      return !!userData?.permissions?.[permissionKey];
    };

    return {
      userData,
      classId,
      classData,
      loading,
      isTeacher: userData?.role === "teacher" || userData?.role === "admin",
      isAdmin: userData?.role === "admin",
      hasPermission,
    };
  }, [userData, classId, classData, loading]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser는 UserProvider 내부에서 사용해야 합니다.");
  }
  return context;
}
