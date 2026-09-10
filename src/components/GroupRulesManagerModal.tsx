import React, { useState } from 'react';
import { CollectionGroupRule, User } from '../types';
import { saveGroupRulesToFirebase } from '../lib/firebase';
import { Layers, Plus, Trash2, X, Check, Store } from 'lucide-react';

interface GroupRulesManagerModalProps {
  rules: CollectionGroupRule[];
  currentUser: User | null;
  currentDateStr: string;
  availableStores?: string[];
  merchantUsers?: User[];
  onClose: () => void;
  onRulesUpdated: (rules: CollectionGroupRule[]) => void;
}

export const GroupRulesManagerModal: React.FC<GroupRulesManagerModalProps> = ({
  rules,
  currentUser,
  currentDateStr,
  availableStores = [],
  merchantUsers = [],
  onClose,
  onRulesUpdated
}) => {
  const [storeName, setStoreName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [applyAllDates, setApplyAllDates] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(currentDateStr || new Date().toISOString().slice(0, 10));
  const [matchType, setMatchType] = useState<'exact' | 'prefix'>('exact');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStore = storeName.trim();
    const cleanGroup = groupName.trim();
    if (!cleanStore || !cleanGroup) {
      setFeedbackMsg({ text: '묶을 상호와 대표 거래처 상호를 모두 입력해주세요.', type: 'error' });
      return;
    }

    // Check duplicate rule
    const isDuplicate = rules.some(r => 
      r.storeName.trim().toLowerCase() === cleanStore.toLowerCase() && 
      r.groupName.trim().toLowerCase() === cleanGroup.toLowerCase() &&
      r.matchType === matchType
    );

    if (isDuplicate) {
      setFeedbackMsg({ text: '이미 동일한 묶기 규칙이 등록되어 있습니다.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      const newRule: CollectionGroupRule = {
        id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        storeName: cleanStore,
        groupName: cleanGroup,
        effectiveFrom: applyAllDates ? '' : effectiveFrom,
        matchType,
        createdAt: new Date().toISOString()
      };

      const updated = [...rules, newRule];
      await saveGroupRulesToFirebase(updated);
      onRulesUpdated(updated);

      setFeedbackMsg({ 
        text: `"${cleanStore}" 상호가 대표거래처 "${cleanGroup}"에 성공적으로 묶였습니다.`, 
        type: 'success' 
      });
      setStoreName('');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error('대표 거래처 규칙 저장 오류:', err);
      setFeedbackMsg({ text: '대표 거래처 규칙 저장 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, ruleDesc: string) => {
    if (!confirm(`[${ruleDesc}] 대표 거래처 묶기 규칙을 삭제하시겠습니까?`)) return;
    try {
      const updated = rules.filter(r => r.id !== id);
      await saveGroupRulesToFirebase(updated);
      onRulesUpdated(updated);
      setFeedbackMsg({ text: '규칙이 삭제되었습니다.', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error('규칙 삭제 오류:', err);
      setFeedbackMsg({ text: '규칙을 삭제하지 못했습니다.', type: 'error' });
    }
  };

  // Distinct merchant store suggestions
  const merchantStoreSuggestions = Array.from(
    new Set([
      ...merchantUsers.map(u => u.storeName).filter(Boolean),
      ...merchantUsers.map(u => u.name).filter(Boolean)
    ])
  ) as string[];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 border border-gray-800 my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-gray-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-500" />
              대표 거래처 묶기 관리
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              지점/체인점 상호들을 대표 거래처 하나로 묶어 대표 계정 로그인 시 모든 주문을 일괄 조회·관리합니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-100 p-1 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div className={`p-3 rounded-xl mb-3 text-xs font-bold flex items-center gap-2 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300' 
              : 'bg-rose-950/80 border border-rose-700 text-rose-300'
          }`}>
            {feedbackMsg.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Datalists for convenience */}
        <datalist id="groupRulesStoreList">
          {availableStores.map(s => <option key={s} value={s} />)}
        </datalist>
        <datalist id="groupRulesMerchantList">
          {merchantStoreSuggestions.map(s => <option key={s} value={s} />)}
          {availableStores.map(s => <option key={`s_${s}`} value={s} />)}
        </datalist>

        {currentUser?.role === 'admin' && (
          <form onSubmit={handleSubmit} className="mb-4 bg-gray-950 p-4 rounded-xl border border-gray-800 text-xs space-y-3">
            <div className="font-bold text-gray-200 flex items-center gap-1.5 pb-1 border-b border-gray-800 text-xs">
              <Plus className="w-3.5 h-3.5 text-violet-400" />
              <span>새 대표거래처 묶기 등록</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-300 block mb-1">
                  소속 상호 (묶일 개별 상호) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="groupRulesStoreList"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="예: 호치강남"
                  className="w-full border border-gray-700 rounded-lg p-2.5 bg-gray-900 text-gray-100 outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">주문에 입력되는 실제 상호명</p>
              </div>

              <div>
                <label className="font-bold text-gray-300 block mb-1">
                  대표 거래처 상호 (통합 관리) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="groupRulesMerchantList"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="예: 호치키스"
                  className="w-full border border-gray-700 rounded-lg p-2.5 bg-gray-900 text-gray-100 outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">로그인하여 통합 조회할 대표 상호</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="font-bold text-gray-300 block mb-1">일치 규칙</label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as 'exact' | 'prefix')}
                  className="w-full border border-gray-700 rounded-lg p-2.5 bg-gray-900 text-gray-100 outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="exact">이 상호만 (완전 일치)</option>
                  <option value="prefix">이 글자로 시작하는 모든 상호 (접두사 일치)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-300 block mb-1">적용 대상 일자</label>
                <div className="flex items-center gap-2 mb-1.5 pt-1">
                  <input
                    type="checkbox"
                    id="applyAllDatesCheck"
                    checked={applyAllDates}
                    onChange={(e) => setApplyAllDates(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-600 bg-gray-900 border-gray-700 focus:ring-violet-500"
                  />
                  <label htmlFor="applyAllDatesCheck" className="text-xs text-gray-300 cursor-pointer select-none">
                    과거 및 현재 모든 주문에 적용
                  </label>
                </div>
                {!applyAllDates && (
                  <input
                    type="date"
                    required
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="w-full border border-gray-700 rounded-lg p-2 bg-gray-900 text-gray-100 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>대표 거래처 묶기 저장 (실시간 동기화)</span>
            </button>
          </form>
        )}

        {/* List of current rules */}
        <div className="border border-gray-800 rounded-xl overflow-hidden text-xs flex-1 flex flex-col">
          <div className="px-3.5 py-2.5 bg-gray-950 font-bold text-gray-200 border-b border-gray-800 flex items-center justify-between">
            <span>등록된 대표 거래처 묶기 목록 ({rules.length}개)</span>
            <span className="text-[11px] text-gray-400 font-normal">소속 상호 → 대표 거래처</span>
          </div>
          <div className="divide-y divide-gray-800 max-h-56 overflow-y-auto">
            {rules.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                등록된 대표 거래처 묶기 규칙이 없습니다.
                <p className="text-[11px] text-gray-600 mt-1">상단에서 소속 상호와 대표 거래처 상호를 입력하여 묶어주세요.</p>
              </div>
            ) : (
              rules.map(r => (
                <div key={r.id} className="p-3 flex items-center justify-between gap-2 hover:bg-gray-800/50 transition">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-100 flex items-center gap-1.5 flex-wrap">
                      <span className="bg-gray-800 border border-gray-700 px-2 py-0.5 rounded text-gray-200 font-mono">
                        {r.matchType === 'prefix' ? `${r.storeName}* (접두사)` : r.storeName}
                      </span>
                      <span className="text-violet-400 font-bold">→</span>
                      <span className="bg-violet-950/80 border border-violet-700 text-violet-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Store className="w-3 h-3 text-violet-400" />
                        {r.groupName}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      적용: <span className="font-mono text-gray-300">{r.effectiveFrom ? `${r.effectiveFrom} 이후` : '전체 기간 (과거/현재 주문)'}</span>
                    </div>
                  </div>
                  {!r.systemDefault && currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id, `${r.storeName} → ${r.groupName}`)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 p-1.5 rounded-lg transition"
                      title="규칙 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
