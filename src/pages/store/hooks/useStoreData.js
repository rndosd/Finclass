// src/pages/store/hooks/useStoreData.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../../firebase';
import {
    collection,
    doc,
    query,
    where,
    orderBy,
    writeBatch,
    Timestamp,
    onSnapshot
} from "firebase/firestore";
import { useUser } from '../../../contexts/UserContext';

// 샘플 데이터
const DEFAULT_SAMPLE_CATEGORIES = [
    { name: "🍪 스낵 및 음료", description: "쉬는 시간에 즐겁게!", isActive: true },
    { name: "✏️ 학용품 및 도구", description: "학습에 필요한 모든 것!", isActive: true },
];

const DEFAULT_SAMPLE_ITEMS = {
    "🍪 스낵 및 음료": [
        { name: "초코 막대 과자", description: "달콤한 휴식 시간의 동반자", price: 150, stock: 50, isActive: true },
        { name: "톡톡! 사이다", description: "갈증 해소에 최고!", price: 100, stock: 30, isActive: true },
    ],
    "✏️ 학용품 및 도구": [
        { name: "무지개 연필 (3개입)", description: "필기 시간을 즐겁게!", price: 250, stock: null, isActive: true },
        { name: "지우개 달린 학습용 연필", description: "잘 지워지고 잘 써져요.", price: 80, stock: 100, isActive: true, minCreditScoreRequired: 550 },
    ]
};

const useStoreData = () => {
    const { classId, userData, isTeacher } = useUser();
    const authUser = userData;

    const [categories, setCategories] = useState([]);
    const [items, setItems] = useState({});
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);

    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [error, setError] = useState(null);

    // 샘플 데이터 생성
    const createSampleStoreData = useCallback(async () => {
        if (!db || !classId || !authUser?.uid) {
            console.error("[useStoreData] Cannot create sample data: db, classId, or authUser missing.");
            return;
        }
        console.log(`[useStoreData] Creating sample store data for class: ${classId}`);
        setIsLoadingCategories(true);
        setIsLoadingItems(true);

        const batch = writeBatch(db);
        const now = new Date();

        try {
            for (const catData of DEFAULT_SAMPLE_CATEGORIES) {
                const categoryRef = doc(collection(db, "classes", classId, "storeCategories"));
                batch.set(categoryRef, {
                    ...catData,
                    teacherUid: authUser.uid,
                    createdAt: now,
                    updatedAt: now,
                });

                const sampleItemsForCategory = DEFAULT_SAMPLE_ITEMS[catData.name] || [];
                for (const itemData of sampleItemsForCategory) {
                    const itemRef = doc(collection(db, "classes", classId, "storeItems"));
                    batch.set(itemRef, {
                        ...itemData,
                        categoryId: categoryRef.id,
                        categoryName: catData.name,
                        teacherUid: authUser.uid,
                        createdAt: now,
                        updatedAt: now,
                    });
                }
            }
            await batch.commit();
            console.log(`[useStoreData] Sample store data created successfully for class: ${classId}`);
        } catch (e) {
            console.error("Error creating sample store data:", e);
            setError("샘플 상점 데이터 생성 중 오류가 발생했습니다.");
        }
    }, [db, classId, authUser?.uid]);

    // 카테고리 구독
    useEffect(() => {
        if (!db || !classId) {
            setCategories([]);
            setIsLoadingCategories(false);
            return;
        }
        setIsLoadingCategories(true);
        const categoriesColRef = collection(db, "classes", classId, "storeCategories");
        const q = query(categoriesColRef, orderBy("name")); // 🚀 방법2 적용

        const unsubscribeCategories = onSnapshot(q, async (snapshot) => {
            const loadedCategories = [];
            snapshot.forEach(doc => {
                loadedCategories.push({ id: doc.id, ...doc.data() });
            });

            if (loadedCategories.length === 0 && isTeacher) {
                console.log(`[useStoreData] No categories found for class ${classId}, creating sample data.`);
                await createSampleStoreData();
            } else {
                setCategories(loadedCategories);

                // 🚀 카테고리 선택 로직
                if (loadedCategories.length > 0 && !selectedCategoryId) {
                    setSelectedCategoryId(loadedCategories[0].id);
                } else if (loadedCategories.length === 0) {
                    setSelectedCategoryId(null);
                }
            }
            setIsLoadingCategories(false);
        }, (err) => {
            console.error("Error fetching store categories:", err);
            setError("상점 카테고리 로딩 중 오류가 발생했습니다.");
            setIsLoadingCategories(false);
        });

        return () => unsubscribeCategories();
    }, [db, classId, isTeacher, createSampleStoreData, selectedCategoryId]);

    // 상품 구독
    useEffect(() => {
        if (!db || !classId || !selectedCategoryId) {
            setItems(prevItems => ({ ...prevItems, [selectedCategoryId || 'none']: [] }));
            setIsLoadingItems(false);
            return;
        }

        setIsLoadingItems(true);
        const itemsColRef = collection(db, "classes", classId, "storeItems");
        const qItems = query(itemsColRef, where("categoryId", "==", selectedCategoryId), orderBy("name", "asc"));

        const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
            const loadedItems = [];
            snapshot.forEach(doc => {
                loadedItems.push({ id: doc.id, ...doc.data() });
            });
            setItems(prevItems => ({
                ...prevItems,
                [selectedCategoryId]: loadedItems
            }));
            setIsLoadingItems(false);
        }, (err) => {
            console.error(`Error fetching items for category ${selectedCategoryId}:`, err);
            setError(`상품 로딩 중 오류 (${selectedCategoryId})`);
            setIsLoadingItems(false);
        });

        return () => unsubscribeItems();
    }, [db, classId, selectedCategoryId]);

    // 현재 카테고리 상품
    const currentCategoryItems = useMemo(() => {
        return items[selectedCategoryId] || [];
    }, [items, selectedCategoryId]);

    return {
        categories,
        selectedCategoryId,
        setSelectedCategoryId,
        currentCategoryItems,
        isLoading: isLoadingCategories || isLoadingItems,
        isLoadingCategories,
        isLoadingItems,
        error,
    };
};

export default useStoreData;
