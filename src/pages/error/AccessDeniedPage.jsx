// src/pages/error/AccessDeniedPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function AccessDeniedPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
            <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-6xl font-bold text-red-600 mb-2">403</h1>
            <p className="text-xl font-semibold text-slate-800 mb-2">접근이 거부되었습니다</p>
            <p className="text-slate-500 mb-6">이 페이지에 접근할 권한이 없습니다.</p>
            <Link to="/" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium">
                홈으로 돌아가기
            </Link>
        </div>
    );
}
