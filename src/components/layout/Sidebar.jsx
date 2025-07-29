// src/components/layout/Sidebar.jsx

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { mainNavItems, adminNavItems } from '../../config/navConfig';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function Sidebar({ onNavItemClick }) {
    const { isAdmin, isTeacher } = useUser();
    const location = useLocation();
    const [accordionOpen, setAccordionOpen] = useState({});

    const toggleAccordion = (label) => {
        setAccordionOpen(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const getLinkClass = (path) => {
        const base = "flex items-center gap-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition";
        const active = "bg-indigo-600 text-white shadow-md";
        const inactive = "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600";
        return `${base} ${location.pathname.startsWith(path) && path !== '/' ? active : (location.pathname === path ? active : inactive)}`;
    };

    const renderNavItem = (item) => {
        if (item.path) {
            return (
                <Link key={item.label} to={item.path} className={`${getLinkClass(item.path)} pl-8`}>
                    {item.icon && <item.icon className="h-4 w-4" />}
                    <span>{item.label}</span>
                </Link>
            );
        }
        if (item.onClick) {
            return (
                <button key={item.label} onClick={() => onNavItemClick(item)} className={`${getLinkClass('#')} w-full`}>
                    {item.icon && <item.icon className="h-5 w-5" />}
                    <span>{item.label}</span>
                </button>
            );
        }
        return null;
    };

    return (
        <aside className="bg-white w-full md:w-64 p-4 border-r border-gray-200 flex flex-col shadow-lg min-h-screen">
            {/* ... Main Nav ... */}
            <nav className="space-y-1.5 flex-grow">
                {mainNavItems.map((item) => (
                    <Link key={item.label} to={item.path} className={getLinkClass(item.path)}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* ⭐ 시작: 관리자 메뉴 렌더링 로직 수정 */}
            {(isAdmin || isTeacher) && (
                <div className="mt-auto border-t border-gray-200 pt-4 space-y-2">
                    <h2 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">관리 메뉴</h2>
                    {adminNavItems.map((section) => {
                        // 1. 아코디언 타입 처리
                        if (section.type === 'accordion') {
                            return (
                                <div key={section.label}>
                                    <button onClick={() => toggleAccordion(section.label)} className={`${getLinkClass('#')} w-full justify-between`}>
                                        <span className="flex items-center gap-x-3"><section.icon className="h-5 w-5" />{section.label}</span>
                                        {accordionOpen[section.label] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                    </button>
                                    {accordionOpen[section.label] && (
                                        <div className="mt-1 space-y-1">{section.children.map(item => renderNavItem(item))}</div>
                                    )}
                                </div>
                            );
                        }
                        // 2. 그룹 타입 처리
                        if (section.type === 'group') {
                            return (
                                <div key={section.label} className="pt-2">
                                    <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 flex items-center">
                                        {section.icon && <section.icon className="h-4 w-4 mr-2" />} {section.label}
                                    </h3>
                                    {section.children.map(item => renderNavItem(item))}
                                </div>
                            );
                        }
                        // 3. 단일 아이템 타입 처리
                        if (section.type === 'item') {
                            return renderNavItem(section);
                        }
                        return null;
                    })}
                </div>
            )}
            {/* ⭐ 끝: 수정된 부분 */}
        </aside>
    );
}