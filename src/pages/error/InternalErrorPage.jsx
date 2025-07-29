// src/pages/error/InternalErrorPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function InternalErrorPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <h1 className="text-6xl font-bold text-yellow-600 mb-2">500</h1>
            <p className="text-xl font-semibold text-slate-800 mb-2">서버 오류가 발생했습니다</p>
            <p className="text-slate-500 mb-6">문제가 지속되면 관리자에게 문의해주세요.</p>
            <Link to="/" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium">
                홈으로 돌아가기
            </Link>
        </div>
    );
}
