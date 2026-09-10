import React from 'react';
import { User } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { Database, Calculator, Store, LogOut, Users, HandCoins, MessageSquare, Layers } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onOpenDataManagement: () => void;
  onOpenProfile: () => void;
  onOpenMerchantInfo: () => void;
  onOpenCollectionScreen: () => void;
  onOpenBuyerWorkday?: () => void;
  onOpenAdminManagement: () => void;
  onOpenGroupRules?: () => void;
  onOpenBoard?: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenDataManagement,
  onOpenProfile,
  onOpenMerchantInfo,
  onOpenCollectionScreen,
  onOpenBuyerWorkday,
  onOpenAdminManagement,
  onOpenGroupRules,
  onOpenBoard,
  onLogout
}) => {
  const isMerchant = currentUser?.role === 'merchant';
  const isBuyer = currentUser?.role === 'buyer';
  const isLocal = currentUser?.role === 'local';
  const isAdmin = currentUser?.role === 'admin';
  const isSubAdmin = currentUser?.role === 'buyer' && currentUser?.isBuyerAdmin;
  const hasAdminAccess = isAdmin || isSubAdmin;

  const userLabel = currentUser ? (
    currentUser.role === 'buyer'
      ? `${currentUser.name} · ${currentUser.isBuyerAdmin ? '서브관리자(사입)' : '사입삼촌'}`
      : currentUser.role === 'local'
      ? `${currentUser.name} · ${currentUser.assignedRegion || '지방삼촌'}`
      : currentUser.role === 'merchant'
      ? `${currentUser.name} · ${currentUser.storeName || '상인'}`
      : `${currentUser.name} · 관리자`
  ) : '게스트';

  return (
    <header className="bg-indigo-900 text-white shadow-md z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex justify-between gap-2 items-start">
        
        {/* Left Area: Brand & Data Management */}
        <div className="flex flex-row items-center gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/ildang-505711.firebasestorage.app/o/%EC%82%AC%EC%9E%85ON.png?alt=media&token=9aec0177-3023-4390-b1cb-b7d44a42aa97" 
              alt="사입ON 로고" 
              className="h-14 sm:h-20 w-auto object-contain shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden flex-row items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-700/90 flex items-center justify-center text-indigo-200 shadow-inner shrink-0">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5 truncate">
                  사입ON
                </h1>
                <p className="text-[10px] sm:text-xs text-indigo-200 truncate hidden xs:block">일자별 사입 달력 시스템</p>
              </div>
            </div>
          </div>

          {/* Data Management Button (Moved here) */}
          {hasAdminAccess && (
            <button
              type="button"
              onClick={onOpenDataManagement}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-1.5 sm:px-2 py-1 rounded-lg flex items-center gap-0.5 transition shadow-xs text-[10px] sm:text-[10px] w-max"
            >
              <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>데이터 관리</span>
            </button>
          )}
        </div>

        {/* Right Area: User Info/Logout (Top) & Action Menus (Bottom) */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          
          {/* Top Right: User Info & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5">
            <PWAInstallButton />
            {onOpenBoard && (
              <button
                type="button"
                onClick={onOpenBoard}
                className="bg-amber-500 hover:bg-amber-400 text-white px-2 py-1 sm:px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>게시판</span>
              </button>
            )}
            {/* User Info Badge */}
            <div 
              onClick={onOpenProfile}
              className="bg-indigo-950/80 hover:bg-indigo-950 border border-indigo-700/60 px-2 sm:px-2.5 py-1 rounded-xl text-indigo-100 font-bold text-[11px] sm:text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              title="내 정보 열기"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              <span className="max-w-[80px] sm:max-w-[160px] truncate">{userLabel}</span>
            </div>

            {/* Profile modal button (Desktop) */}
            <button
              type="button"
              onClick={onOpenProfile}
              className="hidden sm:inline-flex bg-indigo-800/80 hover:bg-indigo-700 px-2 py-1 rounded-xl text-[11px] font-bold transition text-indigo-100"
            >
              내 정보
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="px-2.5 py-1 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] sm:text-xs font-bold transition flex items-center gap-1 shadow-sm"
              title="로그아웃"
            >
              <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>

          {/* Bottom Right: Quick Action Menus */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {(isBuyer || isAdmin) && onOpenBuyerWorkday && (
                <button
                  type="button"
                  onClick={onOpenBuyerWorkday}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <Calculator className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>주문처리</span>
                </button>
              )}
              
              {isLocal && (
                <button
                  type="button"
                  onClick={onOpenMerchantInfo}
                  className="bg-emerald-700 hover:bg-emerald-600 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1"
                >
                  <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>담당 거래처</span>
                </button>
              )}

              {!isMerchant && (
                <button
                  type="button"
                  onClick={onOpenCollectionScreen}
                  className="bg-emerald-700 hover:bg-emerald-600 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1"
                >
                  <HandCoins className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>수금관리</span>
                </button>
              )}

              {onOpenGroupRules && (
                <button
                  type="button"
                  onClick={onOpenGroupRules}
                  className="bg-violet-600 hover:bg-violet-500 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-xs font-black transition flex items-center gap-1.5 shadow-md ring-2 ring-violet-400/70 hover:ring-violet-300 text-white active:scale-95 cursor-pointer"
                  title="대표거래처 묶기 관리 (종속 거래처 목록 조회/수정/삭제)"
                >
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-200" />
                  <span>대표거래처 관리</span>
                </button>
              )}

              {hasAdminAccess && (
                <button
                  type="button"
                  onClick={onOpenAdminManagement}
                  className="bg-indigo-700 hover:bg-indigo-600 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1"
                >
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>회원관리</span>
                </button>
              )}
              
            </div>
        </div>
      </div>
    </header>
  );
};
