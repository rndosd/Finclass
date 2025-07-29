export const PERMISSION_CONFIG = [
    // --- 은행 기능 (파란색) ---
    { key: 'page_bank_view', label: '은행', group: '은행 기능', color: 'blue' },
    { key: 'bank_admin', label: '은행 관리자', group: '은행 기능', color: 'blue' },
    { key: 'action_bank_transfer', label: '송금 허용', group: '은행 기능', color: 'blue' },

    // --- 국세청 기능 (노란색) ---
    { key: 'page_tax_view', label: '국세청', group: '국세청 기능', color: 'yellow' },

    // --- 경찰청 기능 (빨간색) ---
    { key: 'page_police_view', label: '경찰청', group: '경찰청 기능', color: 'red' },
    { key: 'permission_group_police', label: '경찰 기능 관리자', group: '경찰청 기능', color: 'red' },

    // --- 상점 기능 (초록색) ---
    { key: 'page_store_view', label: '상점', group: '상점 기능', color: 'green' },
    { key: 'store_admin', label: '상점 관리자', group: '상점 기능', color: 'green' },

    // --- 주식 기능 (선홍색 / 핫핑크 계열) ---
    { key: 'page_stock_view', label: '주식', group: '주식 기능', color: 'fuchsia' },

    // --- 신용등급 기능 (보라색) ---
    { key: 'page_credit_view', label: '신용등급', group: '신용등급 기능', color: 'purple' },

    // --- 국회 기능 (하늘색 계열) ---
    { key: 'page_assembly_view', label: '국회', group: '국회 기능', color: 'sky' },

    // --- 미션 기능 (분홍색) ---
    { key: 'page_mission_view', label: '미션', group: '미션 기능', color: 'pink' },
    { key: 'mission_admin', label: '미션 관리자', group: '미션 기능', color: 'pink' },
];
