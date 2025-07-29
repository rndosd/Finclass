// ✅ PermissionGroupView.jsx 개선된 UI (버튼 뱃지 스타일 + 아이콘)

import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PERMISSION_CONFIG } from '../PermissionConfig';

export default function PermissionGroupView({ permissions = {} }) {
    const [expanded, setExpanded] = useState(false);

    const grantedKeys = Object.entries(permissions)
        .filter(([_, v]) => v)
        .map(([k]) => k);

    const grouped = PERMISSION_CONFIG.reduce((acc, p) => {
        if (grantedKeys.includes(p.key)) {
            const group = p.group || '기타';
            if (!acc[group]) acc[group] = [];
            acc[group].push(p.label);
        }
        return acc;
    }, {});

    const total = grantedKeys.length;

    if (total === 0) {
        return <span className="text-xs text-slate-400">권한 없음</span>;
    }

    return (
        <div className="text-sm space-y-1">
            {!expanded ? (
                <button
                    type="button"
                    className="text-indigo-600 text-xs hover:bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 inline-flex items-center gap-1"
                    onClick={() => setExpanded(true)}
                >
                    <ShieldCheck className="h-4 w-4" />
                    권한 {total}개 보기 ⌄
                </button>
            ) : (
                <>
                    {Object.entries(grouped).map(([group, labels]) => (
                        <div key={group} className="text-xs text-slate-700 leading-snug">
                            <strong className="mr-1">{group}:</strong>
                            {labels.join(', ')}
                        </div>
                    ))}
                    <button
                        type="button"
                        className="text-indigo-600 text-xs underline mt-1"
                        onClick={() => setExpanded(false)}
                    >
                        접기 ⌃
                    </button>
                </>
            )}
        </div>
    );
}
