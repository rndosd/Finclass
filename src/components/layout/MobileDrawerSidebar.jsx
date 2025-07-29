// src/components/layout/MobileDrawerSidebar.jsx

import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { mainNavItems, adminNavItems } from '../../config/navConfig';

export default function MobileDrawerSidebar({ isOpen, onClose, children, title }) {
    const { isAdmin, isTeacher } = useUser();
    const [adminMenuOpen, setAdminMenuOpen] = useState(false);
    const location = useLocation();

    const getLinkClass = (path) => {
        return `flex items-center gap-x-3 px-3 py-2.5 rounded-lg transition-all duration-150 ease-in-out text-sm font-medium ${location.pathname === path
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-700 hover:bg-slate-100'
            }`;
    };

    const renderDefaultMenu = () => (
        <>
            <nav className="flex-1 px-4 py-4 space-y-1">
                {mainNavItems.map((item) => (
                    <Link key={item.path} to={item.path} className={getLinkClass(item.path)} onClick={onClose}>
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
            {(isAdmin || isTeacher) && (
                <div className="px-4 pt-4 border-t border-gray-200 space-y-1">
                    <button
                        onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
                    >
                        <span className="flex items-center gap-x-2">
                            <LockClosedIcon className="h-5 w-5" />
                            {isAdmin ? '시스템 관리' : '학급 관리'}
                        </span>
                        {adminMenuOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                    </button>
                    {adminMenuOpen && (
                        <div className="mt-1 space-y-1">
                            {adminNavItems.map((item) => (
                                <Link key={item.path} to={item.path} className={getLinkClass(item.path)} onClick={onClose}>
                                    <item.icon className="h-5 w-5 flex-shrink-0 mr-1" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="transition-opacity ease-linear duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity ease-linear duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 flex z-50">
                    <Transition.Child
                        as={Fragment}
                        enter="transition ease-in-out duration-300 transform"
                        enterFrom="-translate-x-full"
                        enterTo="translate-x-0"
                        leave="transition ease-in-out duration-300 transform"
                        leaveFrom="translate-x-0"
                        leaveTo="-translate-x-full"
                    >
                        <Dialog.Panel className="relative w-72 max-w-xs bg-white shadow-xl pb-6 flex flex-col overflow-y-auto">
                            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
                                {/* ✅ title prop이 있으면 그대로 사용 */}
                                <h2 className="text-lg font-bold text-slate-800">{title || "메뉴"}</h2>
                                <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-100 transition">
                                    <XMarkIcon className="h-6 w-6 text-slate-700" />
                                </button>
                            </div>

                            {children ? <div className="flex-1">{children}</div> : renderDefaultMenu()}
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    );
}
