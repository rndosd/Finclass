import React from 'react';

export default function AssemblyMemberCard({ student }) {
    const defaultIntro = "좋은 법을 만들겠습니다!";

    return (
        <div className="bg-gradient-to-br from-white/80 to-slate-100/70 backdrop-blur-md border border-white/30 rounded-xl p-4 shadow-xl flex flex-col items-center text-center transform transition duration-300 hover:-translate-y-2 hover:shadow-2xl">
            <div className="text-4xl mb-2">🎖️</div>
            <p className="text-xl font-bold text-slate-800">{student.name} 의원</p>
            <p className="text-xs text-slate-600 mt-1 h-8">"{student.assemblyIntro || defaultIntro}"</p>
        </div>
    );
}