import React, { useState, useEffect } from 'react';
import { Database, Layers, Users, Settings, HandCoins, BookOpen } from 'lucide-react';
import { HelpGuideModal } from './HelpGuideModal';

interface SettingsModalProps {
  onClose: () => void;
  includeFee?: boolean;
  onToggleIncludeFee?: (val: boolean) => void;
  onOpenDataManagement?: () => void;
  onOpenGroupRules?: () => void;
  onOpenAdminManagement?: () => void;
  hasAdminAccess: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  includeFee = true,
  onToggleIncludeFee,
  onOpenDataManagement,
  onOpenGroupRules,
  onOpenAdminManagement,
  hasAdminAccess
}) => {
  const [showHelpGuide, setShowHelpGuide] = useState(false);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <>
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
            
            {/* Help Guide Button - Accessible to all */}
            <button
              type="button"
              onClick={() => setShowHelpGuide(true)}
              className="w-full flex items-center justify-between bg-gray-800/50 hover:bg-emerald-950/40 border border-gray-700 hover:border-emerald-500/50 p-4 rounded-xl transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800 group-hover:bg-emerald-900/60 flex items-center justify-center transition-colors shrink-0">
                  <BookOpen className="w-5 h-5 text-gray-400 group-hover:text-emerald-300" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-200 group-hover:text-white text-sm flex items-center gap-1.5">
                    <span>도움말 (앱 기능설명)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium border border-emerald-500/30">
                      색인·검색
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                    기능 색인 및 실시간 키워드 검색 가이드
                  </div>
                </div>
              </div>
            </button>

            {/* Include Fee Toggle */}
            {onToggleIncludeFee && (
              <label className="w-full flex items-center justify-between bg-gray-800/50 hover:bg-gray-800 border border-gray-700 p-4 rounded-xl transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors shrink-0">
                    <HandCoins className="w-5 h-5 text-gray-400 group-hover:text-amber-300" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-200 group-hover:text-white text-sm flex items-center gap-2">
                      사입비 포함 처리
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={includeFee}
                        onChange={(e) => onToggleIncludeFee(e.target.checked)}
                      />
                      <div className={`w-8 h-4 sm:w-10 sm:h-5 rounded-full transition-colors relative flex items-center ${includeFee ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                        <div className={`w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full absolute shadow transition-transform ${includeFee ? 'translate-x-4 sm:translate-x-5' : 'translate-x-1'}`}></div>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                      {includeFee ? '체크됨: 수금 화면에서 사입비(수수료)가 함께 계산됩니다.' : '체크 해제됨: 사입비 없이 대납금/미수금만 표시됩니다.'}
                    </div>
                  </div>
                </div>
              </label>
            )}

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
          </div>
        </div>
      </div>

      {/* Help Guide Modal */}
      {showHelpGuide && (
        <HelpGuideModal onClose={() => setShowHelpGuide(false)} />
      )}
    </>
  );
};
