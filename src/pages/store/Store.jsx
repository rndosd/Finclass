import React, { useState, useEffect, useCallback, useMemo, Fragment } from 'react';

// 컨텍스트 및 훅
import { useUser } from '../../contexts/UserContext';
import useStoreData from './hooks/useStoreData';

// Firebase
import { buyStoreItem } from './services/storeService';
import { deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

// UI 컴포넌트
import AppLayout from '../../components/layout/AppLayout';
import { Spinner, Alert } from '../../components/ui';

// 하위 컴포넌트
import StoreHeader from './components/StoreHeader';
import StoreItemList from './components/StoreItemList';
import StorePendingRedemptions from './components/StorePendingRedemptions';
import AddEditCategoryModal from './modals/AddEditCategoryModal';
import AddEditStoreItemModal from './modals/AddEditStoreItemModal';
import BuyItemModal from './modals/BuyItemModal';
import StorePurchaseHistoryModal from './modals/StorePurchaseHistoryModal';

const Store = () => {
    const { classId, classData, userData, loading: userContextLoading } = useUser();
    const {
        categories, selectedCategoryId, setSelectedCategoryId,
        currentCategoryItems, isLoading: isLoadingStore, isLoadingItems,
        error: storeError, refreshCategories
    } = useStoreData();

    const pageCurrencyUnit = classData?.currencyUnit || '단위';
    const authUserUid = userData?.uid;
    const studentName = userData?.name || '학생';

    const [liveStudentData, setLiveStudentData] = useState(null);
    const [feedback, setFeedback] = useState({ message: '', type: '', open: false });
    const [activeTab, setActiveTab] = useState('shop');

    const [buyItemModalInfo, setBuyItemModalInfo] = useState({ isOpen: false, item: null });
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [showPurchaseHistoryModal, setShowPurchaseHistoryModal] = useState(false);
    const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

    useEffect(() => {
        if (classId && authUserUid) {
            const studentDocRef = doc(db, "classes", classId, "students", authUserUid);
            const unsubscribe = onSnapshot(studentDocRef, (snap) => {
                if (snap.exists()) setLiveStudentData(snap.data());
            });
            return () => unsubscribe();
        }
    }, [classId, authUserUid]);

    const studentCurrentClassCurrencyBalance = liveStudentData?.assets?.cash ?? 0;

    const showAppFeedback = useCallback((message, type = 'info', duration = 4000) => {
        setFeedback({ message, type, open: true });
        setTimeout(() => setFeedback(prev => ({ ...prev, open: false })), duration);
    }, []);

    const handleOpenBuyItemModal = useCallback((itemToBuy) => {
        setBuyItemModalInfo({ isOpen: true, item: itemToBuy });
    }, []);
    const handleCloseBuyItemModal = useCallback(() => setBuyItemModalInfo({ isOpen: false, item: null }), []);
    const handleExecutePurchase = useCallback(async (item, quantity) => {
        setIsSubmittingPurchase(true);
        const result = await buyStoreItem({
            classId, userId: authUserUid, studentName,
            itemId: item.id, itemData: item, quantityToBuy: quantity,
            currencyUnit: pageCurrencyUnit
        });
        if (result.success) {
            showAppFeedback(result.message || "상품 구매가 완료되었습니다!", 'success');
            handleCloseBuyItemModal();
        } else {
            showAppFeedback(result.message || "상품 구매 중 오류 발생", 'error');
        }
        setIsSubmittingPurchase(false);
        return result;
    }, [authUserUid, classId, pageCurrencyUnit, showAppFeedback, handleCloseBuyItemModal, studentName]);

    const handleOpenAddCategoryModal = () => setShowAddCategoryModal(true);
    const handleCloseAddCategoryModal = () => {
        setShowAddCategoryModal(false);
        if (refreshCategories) refreshCategories();
    };
    const handleOpenAddItemModal = () => { setItemToEdit(null); setShowAddItemModal(true); };
    const handleCloseAddItemModal = () => { setItemToEdit(null); setShowAddItemModal(false); };
    const handleEditItem = (item) => { setItemToEdit(item); setShowAddItemModal(true); };
    const handleDeleteItem = async (item) => {
        if (!window.confirm(`"${item.name}" 상품을 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, 'classes', classId, 'storeItems', item.id));
            showAppFeedback('상품이 삭제되었습니다.', 'success');
        } catch (err) {
            showAppFeedback('상품 삭제 중 오류가 발생했습니다.', 'error');
        }
    };

    if (userContextLoading || isLoadingStore) {
        return <AppLayout title="상점 로딩 중..."><div className="flex justify-center pt-20"><Spinner size="xl" /></div></AppLayout>;
    }
    if (!classId) {
        return <AppLayout title="학급 없음"><div className="p-6"><Alert type="warning" message="상점을 이용하려면 학급을 선택해주세요." /></div></AppLayout>;
    }

    const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || '전체 카테고리';

    return (
        <AppLayout showDefaultHeader={false} showSidebar={true}>
            <div className="p-4 sm:p-6 lg:p-8">
                <StoreHeader
                    activeTab={activeTab}
                    selectedCategoryName={selectedCategoryName}
                    categories={categories}
                    onCategoryChange={setSelectedCategoryId}
                    onOpenPurchaseHistory={() => setShowPurchaseHistoryModal(true)}
                    onOpenAddCategoryModal={() => setShowAddCategoryModal(true)}
                    onOpenAddItemModal={() => { setItemToEdit(null); setShowAddItemModal(true); }}
                    onOpenManageTab={() => setActiveTab('manage')}
                />

                {feedback.open && (
                    <div className="fixed top-5 right-5 z-[150] max-w-sm w-full sm:w-auto">
                        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback({ ...feedback, open: false })} />
                    </div>
                )}

                {activeTab === 'shop' ? (
                    <StoreItemList
                        items={currentCategoryItems}
                        currencyUnit={pageCurrencyUnit}
                        onBuyItem={handleOpenBuyItemModal}
                        onEditItem={handleEditItem}
                        onDeleteItem={handleDeleteItem}
                        isLoadingItems={isLoadingItems}
                        categoryName={selectedCategoryName}
                    />
                ) : activeTab === 'manage' ? (
                    <StorePendingRedemptions onBackToShop={() => setActiveTab('shop')} />
                ) : null}
            </div>

            {buyItemModalInfo.isOpen && (
                <BuyItemModal
                    isOpen={buyItemModalInfo.isOpen}
                    onClose={handleCloseBuyItemModal}
                    itemToBuy={buyItemModalInfo.item}
                    currencyUnit={pageCurrencyUnit}
                    studentClassCurrencyBalance={studentCurrentClassCurrencyBalance}
                    onSubmitPurchase={handleExecutePurchase}
                    isSubmitting={isSubmittingPurchase}
                />
            )}
            {showAddCategoryModal && <AddEditCategoryModal isOpen={showAddCategoryModal} onClose={handleCloseAddCategoryModal} />}
            {showAddItemModal && (
                <AddEditStoreItemModal
                    isOpen={showAddItemModal}
                    onClose={handleCloseAddItemModal}
                    selectedCategoryId={selectedCategoryId}
                    itemToEdit={itemToEdit}
                />
            )}
            {showPurchaseHistoryModal && (
                <StorePurchaseHistoryModal
                    isOpen={showPurchaseHistoryModal}
                    onClose={() => setShowPurchaseHistoryModal(false)}
                />
            )}
        </AppLayout>
    );
};

export default Store;
