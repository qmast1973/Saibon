import React, { useState } from 'react';
import { CollectionGroupRule, User } from '../types';
import { saveGroupRulesToFirebase } from '../lib/firebase';
import { Layers, Plus, Trash2, X } from 'lucide-react';

interface GroupRulesManagerModalProps {
  rules: CollectionGroupRule[];
  currentUser: User | null;
  currentDateStr: string;
  onClose: () => void;
  onRulesUpdated: (rules: CollectionGroupRule[]) => void;
}

export const GroupRulesManagerModal: React.FC<GroupRulesManagerModalProps> = ({
  rules,
  currentUser,
  currentDateStr,
  onClose,
  onRulesUpdated
}) => {
  const [storeName, setStoreName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(currentDateStr || new Date().toISOString().slice(0, 10));
  const [matchType, setMatchType] = useState<'exact' | 'prefix'>('exact');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !groupName.trim() || !effectiveFrom) return;

    setIsSubmitting(true);
    try {
      const newRule: CollectionGroupRule = {
        id: `group_${Date.now()}`,
        storeName: storeName.trim(),
        groupName: groupName.trim(),
        effectiveFrom,
        matchType,
        createdAt: new Date().toISOString()
      };

      const updated = [...rules, newRule];
      await saveGroupRulesToFirebase(updated);
      onRulesUpdated(updated);

      setStoreName('');
      setGroupName('');
    } catch (err) {
      console.error('대표 거래처 규칙 저장 오류:', err);
      alert('대표 거래처 규칙을 저장하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 대표 거래처 규칙을 삭제하시겠습니까?')) return;
    try {
      const updated = rules.filter(r => r.id !== id);
      await saveGroupRulesToFirebase(updated);
      onRulesUpdated(updated);
    } catch (err) {
      console.error('규칙 삭제 오류:', err);
      alert('규칙을 삭제하지 못했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 border border-slate-200 my-auto">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-600" />
              대표 거래처 관리
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              분리일 이후 주문만 새 거래처로 따로 수금 및 집계됩니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUser?.role === 'admin' && (
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">주문 상호 *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="예: 호치강남"
                className="w-full border border-slate-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">대표 거래처 *</label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="예: 호치키스"
                className="w-full border border-slate-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">적용 시작일 *</label>
              <input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">일치 규칙</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as 'exact' | 'prefix')}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="exact">이 상호만 (완전 일치)</option>
                <option value="prefix">이 글자로 시작 (접두사)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="col-span-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              대표 거래처로 묶기
            </button>
          </form>
        )}

        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <div className="px-3.5 py-2 bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
            현재 등록된 규칙 ({rules.length}개)
          </div>
          <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {rules.length === 0 ? (
              <div className="p-4 text-center text-slate-400">등록된 규칙이 없습니다.</div>
            ) : (
              rules.map(r => (
                <div key={r.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800">
                      <span>{r.matchType === 'prefix' ? `${r.storeName}*` : r.storeName}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="text-violet-700">{r.groupName}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {r.effectiveFrom || '즉시'}부터 적용
                    </div>
                  </div>
                  {!r.systemDefault && currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
