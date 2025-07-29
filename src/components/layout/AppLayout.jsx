// src/components/layout/AppLayout.jsx

import React, { useState, Fragment } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useUser } from '../../contexts/UserContext';
import { Menu, Transition } from '@headlessui/react';

import Sidebar from './Sidebar';
import MobileDrawerSidebar from './MobileDrawerSidebar';
import ClassSettingsModal from '../../pages/admin/modals/ClassSettingsModal';
import { Button } from '../ui';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { Wrench, LogOut, KeyRound, UserCircle, ChevronDownIcon, ShieldCheck } from 'lucide-react';

export default function AppLayout({
    children,
    title,
    showSidebar = true,
    customSidebar = null,
    alertSlot = null,
    showDefaultHeader = true,
    headerActions = null,
}) {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const { userData, isTeacher, isAdmin } = useUser();
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const handleLogout = async () => {
        if (window.confirm('정말 로그아웃 하시겠습니까?')) {
            try {
                await signOut(auth);
                navigate('/login');
            } catch (error) {
                console.error('로그아웃 실패:', error);
            }
        }
    };

    const handleNavItemClick = (item) => {
        if (item.path) {
            navigate(item.path);
        } else if (item.onClick === 'openClassSettingsModal') {
            setIsSettingsModalOpen(true);
        }
        setIsMobileSidebarOpen(false);
    };

    const sidebarToRender = customSidebar ? customSidebar : <Sidebar onNavItemClick={handleNavItemClick} />;

    return (
        <div className="flex min-h-screen bg-slate-100">
            {showSidebar && <div className="hidden lg:block">{sidebarToRender}</div>}
            {showSidebar && (
                <MobileDrawerSidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)}>
                    {sidebarToRender}
                </MobileDrawerSidebar>
            )}

            <div className="flex flex-col flex-1 relative">
                {alertSlot}

                <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm sticky top-0 z-40 h-16">
                    <div className="flex items-center gap-3">
                        {showSidebar && (
                            <button
                                className="lg:hidden text-slate-500 hover:text-slate-700"
                                onClick={() => setIsMobileSidebarOpen(true)}
                            >
                                <span className="sr-only">Open sidebar</span>
                                <Bars3Icon className="h-6 w-6" />
                            </button>
                        )}
                        {showDefaultHeader && <h1 className="text-xl font-bold text-slate-800">{title}</h1>}
                    </div>

                    <div className="flex items-center gap-2">
                        {headerActions}

                        <Menu as="div" className="relative ml-3">
                            <div>
                                <Menu.Button className="flex items-center text-sm rounded-full hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    <span className="sr-only">사용자 메뉴 열기</span>
                                    <UserCircle className="h-8 w-8 text-slate-500" />
                                    <span className="hidden sm:block ml-2 font-medium text-slate-700">
                                        {userData?.name || '사용자'}
                                    </span>
                                    <ChevronDownIcon className="hidden sm:block h-4 w-4 ml-1 text-slate-500" />
                                </Menu.Button>
                            </div>

                            <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                            >
                                <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    {isAdmin && (
                                        <Menu.Item>
                                            {({ active }) => (
                                                <Link
                                                    to="/admin"
                                                    className={`${active ? 'bg-slate-100' : ''
                                                        } flex items-center px-4 py-2 text-sm font-semibold text-indigo-600`}
                                                >
                                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                                    관리자 대시보드
                                                </Link>
                                            )}
                                        </Menu.Item>
                                    )}

                                    <div className="my-1 h-px bg-slate-100" />

                                    <Menu.Item>
                                        {({ active }) => (
                                            <Link
                                                to="/changepassword"
                                                className={`${active ? 'bg-slate-100' : ''
                                                    } flex items-center px-4 py-2 text-sm text-slate-700`}
                                            >
                                                <KeyRound className="h-4 w-4 mr-2" />
                                                비밀번호 변경
                                            </Link>
                                        )}
                                    </Menu.Item>

                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={handleLogout}
                                                className={`${active ? 'bg-red-50' : ''
                                                    } flex w-full items-center px-4 py-2 text-sm text-red-600`}
                                            >
                                                <LogOut className="h-4 w-4 mr-2" />
                                                로그아웃
                                            </button>
                                        )}
                                    </Menu.Item>
                                </Menu.Items>
                            </Transition>
                        </Menu>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">{children}</main>

                {isSettingsModalOpen && (
                    <ClassSettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
                )}
            </div>
        </div>
    );
}
