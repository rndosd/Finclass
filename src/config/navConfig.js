// src/config/navConfig.js
import {
  Home as HomeIcon, Landmark, LineChart, Receipt, Siren, Building2,
  ShoppingCart, GraduationCap, Users, UserPlus, KeyRound,
  SlidersHorizontal, Database, Wrench, ShieldCheck, MapPin, MessageSquare  // ✅ MessageSquare 추가
} from 'lucide-react';

export const mainNavItems = [
  { label: "홈", path: "/", icon: HomeIcon, type: "main" },
  { label: "도전과제", path: "/missions", icon: ShieldCheck, type: "main" },
  { label: "은행", path: "/bank", icon: Landmark, type: "main" },
  { label: "신용등급", path: "/credit", icon: GraduationCap, type: "main" },
  { label: "주식거래소", path: "/stock", icon: LineChart, type: "main" },
  { label: "부동산", path: "/realestate", icon: MapPin, type: "main" },  // ✅ 중복 제거
  { label: "국세청", path: "/tax", icon: Receipt, type: "main" },
  { label: "경찰청", path: "/police", icon: Siren, type: "main" },
  { label: "국회", path: "/assembly", icon: Building2, type: "main" },
  { label: "상점", path: "/store", icon: ShoppingCart, type: "main" },
  // ✅ 새로 추가: 앱 피드백 메뉴 (교사/관리자만 접근)
  {
    label: "앱 피드백",
    path: "/feedback",
    icon: MessageSquare,
    type: "item",
    allowedRoles: ["teacher", "admin"],
  },
];

export const adminNavItems = [
  {
    label: "계정 관리",
    icon: Users,
    type: "accordion",
    children: [
      {
        label: "학생 계정 등록",
        path: "/manage/students/create",
        icon: UserPlus,
      },
      {
        label: "비밀번호 초기화",
        path: "/manage/students/reset",
        icon: KeyRound,
      },
      {
        label: "학생 계정 삭제",
        path: "/manage/students/delete",
        icon: UserPlus,
      },
    ],
  },

  {
    label: "학급 기본 설정",
    onClick: "openClassSettingsModal",
    icon: Wrench,
    type: "item",
    allowedRoles: ["teacher", "admin"],
  },

  {
    label: "일반 관리",
    icon: ShieldCheck,
    type: "group",
    children: [
      { label: "자산 관리", path: "/manage/assets", icon: Database },
      {
        label: "권한 관리",
        path: "/manage/permissions",
        icon: SlidersHorizontal,
      },
      { label: "학생 관리", path: "/manage/students", icon: Wrench },
    ],
  },
];