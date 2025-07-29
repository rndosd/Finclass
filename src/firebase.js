// src/firebase.js

import { initializeApp } from 'firebase/app';
// ⭐ 에뮬레이터 연결을 위한 함수들을 import 합니다.
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// .env 파일 등을 사용하여 환경 변수로 관리하는 것을 권장합니다.
const firebaseConfig = {
  apiKey: "AIzaSyB5KqOWsvM0uINfqKDU1SyoGJkXAAstNkM",
  authDomain: "finclass-4477f.firebaseapp.com",
  projectId: "finclass-4477f",
  storageBucket: "finclass-4477f.appspot.com", // storageBucket 주소가 조금 달라서 수정했습니다.
  messagingSenderId: "765945943044",
  appId: "1:765945943044:web:482147c1ed67de71669151",
  measurementId: "G-N5ZJC7W32X"
};

const app = initializeApp(firebaseConfig);

// 각 Firebase 서비스 인스턴스를 가져옵니다.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-northeast3'); // 리전(asia-northeast3) 명시

// ⭐⭐⭐ 끝: 핵심 수정 부분 ⭐⭐⭐

export default app;