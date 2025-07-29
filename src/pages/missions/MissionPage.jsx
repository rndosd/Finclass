// src/pages/missions/MissionPage.jsx

import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../firebase';
import {
    collection,
    query,
    orderBy,
    getDocs
} from 'firebase/firestore';
import { useUser } from '../../contexts/UserContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { Button, Spinner, Alert, LoadingSpinner } from '../../components/ui';
import AppLayout from '../../components/layout/AppLayout';
import MissionModal from './modals/MissionModal';
import MissionApprovalModal from './modals/MissionApprovalModal';
import MissionCard from './components/MissionCard';
import { PlusCircle } from 'lucide-react';

const MissionPage = () => {
    const { classId, hasPermission, loading, userData } = useUser();
    const { showFeedback } = useFeedback();

    const [missions, setMissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMission, setSelectedMission] = useState(null);

    const fetchMissions = useCallback(async () => {
        if (!classId) return;
        setIsLoading(true);

        try {
            const q = query(
                collection(db, `classes/${classId}/missions`),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMissions(data);
        } catch (error) {
            console.error("도전과제 불러오기 실패:", error);
            showFeedback("도전과제를 불러오는 중 오류가 발생했습니다.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [classId, showFeedback]);

    useEffect(() => {
        if (!loading && userData && classId) {
            fetchMissions();
        }
    }, [loading, userData, classId, fetchMissions]);

    if (loading || !userData || !classId) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <AppLayout>
            <div className="p-4 sm:p-6 lg:p-8">
                {/* 헤더 */}
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">🔥 도전과제</h1>
                        <p className="text-sm text-slate-500 mt-1">도전과제를 완료하고 보상을 획득하세요!</p>
                    </div>
                    {hasPermission('mission_admin') && (
                        <Button color="indigo" onClick={() => setIsModalOpen(true)} icon={PlusCircle}>
                            새 도전과제 등록
                        </Button>
                    )}
                </header>

                {/* 미션 목록 */}
                {isLoading ? (
                    <div className="text-center py-20"><Spinner /></div>
                ) : missions.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {missions.map(mission => (
                            <MissionCard
                                key={mission.id}
                                mission={mission}
                                onUpdate={fetchMissions}
                                onManage={() => setSelectedMission(mission)}
                            />
                        ))}
                    </div>
                ) : (
                    <Alert message="아직 등록된 도전과제가 없습니다." />
                )}

                {/* 모달 */}
                {hasPermission('mission_admin') && (
                    <>
                        <MissionModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            onSuccess={fetchMissions}
                        />
                        {selectedMission && (
                            <MissionApprovalModal
                                isOpen={!!selectedMission}
                                onClose={() => setSelectedMission(null)}
                                mission={selectedMission}
                                classId={classId}
                                onUpdate={fetchMissions}
                            />
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
};

export default MissionPage;
