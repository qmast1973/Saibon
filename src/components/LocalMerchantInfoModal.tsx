import React, { useEffect } from 'react';
import { User } from '../types';
import { Store, X, Phone, MapPin } from 'lucide-react';

interface LocalMerchantInfoModalProps {
  currentUser: User | null;
  users: User[];
  onClose: () => void;
}

export const LocalMerchantInfoModal: React.FC<LocalMerchantInfoModalProps> = ({
  currentUser,
  users,
  onClose
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!currentUser || currentUser.role !== 'local') return null;

  const assignedUsernames = new Set(currentUser.assignedMerchants || []);
  const merchants = users.filter(u => u.role === 'merchant' && assignedUsernames.has(u.username));

  return (
    <div id="localMerchantInfoModal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[225] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-800 my-auto flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-200" />
              담당 거래처 정보
            </h3>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              관리자가 지정한 담당 상인 거래처의 연락처와 매장 주소를 확인합니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ml-auto shrink-0">
            [닫기]
          </button>
        </div>

        {/* List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1 text-xs overscroll-contain">
          {merchants.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Store className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
              현재 관리자가 지정한 담당 상인 거래처가 없습니다.
            </div>
          ) : (
            merchants.map(m => (
              <div key={m.username} className="border border-gray-800 rounded-xl p-3.5 bg-gray-900 hover:bg-gray-950/80 transition">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-gray-100">{m.storeName || '상호 미등록'}</span>
                  <span className="text-[10px] text-gray-400 font-mono">({m.username})</span>
                </div>
                <div className="mt-2 text-gray-300 space-y-1">
                  <div>대표자: <b className="text-gray-100">{m.name || '-'}</b></div>
                  {m.businessNumber && (
                    <div className="text-gray-200">사업자: <span className="font-mono text-gray-100">{m.businessNumber}</span></div>
                  )}
                  {m.phone && (
                    <div className="flex items-center gap-1.5 text-gray-200">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{m.phone}</span>
                    </div>
                  )}
                  {m.address && (
                    <div className="flex items-start gap-1.5 text-gray-200">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{m.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-900 border-t border-gray-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition text-xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
