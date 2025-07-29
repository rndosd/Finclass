// src/components/ui/Tabs.jsx
import React from 'react';

export default function Tabs({ tabs, activeTabId, onTabChange, className = '', tabListClassName = '', tabButtonClassName = '', activeTabButtonClassName = '', inactiveTabButtonClassName = '' }) {
    return (
        <div className={className}>
            <div className={`mb-4 border-b border-gray-200 ${tabListClassName}`}>
                <nav className="-mb-px flex space-x-2 sm:space-x-4" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`whitespace-nowrap py-3 px-1 sm:px-3 border-b-2 font-medium text-sm transition-colors duration-150 focus:outline-none
                ${tab.id === activeTabId
                                    ? `border-indigo-500 text-indigo-600 ${activeTabButtonClassName}`
                                    : `border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 ${inactiveTabButtonClassName}`
                                }
                ${tabButtonClassName}
              `}
                            aria-current={tab.id === activeTabId ? 'page' : undefined}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            {/* 탭 콘텐츠는 Tabs 컴포넌트를 사용하는 부모에서 activeTabId를 기준으로 렌더링합니다. */}
            {/* 예: {tabs.find(tab => tab.id === activeTabId)?.content} */}
        </div>
    );
}
// 사용 예시:
// const TABS = [
//   { id: 'profile', label: '프로필', content: <div>프로필 내용</div> },
//   { id: 'settings', label: '설정', content: <div>설정 내용</div> },
// ];
// const [activeTab, setActiveTab] = useState(TABS[0].id);
// <Tabs tabs={TABS} activeTabId={activeTab} onTabChange={setActiveTab} />
// <div className="mt-4">{TABS.find(tab => tab.id === activeTab)?.content}</div>