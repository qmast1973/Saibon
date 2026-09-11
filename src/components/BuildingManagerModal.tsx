import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { X, Plus, Trash2, Building, Loader2 } from 'lucide-react';
import { getMarkets, saveMarkets } from '../lib/firebase';

interface BuildingManagerModalProps {
  onClose: () => void;
  onMarketsUpdated: (markets: string[]) => void;
}

export const BuildingManagerModal: React.FC<BuildingManagerModalProps> = ({ onClose, onMarketsUpdated }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [markets, setMarkets] = useState<string[]>([]);
  const [newMarket, setNewMarket] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getMarkets().then(fetched => {
      if (isMounted) {
        setMarkets(fetched);
        setLoading(false);
      }
    }).catch(err => {
      if (isMounted) {
        console.error('Failed to load markets:', err);
        setError('건물 목록을 불러오지 못했습니다.');
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleAdd = () => {
    const trimmed = newMarket.trim();
    if (!trimmed) return;
    if (markets.includes(trimmed)) {
      alert('이미 존재하는 건물입니다.');
      return;
    }
    setMarkets([...markets, trimmed].sort((a, b) => a.localeCompare(b, 'ko')));
    setNewMarket('');
  };

  const handleDelete = (market: string) => {
    if (confirm(`'${market}' 건물을 목록에서 삭제하시겠습니까?`)) {
      setMarkets(markets.filter(m => m !== market));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveMarkets(markets);
      onMarketsUpdated(markets);
      onClose();
    } catch (err: any) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-800 flex flex-col max-h-[85vh]">
        <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-300" />
            <h3 className="font-bold text-base">건물(도매상가) 관리</h3>
          </div>
          <button type="button" onClick={onClose} className="px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 text-indigo-100 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ml-auto shrink-0">
            [닫기]
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto flex flex-col min-h-0 bg-gray-900 overscroll-contain">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newMarket}
              onChange={(e) => setNewMarket(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="새 건물명 입력"
              className="flex-1 border border-gray-700 rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-gray-900"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newMarket.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-indigo-500 transition flex items-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </div>

          <div className="flex-1 overflow-y-auto border border-gray-800 rounded-xl bg-gray-900 shadow-inner p-2 space-y-1 overscroll-contain">
            {loading ? (
              <div className="h-20 flex items-center justify-center text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : markets.length === 0 ? (
              <div className="py-6 text-center text-gray-500 text-xs">등록된 건물이 없습니다.</div>
            ) : (
              markets.map(m => (
                <div key={m} className="flex items-center justify-between px-3 py-2 hover:bg-gray-900 rounded-lg group transition">
                  <span className="text-sm font-medium text-gray-200">{m}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition focus:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-900 border-t border-slate-100 px-5 py-3 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gray-950 hover:bg-slate-200 text-gray-200 text-sm font-semibold transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? '저장 중...' : '변경사항 저장'}
          </button>
        </div>
      </div>
    </div>
  );
};
