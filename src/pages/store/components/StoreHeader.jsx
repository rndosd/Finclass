// src/pages/store/components/StoreHeader.jsx

import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
    ChevronDown,
    ShoppingCart,
    Settings,
    PlusCircle,
    ClipboardList,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { useUser } from '../../../contexts/UserContext';

const StoreHeader = ({
    activeTab,
    selectedCategoryName,
    categories,
    onCategoryChange,
    onOpenAddCategoryModal,
    onOpenAddItemModal,
    onOpenPurchaseHistory,
    onOpenManageTab,
}) => {
    const { hasPermission } = useUser();

    return (
        <>
            {/* 상단 제목 + 관리 드롭다운 */}
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <ShoppingCart className="h-8 w-8 text-indigo-500" />
                    {activeTab === 'shop' ? '상점' : '상품 지급 관리'}
                </h1>

                {hasPermission('store_admin') && (
                    <Menu as="div" className="relative">
                        <Menu.Button
                            as={Button}
                            variant="outline"
                            className="flex items-center"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            상점 관리
                            <ChevronDown className="w-4 h-4 ml-1" />
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                                <div className="py-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={onOpenAddCategoryModal}
                                                className={`${active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                                                    } flex items-center px-4 py-2 text-sm w-full`}
                                            >
                                                <PlusCircle className="w-4 h-4 mr-2" />
                                                카테고리 추가
                                            </button>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={onOpenAddItemModal}
                                                className={`${active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                                                    } flex items-center px-4 py-2 text-sm w-full`}
                                            >
                                                <PlusCircle className="w-4 h-4 mr-2" />
                                                상품 추가
                                            </button>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={onOpenManageTab}
                                                className={`${active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                                                    } flex items-center px-4 py-2 text-sm w-full`}
                                            >
                                                <ClipboardList className="w-4 h-4 mr-2" />
                                                상품 지급 관리
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                )}
            </div>

            {/* 카테고리 필터 & 구매 기록 버튼 */}
            <div className="mb-6 p-4 bg-white rounded-xl shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    {/* 카테고리 드롭다운 */}
                    <div
                        className={`flex items-center gap-2 w-full sm:w-auto ${activeTab === 'shop' ? '' : 'invisible'
                            }`}
                    >
                        <span className="text-sm font-semibold text-slate-600">
                            카테고리:
                        </span>
                        <Menu as="div" className="relative inline-block text-left">
                            <Menu.Button
                                as={Button}
                                variant="outline"
                                className="flex justify-between w-full sm:w-auto"
                            >
                                {selectedCategoryName}
                                <ChevronDown className="w-4 h-4 ml-2" />
                            </Menu.Button>
                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-40">
                                    <div className="py-1">
                                        <Menu.Item>
                                            {({ active }) => (
                                                <button
                                                    onClick={() => onCategoryChange(null)}
                                                    className={`${active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                                                        } block w-full text-left px-4 py-2 text-sm`}
                                                >
                                                    전체 보기
                                                </button>
                                            )}
                                        </Menu.Item>
                                        {categories.map((cat) => (
                                            <Menu.Item key={cat.id}>
                                                {({ active }) => (
                                                    <button
                                                        onClick={() => onCategoryChange(cat.id)}
                                                        className={`${active ? 'bg-indigo-500 text-white' : 'text-gray-900'
                                                            } block w-full text-left px-4 py-2 text-sm`}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                )}
                                            </Menu.Item>
                                        ))}
                                    </div>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    </div>
                    {/* 구매 기록 버튼 */}
                    <div className="flex-shrink-0">
                        <Button variant="secondary" onClick={onOpenPurchaseHistory}>
                            나의 구매 기록
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StoreHeader;
