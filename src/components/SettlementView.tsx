import React, { useState, useMemo, useCallback } from 'react';
import { Transaction, CollectionGroupRule } from '../types';
import { formatMoney, normalizeMarketName } from '../lib/firebase';
import { HandCoins, Search, ChevronDown, ChevronUp, Layers, Store } from 'lucide-react';

interface SettlementViewProps {
  transactions: Transaction[];
  collectionGroupRules: CollectionGroupRule[];
  onOpenOrderDetail: (id: string) => void;
  onOpenGroupManager: () => void;
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  transactions,
  collectionGroupRules,
  onOpenOrderDetail,
  onOpenGroupManager
}) => {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Rule lookup map
  const getCollectionBillingStore = useCallback((store: string) => {
    const name = String(store || '').trim();
    if (!name) return name;
    const matched = (collectionGroupRules || []).filter(rule => {
      const ruleStore = String(rule.storeName || '').trim();
      return rule.matchType === 'prefix' ? name.startsWith(ruleStore) : name === ruleStore;
    }).sort((a, b) => String(b.effectiveFrom || '').localeCompare(String(a.effectiveFrom || '')));
    return matched.length ? String(matched[0].groupName || name).trim() : name;
  }, [collectionGroupRules]);

  const getKoreanInitials = (value: string) => {
    const choseong = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    return Array.from(String(value || '')).map(char => {
      const code = char.charCodeAt(0) - 44032;
      return code >= 0 && code < 11172 ? choseong[Math.floor(code / 588)] : char;
    }).join('');
  };

  const matchesQuery = (text: string, query: string) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    const target = String(text || '').toLowerCase();
    return target.includes(needle) || getKoreanInitials(text).includes(needle);
  };

  const rows = useMemo(() => {
    return transactions.map(t => {
      const rawExpense = Number(t.expense) || 0;
      const rawIncome = Number(t.income) || 0;
      const billed = rawExpense > 0 ? rawExpense : 0;
      const paid = (rawExpense < 0 ? Math.abs(rawExpense) : 0) + (rawIncome > 0 ? rawIncome : 0);
      return {
        ...t,
        _region: String(t.region || '미지정').trim() || '미지정',
        _manager: String(t.localManager || t.originalManager || t.manager || '미지정').trim() || '미지정',
        _store: String(t.store || '미지정').trim() || '미지정',
        _billingStore: getCollectionBillingStore(t.store),
        _expense: billed,
        _income: paid
      };
    });
  }, [transactions, getCollectionBillingStore]);

  const ledgerRows = useMemo(() => {
    return rows.filter(t => normalizeMarketName(t.market || '') !== '미수금');
  }, [rows]);

  const regions: string[] = useMemo(() => ([...new Set(rows.map(t => t._region))] as string[]).sort((a, b) => a.localeCompare(b, 'ko')), [rows]);
  const managers: string[] = useMemo(() => ([...new Set(rows.map(t => t._manager))] as string[]).sort((a, b) => a.localeCompare(b, 'ko')), [rows]);

  const filtered = useMemo(() => {
    return rows.filter(t => {
      const storeOk = matchesQuery(t._billingStore, search) || matchesQuery(t._store, search);
      const regionOk = !regionFilter || t._region === regionFilter;
      const managerOk = !managerFilter || t._manager === managerFilter;
      return storeOk && regionOk && managerOk;
    });
  }, [rows, search, regionFilter, managerFilter]);

  // Group by Region + Local Manager
  const groups = useMemo(() => {
    const groupMap = new Map<string, {
      region: string;
      manager: string;
      expense: number;
      income: number;
      stores: Map<string, { expense: number; income: number; count: number; rawStores: Set<string> }>;
    }>();

    filtered.filter(t => normalizeMarketName(t.market || '') !== '미수금').forEach(t => {
      const key = `${t._region}___${t._manager}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          region: t._region,
          manager: t._manager,
          expense: 0,
          income: 0,
          stores: new Map()
        });
      }
      const g = groupMap.get(key)!;
      g.expense += t._expense;
      g.income += t._income;

      const bStore = t._billingStore;
      const prev = g.stores.get(bStore) || { expense: 0, income: 0, count: 0, rawStores: new Set() };
      prev.expense += t._expense;
      prev.income += t._income;
      prev.count += 1;
      prev.rawStores.add(t._store);
      g.stores.set(bStore, prev);
    });

    return [...groupMap.values()].sort((a, b) => (b.expense - b.income) - (a.expense - a.income));
  }, [filtered]);

  return (
    <section id="settlementViewSection" className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-indigo-600" />
            거래처별 정산 및 수금 현황
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            사입·대납 데이터를 기준으로 지역별 지방 담당삼촌의 수금 대상 금액을 집계합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenGroupManager}
            className="px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 text-xs font-bold transition border border-violet-200 flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            대표 거래처 규칙
          </button>
          <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            총 {groups.length.toLocaleString()}개 그룹
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            placeholder="거래처 검색 (초성 검색 가능: ㄱㄹㄷ)"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">전체 지역</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">전체 담당삼촌</option>
          {managers.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* List Body */}
      <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-200">
        {groups.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            조건에 일치하는 정산 데이터가 없습니다.
          </div>
        ) : (
          groups.map((g, idx) => {
            const key = `${g.region}___${g.manager}`;
            const isExpanded = !!expandedGroups[key];
            const due = Math.max(0, g.expense - g.income);
            const storeList = [...g.stores.entries()].sort((a, b) => (b[1].expense - b[1].income) - (a[1].expense - a[1].income));

            return (
              <div key={idx} className="bg-white">
                <div
                  onClick={() => toggleGroup(key)}
                  className="flex items-center justify-between p-3.5 hover:bg-indigo-50/50 cursor-pointer transition text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 items-center">
                    <div>
                      <span className="text-slate-400 mr-1.5 font-normal">지역:</span>
                      <b className="text-slate-900">{g.region}</b>
                    </div>
                    <div>
                      <span className="text-slate-400 mr-1.5 font-normal">담당삼촌:</span>
                      <b className="text-violet-700">{g.manager}</b>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-slate-400 mr-1.5 font-normal">수금할 금액:</span>
                      <b className={`text-sm ${due > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{formatMoney(due)}</b>
                    </div>
                  </div>
                  <button type="button" className="ml-3 text-slate-400 hover:text-indigo-600 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-600 mb-1">거래처별 세부 내역 ({storeList.length}곳)</div>
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden">
                      {storeList.map(([bStore, data]) => {
                        const storeDue = Math.max(0, data.expense - data.income);
                        return (
                          <div key={bStore} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800">{bStore}</span>
                              <span className="text-[10px] text-slate-400 ml-2">({data.count}건)</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-rose-600 font-semibold text-[11px]">대납 {formatMoney(data.expense)}</span>
                              <span className="text-blue-600 font-semibold text-[11px]">입금 {formatMoney(data.income)}</span>
                              <span className={`font-bold text-xs ${storeDue > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                미수 {formatMoney(storeDue)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
