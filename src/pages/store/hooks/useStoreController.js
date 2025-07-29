// src/pages/store/useStoreController.js

import { useState, useCallback, useEffect } from 'react';
import { deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { buyStoreItem } from './services/storeService';

export default function useStoreController({ classId, userData, classData, categories, selectedCategoryId, setSelectedCategoryId, refreshCategories }) {
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
            const studentDocRef = doc(db, 'classes', classId, 'students', authUserUid);
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
            showAppFeedback(result.message || '상품 구매가 완료되었습니다!', 'success');
            handleCloseBuyItemModal();
        } else {
            showAppFeedback(result.message || '상품 구매 중 오류 발생', 'error');
        }
        setIsSubmittingPurchase(false);
        return result;
    }, [authUserUid, classId, pageCurrencyUnit, showAppFeedback, handleCloseBuyItemModal, studentName]);

    const handleOpenAddCategoryModal = () => setShowAddCategoryModal(true);
    const handleCloseAddCategoryModal = () => {
        setShowAddCategoryModal(false);
        if (refreshCategories) refreshCategories();
    };

    const handleOpenAddItemModal = () => {
        setItemToEdit(null);
        setShowAddItemModal(true);
    };

    const handleCloseAddItemModal = () => {
        setItemToEdit(null);
        setShowAddItemModal(false);
    };

    const handleEditItem = (item) => {
        setItemToEdit(item);
        setShowAddItemModal(true);
    };

    const handleDeleteItem = async (item) => {
        if (!window.confirm(`"${item.name}" 상품을 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, 'classes', classId, 'storeItems', item.id));
            showAppFeedback('상품이 삭제되었습니다.', 'success');
        } catch (err) {
            showAppFeedback('상품 삭제 중 오류가 발생했습니다.', 'error');
        }
    };

    return {
        activeTab, setActiveTab,
        feedback,
        buyItemModalInfo, handleOpenBuyItemModal, handleCloseBuyItemModal,
        showAddCategoryModal, handleOpenAddCategoryModal, handleCloseAddCategoryModal,
        showAddItemModal, handleOpenAddItemModal, handleCloseAddItemModal,
        showPurchaseHistoryModal, setShowPurchaseHistoryModal,
        handleExecutePurchase, isSubmittingPurchase,
        itemToEdit, handleEditItem, handleDeleteItem,
        studentCurrentClassCurrencyBalance
    };
}
