// src/pages/error/NotFoundPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
            <FileQuestion className="h-16 w-16 text-slate-400 mb-4" />
            <h1 className="text-6xl font-bold text-slate-700 mb-2">404</h1>
            <p className="text-xl font-semibold text-slate-800 mb-2">페이지를 찾을 수 없습니다</p>
            <p className="text-slate-500 mb-6">주소를 잘못 입력하셨거나, 페이지가 삭제되었을 수 있습니다.</p>
            <Link to="/" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium">
                홈으로 돌아가기
            </Link>
        </div>
    );
}
