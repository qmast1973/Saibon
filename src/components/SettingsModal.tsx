import React, { useEffect } from 'react';
import { Database, Layers, Users, Settings } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  onOpenDataManagement?: () => void;
  onOpenGroupRules?: () => void;
  onOpenAdminManagement?: () => void;
  hasAdminAccess: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onOpenDataManagement,
  onOpenGroupRules,
  onOpenAdminManagement,
  hasAdminAccess
}) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-2xl p-5 border border-gray-800 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base sm:text-lg text-gray-100">
              환경설정
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ml-auto shrink-0"
          >
            [닫기]
          </button>
        </div>

        {/* Action Buttons Container */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1 overscroll-contain">
          {hasAdminAccess && onOpenDataManagement && (
            <button
              type="button"
              onClick={() => { onClose(); onOpenDataManagement(); }}
              className="w-full flex items-center justify-between bg-gray-800/50 hover:bg-indigo-900/40 border border-gray-700 hover:border-indigo-500/50 p-4 rounded-xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800 group-hover:bg-indigo-800 flex items-center justify-center transition-colors">
                  <Database className="w-5 h-5 text-gray-400 group-hover:text-indigo-300" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-200 group-hover:text-white text-sm">데이터 관리</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">DB 백업 및 복원, 엑셀 데이터 관리</div>
                </div>
              </div>
            </button>
          )}

          {onOpenGroupRules && (
            <button
              type="button"
              onClick={() => { onClose(); onOpenGroupRules(); }}
              className="w-full flex items-center justify-between bg-gray-800/50 hover:bg-violet-900/40 border border-gray-700 hover:border-violet-500/50 p-4 rounded-xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800 group-hover:bg-violet-800 flex items-center justify-center transition-colors">
                  <Layers className="w-5 h-5 text-gray-400 group-hover:text-violet-300" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-200 group-hover:text-white text-sm">대표거래처 관리</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">거래처 묶기, 별칭 매핑 및 속성 관리</div>
                </div>
              </div>
            </button>
          )}

          {hasAdminAccess && onOpenAdminManagement && (
            <button
              type="button"
              onClick={() => { onClose(); onOpenAdminManagement(); }}
              className="w-full flex items-center justify-between bg-gray-800/50 hover:bg-blue-900/40 border border-gray-700 hover:border-blue-500/50 p-4 rounded-xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800 group-hover:bg-blue-800 flex items-center justify-center transition-colors">
                  <Users className="w-5 h-5 text-gray-400 group-hover:text-blue-300" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-200 group-hover:text-white text-sm">회원 관리</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">사용자 승인, 권한 부여 및 정보 수정</div>
                </div>
              </div>
            </button>
          )}

          {(!hasAdminAccess && !onOpenGroupRules) && (
            <div className="py-8 text-center text-gray-500 text-xs">
              이용 가능한 설정 항목이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
