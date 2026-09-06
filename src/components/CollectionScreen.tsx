import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Transaction, CollectionRecord, User, CollectionGroupRule } from '../types';
import { formatMoney, normalizeMarketName, getBusinessDate } from '../lib/firebase';
import { HandCoins, Plus, Search, Layers, X, Download, Upload, Trash2, Edit3, ArrowLeft } from 'lucide-react';

interface CollectionScreenProps {
  transactions: Transaction[];
  collections: CollectionRecord[];
  currentUser: User | null;
  users: User[];
  collectionGroupRules: CollectionGroupRule[];
  onClose: () => void;
  onSaveCollection: (collection: CollectionRecord | CollectionRecord[]) => void;
  onOpenGroupManager?: () => void;
  onResetCollectionData?: () => void;
  onResetAllData?: () => void;
  onOpenOrderDetail?: (id: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onUpdateTransaction?: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onToggleComplete?: (id: string) => void;
  initialDate?: string;
}

export const CollectionScreen: React.FC<CollectionScreenProps> = React.memo(({
  transactions,
  collections,
  currentUser,
  users,
  collectionGroupRules,
  onClose,
  onSaveCollection,
  onOpenGroupManager,
  onResetCollectionData,
  onResetAllData,
  onOpenOrderDetail,
  onEditTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onToggleComplete,
  initialDate
}) => {
  const [dateFilter, setDateFilter] = useState(initialDate || '');
  const [hasAutoSetDate, setHasAutoSetDate] = useState(!!initialDate);

  const [storeFilter, setStoreFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showOrderListModal, setShowOrderListModal] = useState(false);
  const [orderListStore, setOrderListStore] = useState("");
  const [orderListManager, setOrderListManager] = useState("");
  const [orderListDue, setOrderListDue] = useState(0);

  // Edit/Delete state for deposit records
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editTxInfo, setEditTxInfo] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");

  // Collection entry state
  const [entryStore, setEntryStore] = useState('');
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [entryAmount, setEntryAmount] = useState<number | string>('');
  const [entryDeposit, setEntryDeposit] = useState<number | string>('');
  const [entryDue, setEntryDue] = useState<number>(0);
  const [entryDate, setEntryDate] = useState('');
  const [entryManager, setEntryManager] = useState('');
  const [entryNote, setEntryNote] = useState('');

  const isAdmin = currentUser?.role === 'admin';

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

  // Memoized filter rows
  useEffect(() => {
    if (!hasAutoSetDate && transactions.length > 0) {
      const dates = transactions.map(r => r.date).filter(Boolean).sort();
      if (dates.length > 0) {
        setDateFilter(dates[dates.length - 1]);
        setHasAutoSetDate(true);
      }
    }
  }, [transactions, hasAutoSetDate]);

  const ledgerRows = useMemo(() => {
    if (!dateFilter) return [];
    
    return transactions
      .filter(t => t.date === dateFilter && normalizeMarketName(t.market || '') !== '미수금')
      .map(t => {
        const rawExpense = Number(t.expense) || 0;
        const rawIncome = Number(t.income) || 0;
        const billed = rawExpense > 0 ? rawExpense : 0;
        const paid = (rawExpense < 0 ? Math.abs(rawExpense) : 0) + (rawIncome > 0 ? rawIncome : 0);
        const buyerName = String(t.actualManager || t.manager || t.originalManager || '').trim() || '미지정';
        return {
          ...t,
          _region: String(t.region || '미지정').trim() || '미지정',
          _manager: String(t.localManager || t.originalManager || t.manager || '미지정').trim() || '미지정',
          _buyer: buyerName,
          _store: String(t.store || '미지정').trim() || '미지정',
          _billingStore: getCollectionBillingStore(t.store),
          _expense: billed,
          _income: paid
        };
      });
  }, [transactions, dateFilter, getCollectionBillingStore]);

  const totalBilled = useMemo(() => ledgerRows.reduce((a, t) => a + t._expense, 0), [ledgerRows]);
  const totalPaid = useMemo(() => ledgerRows.reduce((a, t) => a + t._income, 0), [ledgerRows]);
  const totalDue = useMemo(() => Math.max(0, totalBilled - totalPaid), [totalBilled, totalPaid]);

  const orderRows = useMemo(() => {
    return ledgerRows.filter(t => normalizeMarketName(t.market || '') !== '입금' && normalizeMarketName(t.market || '') !== '미수금');
  }, [ledgerRows]);

  const totalOrderCount = useMemo(() => orderRows.length, [orderRows]);
  const completedOrderCount = useMemo(() => orderRows.filter(t => (t.status || '').trim() !== '').length, [orderRows]);
  const unprocessedOrderCount = useMemo(() => orderRows.filter(t => (t.status || '').trim() === '').length, [orderRows]);

  // Extract unique Seoul Buyer Uncles (사입삼촌들)
  const buyerList = useMemo(() => {
    const nameSet = new Set<string>();

    // 1. Registered buyer & admin users
    users
      .filter(u => (u.role === 'buyer' || u.role === 'admin') && u.approved !== false)
      .forEach(u => {
        if (u.name && u.name.trim()) nameSet.add(u.name.trim());
        else if (u.username && u.username.trim() && u.username !== 'admin') nameSet.add(u.username.trim());
      });

    // 2. Buyer names from transaction orders (사입담당)
    transactions.forEach(t => {
      const m = String(t.actualManager || t.manager || t.originalManager || '').trim();
      if (m && m !== '미지정' && m !== 'undefined' && m !== 'null' && m !== '전체') {
        nameSet.add(m);
      }
    });

    return Array.from(nameSet).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [users, transactions]);

  const filteredRows = useMemo(() => {
    return ledgerRows.filter(t => {
      const storeOk = matchesQuery(t._billingStore, storeFilter) || matchesQuery(t._store, storeFilter);
      const buyerOk = !buyerFilter || 
        t._buyer === buyerFilter || 
        t.manager === buyerFilter || 
        t.actualManager === buyerFilter || 
        t.originalManager === buyerFilter;
      const isOrder = normalizeMarketName(t.market || '') !== '입금' && normalizeMarketName(t.market || '') !== '미수금';
      const isCompleted = (t.status || '').trim() !== '';

      let statusOk = true;
      if (statusFilter === '미처리') {
        statusOk = isOrder && !isCompleted;
      } else if (statusFilter === '완료') {
        statusOk = isOrder && isCompleted;
      } else if (statusFilter === '미수') {
        const balance = t._expense - t._income;
        statusOk = balance > 0;
      }
      return storeOk && buyerOk && statusOk;
    });
  }, [ledgerRows, storeFilter, buyerFilter, statusFilter]);

  // Group by Store (상호)
  const groupMap = useMemo(() => {
    const map = new Map<string, {
      store: string;
      region: string;
      manager: string;
      billed: number;
      paid: number;
      orderCount: number;
      completedCount: number;
      unprocessedCount: number;
    }>();

    filteredRows.forEach(t => {
      const key = t._billingStore;
      if (!map.has(key)) {
        map.set(key, {
          store: t._billingStore,
          region: t._region,
          manager: t._manager,
          billed: 0,
          paid: 0,
          orderCount: 0,
          completedCount: 0,
          unprocessedCount: 0
        });
      }
      const g = map.get(key)!;
      g.billed += t._expense;
      g.paid += t._income;
      
      const isOrder = normalizeMarketName(t.market || '') !== '입금' && normalizeMarketName(t.market || '') !== '미수금';
      if (isOrder && (t._expense > 0 || (t._expense === 0 && t._income === 0))) {
        g.orderCount += 1;
        if ((t.status || '').trim() !== '') {
          g.completedCount += 1;
        } else {
          g.unprocessedCount += 1;
        }
      }
    });

    return map;
  }, [filteredRows]);

  const groups = [...groupMap.values()].sort((a, b) => {
    const regionA = a.region || '';
    const regionB = b.region || '';
    if (regionA !== regionB) {
      return regionA.localeCompare(regionB, 'ko');
    }
    return a.store.localeCompare(b.store, 'ko');
  });

  const uniqueStores = useMemo(() => {
    const stores = new Set<string>();
    transactions.forEach(t => stores.add(getCollectionBillingStore(String(t.store || '미지정').trim() || '미지정')));
    return Array.from(stores).filter(Boolean).sort();
  }, [transactions, getCollectionBillingStore]);

  const filteredStoresForEntry = useMemo(() => {
    // Show all if empty, otherwise filter by chosung / substring
    if (!entryStore) return uniqueStores;
    return uniqueStores.filter(store => matchesQuery(store, entryStore));
  }, [uniqueStores, entryStore]);

  const handleOpenOrderList = (store: string, manager: string, due: number) => {
    setOrderListStore(store);
    setOrderListManager(manager);
    setOrderListDue(due);
    setShowOrderListModal(true);
  };

  const handleOpenEntry = (store?: string, _manager?: string, due?: number) => {
    setEntryDate(dateFilter || getBusinessDate());
    setEntryStore(store || storeFilter || '');
    
    // Always fix manager to currently logged-in user
    const currentUserName = currentUser ? (currentUser.name || currentUser.username) : '관리자';
    setEntryManager(currentUserName);
    setEntryDue(due || 0);
    setEntryAmount('');
    setEntryDeposit('');
    setEntryNote('');
    setShowEntryModal(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryStore.trim()) {
      alert('거래처를 입력해주세요.');
      return;
    }

    const depositAmount = Number(entryDeposit) || 0;
    const collectionAmount = Number(entryAmount) || 0;

    if (depositAmount <= 0 && collectionAmount <= 0) {
      alert('입금액 또는 수금액을 입력해주세요.');
      return;
    }

    const recordsToSave: CollectionRecord[] = [];

    if (depositAmount > 0) {
      recordsToSave.push({
        id: `col_dep_${Date.now()}`,
        store: entryStore.trim(),
        localManager: entryManager.trim(),
        date: entryDate || new Date().toISOString().slice(0, 10),
        amount: depositAmount,
        method: '온라인입금',
        note: entryNote.trim() ? `온라인입금 - ${entryNote.trim()}` : '온라인입금',
        createdAt: new Date().toISOString()
      });
    }

    if (collectionAmount > 0) {
      // Small delay in ID generation for uniqueness if both exist
      recordsToSave.push({
        id: `col_${Date.now() + 1}`,
        store: entryStore.trim(),
        localManager: entryManager.trim(),
        date: entryDate || new Date().toISOString().slice(0, 10),
        amount: collectionAmount,
        method: '수금',
        note: entryNote.trim(),
        createdAt: new Date().toISOString()
      });
    }

    onSaveCollection(recordsToSave);
    setShowEntryModal(false);
  };

  return (
    <div id="collectionScreen" className="fixed inset-0 w-screen h-screen bg-slate-100 z-[180] overflow-y-auto p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Top Header Card */}
        <div className="bg-indigo-900 text-white rounded-2xl shadow-lg px-4 py-4 sm:px-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-indigo-300" />
              수금관리
            </h2>
            <p className="text-[11px] text-indigo-200 mt-0.5">
              거래처별 수금 및 미수 현황을 별도로 관리하고 정산합니다.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                {onOpenGroupManager && (
                  <button
                    type="button"
                    onClick={onOpenGroupManager}
                    className="px-3 py-2 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-xs font-bold transition flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    대표 거래처 관리
                  </button>
                )}
                
                {onResetCollectionData && (
                  <button
                    type="button"
                    onClick={onResetCollectionData}
                    className="px-3 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    수금 초기화
                  </button>
                )}
                {onResetAllData && (
                  <button
                    type="button"
                    onClick={onResetAllData}
                    className="px-3 py-2 rounded-xl bg-red-900 hover:bg-red-800 text-white text-xs font-bold transition"
                  >
                    전체 주문 초기화
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              닫기
            </button>
          </div>
        </div>

        {/* 4 Metric Cards: 총 대납금, 총 주문건수, 완료건수, 미처리 건수 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <div className="text-[10px] text-slate-500 font-semibold">총 대납금</div>
            <div className="font-bold text-sm sm:text-base text-rose-600 mt-0.5 font-mono">{formatMoney(totalBilled)}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <div className="text-[10px] text-slate-500 font-semibold">총 주문건수</div>
            <div className="font-bold text-sm sm:text-base text-slate-900 mt-0.5 font-mono">{totalOrderCount}건</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <div className="text-[10px] text-slate-500 font-semibold">완료건수</div>
            <div className="font-bold text-sm sm:text-base text-emerald-600 mt-0.5 font-mono">{completedOrderCount}건</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <div className="text-[10px] text-slate-500 font-semibold">미처리 건수</div>
            <div className="font-bold text-sm sm:text-base text-amber-600 mt-0.5 font-mono">{unprocessedOrderCount}건</div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex flex-wrap gap-2.5 flex-1 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 whitespace-nowrap">기준 날짜 *</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="relative flex-1 min-w-[180px]">
                <input
                  type="text"
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  placeholder="상호 검색 (초성 가능: ㄱㄹㄷ)"
                  className="border border-slate-300 rounded-xl pl-8 pr-3 py-2 text-xs w-full bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={buyerFilter}
                onChange={(e) => setBuyerFilter(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
              >
                <option value="">전체 사입삼촌</option>
                {buyerList.map(name => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">전체 상태</option>
                <option value="미처리">미처리 건만 ({unprocessedOrderCount}건)</option>
                <option value="완료">완료 건만 ({completedOrderCount}건)</option>
                <option value="미수">미수 있음</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleOpenEntry()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-md transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              수금 입력
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {!dateFilter ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <HandCoins className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
              기준 날짜를 먼저 선택해주세요.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[620px]">
                <thead className="bg-slate-100 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3 text-left">지역</th>
                    <th className="p-3 text-left">담당 거래처</th>
                    <th className="p-3 text-center">주문 건수</th>
                    <th className="p-3 text-right">대납금</th>
                    <th className="p-3 text-right">수금금액</th>
                    <th className="p-3 text-right">수금할 금액 (미수)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        선택한 조건에 일치하는 수금 대상이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    groups.map((g, i) => {
                      const fee = g.completedCount * 4;
                      const balance = Math.max(0, g.billed + fee - g.paid);
                      return (
                        <tr 
                          key={i} 
                          className="hover:bg-indigo-50/50 transition cursor-pointer"
                          onClick={() => handleOpenOrderList(g.store, g.manager, balance)}
                        >
                          <td className="p-3 font-semibold text-slate-800">{g.region}</td>
                          <td className="p-3 text-slate-800 font-bold">{g.store}</td>
                          <td className="p-3 text-center">
                            <div className="font-bold text-slate-800">{g.orderCount}건</div>
                            <div className="text-[10px] flex items-center justify-center gap-1 mt-0.5 whitespace-nowrap">
                              <span className="text-emerald-600 font-semibold">완료 {g.completedCount}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-amber-600 font-semibold">미처리 {g.unprocessedCount}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="text-rose-600 font-mono">{formatMoney(g.billed)}</div>
                            {fee > 0 && <div className="text-[10px] text-indigo-500 font-sans">+사입비 {formatMoney(fee)}</div>}
                          </td>
                          <td className="p-3 text-right text-emerald-600 font-mono">{formatMoney(g.paid)}</td>
                          <td className={`p-3 text-right font-bold font-mono text-sm ${balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {formatMoney(balance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Collection Entry Modal */}
        {showEntryModal && (() => {
          const matchedGroup = groups.find(g => g.store === entryStore);
          const fee = matchedGroup ? matchedGroup.completedCount * 4 : 0;
          
          return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[190] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden p-5 border border-slate-200 my-auto">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-800">수금 입력</h3>
                  <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                    {entryDate} 기준 수금 등록
                  </p>
                </div>
                <button type="button" onClick={() => setShowEntryModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEntry} className="space-y-3.5 text-xs">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-indigo-900 font-bold text-sm">{entryStore || '상호명 없음'}</div>
                    <div className="text-indigo-600 font-medium text-[11px] mt-0.5 flex items-center">
                      미수금(대납금) 잔액
                      {matchedGroup && (
                        <span className="text-emerald-700 font-bold bg-emerald-100/80 px-1.5 py-0.5 rounded ml-2">
                          완료 {matchedGroup.completedCount}건
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-rose-600 font-bold text-lg font-mono">{formatMoney(entryDue)}</div>
                    {fee > 0 && (
                      <div className="text-indigo-600 font-medium text-[11px] mt-0.5 flex justify-end items-center gap-1">
                        (사입비 <span className="font-bold font-mono">{formatMoney(fee)}</span> 포함)
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block font-bold text-slate-700 mb-1">거래처 *</label>
                    <input
                      type="text"
                      required
                      value={entryStore}
                      onChange={(e) => {
                        setEntryStore(e.target.value);
                        setIsStoreDropdownOpen(true);
                      }}
                      onFocus={() => setIsStoreDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsStoreDropdownOpen(false), 200)}
                      placeholder="상호 (초성 검색)"
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none focus:bg-white"
                      autoComplete="off"
                    />
                    {isStoreDropdownOpen && filteredStoresForEntry.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredStoresForEntry.map((storeName, idx) => {
                          const grp = groupMap.get(storeName);
                          const fee = grp ? grp.completedCount * 4 : 0;
                          const balance = grp ? Math.max(0, grp.billed + fee - grp.paid) : 0;
                          
                          return (
                            <div
                              key={idx}
                              className="px-3 py-2 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setEntryStore(storeName);
                                setIsStoreDropdownOpen(false);
                                
                                if (grp) {
                                  setEntryDue(balance);
                                } else {
                                  setEntryDue(0);
                                }
                              }}
                            >
                              <span className="font-bold text-slate-800">{storeName}</span>
                              {balance > 0 && (
                                <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                                  미수 {formatMoney(balance)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">담당 (수금 등록자)</label>
                    <div className="w-full border border-slate-200 rounded-xl p-2.5 bg-slate-100 font-bold text-slate-800 text-sm flex items-center justify-between">
                      <span>{entryManager || (currentUser?.name || currentUser?.username || '관리자')}</span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {currentUser?.role === 'admin' ? '관리자' : currentUser?.role === 'local' ? '지방삼촌' : '로그인 사용자'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-1.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">온라인 입금액 (천원)</label>
                    <div className="flex items-center w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus-within:ring-2 focus-within:indigo-500 focus-within:bg-white transition">
                      <input
                        type="number"
                        min="0"
                        value={entryDeposit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEntryDeposit(val);
                          if (val && entryDue > 0) {
                            const depositNum = Number(val);
                            if (!isNaN(depositNum) && entryDue > depositNum) {
                              setEntryAmount(String(entryDue - depositNum));
                            } else if (!isNaN(depositNum) && entryDue <= depositNum) {
                              setEntryAmount('0');
                            }
                          } else if (!val) {
                            setEntryAmount('');
                          }
                        }}
                        placeholder={entryDue > 0 ? String(entryDue) : "0"}
                        className="flex-1 bg-transparent text-right text-lg font-bold text-slate-900 font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      />
                      <span className="text-slate-500 text-sm font-bold font-mono shrink-0 ml-0.5">
                        ,000원
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">수금액 (천원)</label>
                    <div className="flex items-center w-full border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition">
                      <input
                        type="number"
                        min="0"
                        value={entryAmount}
                        onChange={(e) => setEntryAmount(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-transparent text-right text-lg font-bold text-slate-900 font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      />
                      <span className="text-slate-500 text-sm font-bold font-mono shrink-0 ml-0.5">
                        ,000원
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => {
                      setEntryDeposit(entryDue);
                      setEntryAmount('0');
                    }} className="px-2.5 py-1.5 text-[11px] bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition">
                      입금 전액
                    </button>
                    <button type="button" onClick={() => {
                      setEntryAmount(entryDue);
                      setEntryDeposit('');
                    }} className="px-2.5 py-1.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition">
                      수금 전액
                    </button>
                  </div>
                  <div className="text-right text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                    처리 후 미수금:{' '}
                    <span className={`font-mono text-sm ml-1 ${entryDue - (Number(entryDeposit) || 0) - (Number(entryAmount) || 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatMoney(Math.max(0, entryDue - (Number(entryDeposit) || 0) - (Number(entryAmount) || 0)))}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">메모</label>
                  <textarea
                    rows={2}
                    value={entryNote}
                    onChange={(e) => setEntryNote(e.target.value)}
                    placeholder="수금 관련 메모 사항"
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none focus:bg-white resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowEntryModal(false)}
                    className="flex-1 border border-slate-300 rounded-xl py-2.5 font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 font-bold transition shadow-md"
                  >
                    수금 저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        );})()}


        {/* Order List Modal */}
        {showOrderListModal && (() => {
          const storeRows = filteredRows.filter(t => t._billingStore === orderListStore);
          const storeOrders = storeRows.filter(t => normalizeMarketName(t.market || '') !== '입금' && normalizeMarketName(t.market || '') !== '미수금');
          const storeCompleted = storeOrders.filter(t => (t.status || '').trim() !== '').length;
          const storeUnprocessed = storeOrders.filter(t => (t.status || '').trim() === '').length;

          return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[180] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden p-5 border border-slate-200 my-auto flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-4 border-b pb-3 shrink-0">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{orderListStore} 상세 내역</h3>
                  <div className="flex items-center gap-2 text-xs font-semibold mt-0.5">
                    <span className="text-indigo-600">{dateFilter || '선택된 날짜'}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600 font-normal">총 <strong className="text-slate-800 font-bold">{storeOrders.length}</strong>건</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-emerald-600 font-semibold">완료 {storeCompleted}건</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-amber-600 font-semibold">미처리 {storeUnprocessed}건</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderListModal(false);
                      handleOpenEntry(orderListStore, orderListManager, orderListDue);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    수금하기
                  </button>
                  <button type="button" onClick={() => setShowOrderListModal(false)} className="text-slate-400 hover:text-slate-700 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 -mx-2 px-2">
                <div className="space-y-2">
                  {storeRows
                    .sort((a, b) => {
                      const m1 = a.market || '';
                      const m2 = b.market || '';
                      if (m1 !== m2) return m1.localeCompare(m2, 'ko');
                      const f1 = a.floor || '';
                      const f2 = b.floor || '';
                      if (f1 !== f2) return f1.localeCompare(f2, 'ko');
                      return (a.room || '').localeCompare(b.room || '', 'ko');
                    })
                    .map(t => {
                      const isDeposit = normalizeMarketName(t.market || '') === '입금';
                      const isCompleted = (t.status || '').trim() !== '';

                      return (
                      <div
                        key={t.id}
                        className={`bg-white border rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 transition ${
                          isCompleted ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {/* Left: Info & Status */}
                        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {t.market}
                          </span>

                          {!isDeposit && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                : 'bg-amber-100 text-amber-700 border border-amber-300'
                            }`}>
                              {isCompleted ? '완료' : '미처리'}
                              {t.status && t.status !== '완료' && t.status !== '미처리' ? ` (${t.status})` : ''}
                            </span>
                          )}
                          
                          {(t.floor || t.room) && (
                            <span className="text-[11px] text-slate-500 font-medium shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                              {t.floor}{t.floor && t.room ? '-' : ''}{t.room}
                            </span>
                          )}

                          {t.remark && (
                            <span className="text-[11px] text-slate-500 truncate bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 ml-1">
                              {t.remark}
                            </span>
                          )}
                        </div>
                        
                        {/* Right: Amount, Complete Toggle Button & Manager */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-[10px] text-slate-400 font-mono sm:hidden">{t.date}</div>
                          
                          <div className="font-bold font-mono text-[13px] text-right min-w-[60px]">
                            {t._expense > 0 ? (
                              <span className="text-rose-600">{formatMoney(t._expense)}</span>
                            ) : t._income > 0 ? (
                              <span className="text-emerald-600">+{formatMoney(t._income)}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </div>

                          {!isDeposit && onToggleComplete && (
                            <button
                              type="button"
                              onClick={() => onToggleComplete(t.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-sm ${
                                isCompleted
                                  ? 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800'
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                              title={isCompleted ? '미처리로 변경' : '완료 처리'}
                            >
                              {isCompleted ? '미처리 전환' : '완료 처리'}
                            </button>
                          )}
                          {isDeposit && (
                            <div className="flex items-center gap-1">
                              {onUpdateTransaction && (
                                <button type="button" onClick={() => {
                                  setEditTxInfo(t);
                                  setEditAmount(String(t._income));
                                }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="수금 금액 수정">
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteTransaction && (
                                <button type="button" onClick={() => {
                                  setDeleteConfirmId(t.id);
                                }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="수금 내역 삭제">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}

                          <div className="text-[11px] text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded text-right shrink-0" title="사입담당">
                            {t.actualManager || t.manager || t.originalManager || '-'}
                          </div>
                        </div>
                      </div>
                    );})}
                  {storeRows.length === 0 && (
                     <div className="text-center py-8 text-slate-500 text-sm">
                       해당 상호의 내역이 없습니다.
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );})()}
        {/* Custom Edit Modal */}
        {editTxInfo && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
              <h3 className="font-bold text-slate-800 text-lg mb-4">입금/수금액 수정</h3>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-1">금액</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-right font-mono text-lg font-bold"
                  placeholder="금액 입력"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setEditTxInfo(null); setEditAmount(""); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newAmount = Number(editAmount);
                    if (!isNaN(newAmount) && onUpdateTransaction) {
                      onUpdateTransaction({ ...editTxInfo, income: newAmount });
                    }
                    setEditTxInfo(null);
                    setEditAmount("");
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition"
                >
                  수정하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Delete Confirm Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">수금 내역 삭제</h3>
              <p className="text-sm text-slate-500 mb-6">정말로 이 내역을 삭제하시겠습니까?<br/>삭제 후 복구할 수 없습니다.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDeleteTransaction) onDeleteTransaction(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition"
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
});
