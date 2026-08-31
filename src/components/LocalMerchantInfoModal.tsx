import React from 'react';
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
  if (!currentUser || currentUser.role !== 'local') return null;

  const assignedUsernames = new Set(currentUser.assignedMerchants || []);
  const merchants = users.filter(u => u.role === 'merchant' && assignedUsernames.has(u.username));

  return (
    <div id="localMerchantInfoModal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[225] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[85vh]">
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
          <button type="button" onClick={onClose} className="text-emerald-100 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1 text-xs">
          {merchants.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Store className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
              현재 관리자가 지정한 담당 상인 거래처가 없습니다.
            </div>
          ) : (
            merchants.map(m => (
              <div key={m.username} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 hover:bg-slate-100/80 transition">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{m.storeName || '상호 미등록'}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({m.username})</span>
                </div>
                <div className="mt-2 text-slate-600 space-y-1">
                  <div>대표자: <b className="text-slate-800">{m.name || '-'}</b></div>
                  {m.phone && (
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{m.phone}</span>
                    </div>
                  )}
                  {m.address && (
                    <div className="flex items-start gap-1.5 text-slate-700">
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
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
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
