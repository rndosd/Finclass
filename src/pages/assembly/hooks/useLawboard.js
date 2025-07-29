import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    collectionGroup,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    getDocs,
    startAfter,
    doc
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../firebase';
import { useUser } from '../../../contexts/UserContext';
import { useFeedback } from '../../../contexts/FeedbackContext';

export const useLawboard = () => {
    const { classId, userData, hasPermission } = useUser();
    const { showFeedback } = useFeedback();

    const [votingBills, setVotingBills] = useState([]);
    const [finishedBills, setFinishedBills] = useState([]);
    const [votedBills, setVotedBills] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(null);
    const [activeTab, setActiveTab] = useState('voting');
    const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);

    const userUid = userData?.uid || null;

    useEffect(() => {
        if (!classId || !userUid) {
            setIsLoading(false);
            setVotingBills([]);
            setFinishedBills([]);
            setVotedBills({});
            return;
        }

        setIsLoading(true);

        // ✅ 투표 진행 중 법안 구독
        const votingQuery = query(
            collection(db, `classes/${classId}/assemblyBills`),
            where('status', '==', 'voting'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeVoting = onSnapshot(
            votingQuery,
            (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setVotingBills(data);
                setIsLoading(false);
            },
            (error) => {
                console.error('진행중 법안 구독 실패:', error);
                showFeedback('진행 중 법안을 불러오는 중 오류가 발생했습니다.', 'error');
                setIsLoading(false);
            }
        );

        // ✅ 종료된 법안 1차 로딩
        const finishedQuery = query(
            collection(db, `classes/${classId}/assemblyBills`),
            where('status', 'in', ['passed', 'rejected']),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        getDocs(finishedQuery)
            .then(snapshot => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFinishedBills(data);
            })
            .catch(error => {
                console.error('종료된 법안 불러오기 실패:', error);
                showFeedback('종료된 법안을 불러오는 중 오류가 발생했습니다.', 'error');
            });

        // ✅ 내가 참여한 투표 내역 구독
        const votesQuery = query(
            collectionGroup(db, 'voters'),
            where('voterUid', '==', userUid)
        );

        const unsubscribeVotes = onSnapshot(
            votesQuery,
            (snapshot) => {
                const voteMap = Object.fromEntries(
                    snapshot.docs.map(doc => [doc.ref.parent.parent.id, doc.data().vote])
                );
                setVotedBills(voteMap);
            },
            (error) => {
                console.error('투표 내역 구독 실패:', error);
            }
        );

        return () => {
            unsubscribeVoting();
            unsubscribeVotes();
        };
    }, [classId, userUid, showFeedback]);

    // ✅ 더 보기 로딩
    const loadMoreFinishedBills = async () => {
        if (!classId || finishedBills.length === 0) return;

        setIsProcessing('load-more');

        try {
            const prevQuery = query(
                collection(db, `classes/${classId}/assemblyBills`),
                where('status', 'in', ['passed', 'rejected']),
                orderBy('createdAt', 'desc'),
                limit(finishedBills.length)
            );
            const prevSnapshot = await getDocs(prevQuery);
            const lastDoc = prevSnapshot.docs[prevSnapshot.docs.length - 1];

            if (!lastDoc) {
                setIsProcessing(null);
                return;
            }

            const nextQuery = query(
                collection(db, `classes/${classId}/assemblyBills`),
                where('status', 'in', ['passed', 'rejected']),
                orderBy('createdAt', 'desc'),
                startAfter(lastDoc),
                limit(10)
            );

            const snapshot = await getDocs(nextQuery);
            const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFinishedBills(prev => [...prev, ...newData]);
        } catch (error) {
            console.error('더 보기 실패:', error);
            showFeedback('종료된 법안 더보기 중 오류 발생', 'error');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleProposalSuccess = () => {
        setIsProposeModalOpen(false);
    };

    const handleApplyPolicy = async (billId) => {
        setIsProcessing(`apply-${billId}`);
        try {
            const applyPolicy = httpsCallable(functions, 'applyAssemblyPolicy');
            await applyPolicy({ classId, billId });
            showFeedback('정책이 성공적으로 적용되었습니다.', 'success');
        } catch (error) {
            showFeedback(`정책 적용 실패: ${error.message}`, 'error');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleVote = async (billId, choice) => {
        setIsProcessing(`vote-${billId}-${choice}`);
        try {
            const castVote = httpsCallable(functions, 'castVote');
            await castVote({ classId, billId, choice });
            showFeedback('투표가 완료되었습니다.', 'success');
        } catch (error) {
            showFeedback(`투표 중 오류: ${error.message}`, 'error');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleCloseVoting = async (billId) => {
        if (!window.confirm('이 법안의 투표를 마감하시겠습니까?')) return;
        setIsProcessing(`close-${billId}`);
        try {
            const closeVoting = httpsCallable(functions, 'closeVoting');
            const result = await closeVoting({ classId, billId });
            showFeedback(
                `법안이 '${result.data.finalStatus === 'passed' ? '가결' : '부결'}' 처리되었습니다.`,
                'success'
            );
        } catch (error) {
            showFeedback(`투표 종료 중 오류: ${error.message}`, 'error');
        } finally {
            setIsProcessing(null);
        }
    };

    return {
        classId,
        isLoading,
        isProcessing,
        activeTab,
        setActiveTab,
        votingBills,
        finishedBills,
        votedBills,
        handleApplyPolicy,
        handleVote,
        handleCloseVoting,
        isProposeModalOpen,
        setIsProposeModalOpen,
        handleProposalSuccess,
        loadMoreFinishedBills,
        hasPermission,
    };
};
