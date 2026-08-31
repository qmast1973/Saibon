import React from 'react';
import { User } from '../types';
import { Database, Calculator, Store, LogOut, Users, HandCoins } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onOpenDataManagement: () => void;
  onOpenProfile: () => void;
  onOpenMerchantInfo: () => void;
  onOpenCollectionScreen: () => void;
  onOpenBuyerWorkday?: () => void;
  onOpenAdminManagement: () => void;
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
  onLogout
}) => {
  const isMerchant = currentUser?.role === 'merchant';
  const isBuyer = currentUser?.role === 'buyer';
  const isLocal = currentUser?.role === 'local';
  const isAdmin = currentUser?.role === 'admin';

  const userLabel = currentUser ? (
    currentUser.role === 'buyer'
      ? `${currentUser.name} · 사입삼촌`
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
          {isAdmin && (
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
              <span>로그아웃</span>
            </button>
          </div>

          {/* Bottom Right: Quick Action Menus */}
          {(!isMerchant || isAdmin || isLocal) && (
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

              {isAdmin && (
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
          )}
        </div>
      </div>
    </header>
  );
};
