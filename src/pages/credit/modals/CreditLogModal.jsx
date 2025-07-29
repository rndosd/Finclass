import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';

const LIMIT_COUNT = 10;

export default function CreditLogModal({ student, onClose }) {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const lastVisibleRef = useRef(null);
    const { classId } = useUser();

    const fetchLogs = async (isInitial = false) => {
        if (!student?.uid || !classId) return;

        if (!isInitial) setIsFetchingMore(true);
        else {
            setIsLoading(true);
            setLogs([]);
            lastVisibleRef.current = null;
            setHasMore(true);
        }

        try {
            const baseRef = collection(db, `classes/${classId}/students/${student.uid}/creditLogs`);
            let q = query(baseRef, orderBy("timestamp", "desc"), limit(LIMIT_COUNT));

            if (!isInitial && lastVisibleRef.current) {
                q = query(baseRef, orderBy("timestamp", "desc"), startAfter(lastVisibleRef.current), limit(LIMIT_COUNT));
            }

            const snapshot = await getDocs(q);
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (fetched.length < LIMIT_COUNT) setHasMore(false);
            if (snapshot.docs.length > 0) lastVisibleRef.current = snapshot.docs[snapshot.docs.length - 1];

            setLogs(prev => [...prev, ...fetched]);
        } catch (err) {
            console.error("❌ 로그 불러오기 오류:", err);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    };

    useEffect(() => {
        fetchLogs(true); // 초기 로딩
    }, [student?.uid, classId]);

    const dangerTextColor = {
        1: "text-gray-500",
        2: "text-yellow-700",
        3: "text-red-600",
    };

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-[560px] max-w-[96vw] max-h-[92vh] overflow-y-auto relative border-[3px] border-indigo-100">
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-1 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                    title="닫기"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-7 h-7 text-slate-400 hover:text-red-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <div className="mb-6 flex items-center gap-2">
                    <span className="inline-block text-[2rem] text-indigo-500">📈</span>
                    <h2 className="text-2xl font-extrabold text-slate-900">
                        {student.name}님의 신용점수 변경 이력
                    </h2>
                </div>
                <div>
                    {isLoading ? (
                        <div className="py-10 text-center text-lg text-slate-500">이력을 불러오는 중...</div>
                    ) : logs.length === 0 ? (
                        <div className="py-10 text-center text-slate-400">아직 이력이 없습니다.</div>
                    ) : (
                        <ul className="divide-y divide-slate-200 rounded-lg overflow-hidden shadow">
                            {logs.map((log, i) => {
                                const dangerClass = dangerTextColor[log.dangerLevel] || "text-gray-600";
                                return (
                                    <li
                                        key={log.id}
                                        className={`flex justify-between gap-2 px-5 py-4 text-base bg-gradient-to-r ${i % 2 === 0 ? 'from-slate-50 to-slate-100' : 'from-white to-slate-50'
                                            }`}
                                    >
                                        <div>
                                            <span className={`font-bold text-lg ${log.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {log.amount > 0 ? '+' : ''}{log.amount}점
                                            </span>
                                            <span className={`ml-3 text-xs font-medium ${dangerClass}`}>
                                                {log.dangerLevel && `위험도 ${log.dangerLevel}`}
                                            </span>
                                            <div className="text-xs text-slate-600 mt-1">
                                                {log.reason || '(사유 없음)'}
                                            </div>
                                        </div>
                                        <div className="text-right min-w-[105px] pl-2 flex flex-col items-end">
                                            <span className="text-xs text-slate-400 font-medium">
                                                {log.timestamp?.toDate
                                                    ? new Date(log.timestamp.toDate()).toLocaleString('ko-KR')
                                                    : '(날짜 없음)'}
                                            </span>
                                            {log.actorName && (
                                                <span className="text-xs text-slate-500 mt-1">by {log.actorName}</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {/* ✅ "더보기" 버튼 */}
                    {!isLoading && hasMore && (
                        <div className="pt-4 flex justify-center">
                            <button
                                onClick={() => fetchLogs(false)}
                                disabled={isFetchingMore}
                                className="px-5 py-2 text-sm font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                            >
                                {isFetchingMore ? '불러오는 중...' : '10개 더 보기'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
