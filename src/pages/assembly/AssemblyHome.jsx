import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    collection,
    collectionGroup,
    getDocs,
    query,
    where,
    orderBy,
    limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useUser } from "../../contexts/UserContext";

// UI
import { Spinner, Button } from "../../components/ui";
import AppLayout from "../../components/layout/AppLayout";

// -------------------------------------------------------------
//  AssemblyHome Page (Top‑3 hottest bills)
// -------------------------------------------------------------
export default function AssemblyHome() {
    const navigate = useNavigate();
    const { classId, userData, classData } = useUser();

    const [voteStats, setVoteStats] = useState({ percentage: 0 });
    const [popularLaws, setPopularLaws] = useState([]); // <- array
    const [isLoading, setIsLoading] = useState(true);

    /* -------------------------------------------------------------------------- */
    /*                               FETCH FUNCTIONS                              */
    /* -------------------------------------------------------------------------- */
    const fetchData = useCallback(async () => {
        if (!classId || !userData?.uid) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        try {
            // 1) 전체 진행 중 법안
            const votingQ = query(
                collection(db, `classes/${classId}/assemblyBills`),
                where("status", "==", "voting")
            );
            const votingSnap = await getDocs(votingQ);
            const totalVoting = votingSnap.size;

            // 2) 내가 투표한 진행 중 법안 수
            let myVotePct = 0;
            if (totalVoting > 0) {
                const votingIds = new Set(votingSnap.docs.map((d) => d.id));
                const myVotesQ = query(
                    collectionGroup(db, "voters"),
                    where("voterUid", "==", userData.uid)
                );
                const myVotesSnap = await getDocs(myVotesQ);
                const myVotesOnOpen = myVotesSnap.docs.filter((d) =>
                    votingIds.has(d.ref.parent.parent.id)
                ).length;
                myVotePct = Math.round((myVotesOnOpen / totalVoting) * 100);
            } else {
                myVotePct = 100;
            }
            setVoteStats({ percentage: myVotePct });

            // 3) 인기 법안 TOP‑3 (찬성표 순)
            const popularQ = query(
                collection(db, `classes/${classId}/assemblyBills`),
                where("status", "==", "voting"),
                orderBy("votes.agree", "desc"),
                limit(3)
            );
            const popSnap = await getDocs(popularQ);
            const popArr = popSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setPopularLaws(popArr);
        } catch (err) {
            console.error("AssemblyHome fetch error", err);
        } finally {
            setIsLoading(false);
        }
    }, [classId, userData?.uid]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /* -------------------------------------------------------------------------- */
    /*                                   RENDER                                   */
    /* -------------------------------------------------------------------------- */
    return (
        <AppLayout>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-800 flex flex-col items-center py-12 px-6">
                {/* 헤더 / 히어로 */}
                <header className="text-center mb-12 max-w-3xl">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white drop-shadow-sm leading-snug">
                        🏛 {classData?.className || "우리 반"} 국회
                    </h1>
                    <p className="mt-4 text-xl md:text-2xl font-semibold text-indigo-700 dark:text-indigo-300">
                        {userData?.name || "학생"} 의원, 당신의 한 표가 세상을 바꿉니다!
                    </p>
                    <Button
                        color="amber"
                        size="lg"
                        className="mt-8 inline-flex gap-2"
                        onClick={() => navigate("/assembly/laws")}
                    >
                        📋 법안 둘러보기
                    </Button>
                </header>

                {/* 참여율 */}
                <section className="w-full max-w-2xl mb-14">
                    <h2 className="text-center text-slate-800 dark:text-slate-100 text-lg font-semibold mb-2">
                        현재 진행 중인 법안 참여율
                    </h2>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-8 overflow-hidden shadow-inner">
                        <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full flex items-center justify-center text-sm font-bold text-white transition-all duration-700"
                            style={{ width: `${voteStats.percentage}%` }}
                        >
                            {voteStats.percentage}%
                        </div>
                    </div>
                </section>

                {/* 인기 법안 TOP‑3 */}
                {popularLaws.length > 0 && (
                    <section className="w-full max-w-xl text-center mb-24 space-y-6">
                        <h3 className="text-slate-800 dark:text-white text-base font-semibold">
                            지금 가장 뜨거운 법안 TOP 3 🔥
                        </h3>
                        {popularLaws.map((law, idx) => (
                            <div
                                key={law.id}
                                className="bg-white/90 dark:bg-slate-800/70 backdrop-blur-md px-6 py-3 rounded-xl shadow-lg border border-amber-300 dark:border-amber-600"
                            >
                                <p className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                                    {idx + 1}. "{law.title}"
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    제안자: {law.proposerName} · 찬성 {law.votes?.agree || 0}표
                                </p>
                            </div>
                        ))}
                    </section>
                )}

                {/* 로딩 상태 */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60">
                        <Spinner />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
