import React, { useState, useMemo } from 'react';
import { Transaction, CollectionGroupRule } from '../types';
import { Layers, X, Edit3, Trash2, Plus, ChevronDown, ChevronUp, Store, ArrowDownAZ } from 'lucide-react';
import { normalizeMarketName, formatMoney } from '../lib/firebase';
import { getSubStoresForRepresentative, sortStoreGroupsBySubStoreClick, sortTransactionsBySubStoreClick } from '../lib/groupRules';

export interface StoreGroup {
  store: string;
  region: string;
  manager: string;
  orderCount: number;
  completedCount: number;
  unprocessedCount: number;
  
  // For Stats
  totalExpense?: number;
  totalIncome?: number;
  totalItemCount?: number;
  
  // For Collection
  billed?: number;
  paid?: number;
  
  orders?: Transaction[];
}

interface CollectionListProps {
  groups: StoreGroup[];
  allTransactions?: Transaction[]; // alternative to orders in group, used to filter on the fly
  collectionGroupRules?: CollectionGroupRule[];
  mode: 'collection' | 'stats';
  theme: 'light' | 'dark';
  
  onOpenOrderDetail?: (transaction: Transaction) => void;
  onToggleComplete?: (transactionId: string) => void;
  onAddCollection?: (storeName: string, manager: string, due: number) => void;
  onEditDeposit?: (transaction: Transaction) => void;
  onDeleteDeposit?: (transactionId: string) => void;
}

export const CollectionList: React.FC<CollectionListProps> = ({
  groups,
  allTransactions,
  collectionGroupRules = [],
  mode,
  theme,
  onOpenOrderDetail,
  onToggleComplete,
  onAddCollection,
  onEditDeposit,
  onDeleteDeposit
}) => {
  const [showOrderListModal, setShowOrderListModal] = useState(false);
  const [orderListStore, setOrderListStore] = useState("");
  const [orderListManager, setOrderListManager] = useState("");
  const [orderListDue, setOrderListDue] = useState(0);
  const [selectedSubFilter, setSelectedSubFilter] = useState<string | null>(null);
  const [selectedSubSortStore, setSelectedSubSortStore] = useState<string | null>(null);
  const [expandedSubStoreRows, setExpandedSubStoreRows] = useState<Record<string, boolean>>({});

  const toggleSubRow = (storeName: string) => {
    setExpandedSubStoreRows(prev => ({ ...prev, [storeName]: !prev[storeName] }));
  };

  // Sort groups based on clicked subordinate store
  const sortedGroups = useMemo(() => {
    if (!selectedSubSortStore) return groups;
    return sortStoreGroupsBySubStoreClick(groups, selectedSubSortStore, collectionGroupRules);
  }, [groups, selectedSubSortStore, collectionGroupRules]);

  // Theme configuration
  const bgMain = theme === 'dark' ? 'bg-gray-900' : 'bg-white';
  const borderMain = theme === 'dark' ? 'border-gray-800' : 'border-slate-200';
  const textMain = theme === 'dark' ? 'text-gray-100' : 'text-slate-800';
  const textMuted = theme === 'dark' ? 'text-gray-400' : 'text-slate-500';
  const bgHeader = theme === 'dark' ? 'bg-gray-800/50' : 'bg-slate-50';
  const borderDiv = theme === 'dark' ? 'divide-gray-800' : 'divide-slate-200';
  const rowHover = theme === 'dark' ? 'hover:bg-indigo-900/30' : 'hover:bg-indigo-50/50';
  const textSub = theme === 'dark' ? 'text-gray-300' : 'text-slate-600';
  const textTableHead = theme === 'dark' ? 'text-gray-400' : 'text-slate-500';
  const bgModal = theme === 'dark' ? 'bg-gray-900' : 'bg-white';
  const bgOverlay = theme === 'dark' ? 'bg-black/60' : 'bg-slate-900/60';
  const borderModal = theme === 'dark' ? 'border-gray-700' : 'border-slate-200';
  
  return (
    <>
      {selectedSubSortStore && (
        <div className={`mb-3 p-2.5 rounded-xl border flex items-center justify-between text-xs animate-fadeIn shadow-sm ${
          theme === 'dark' ? 'bg-violet-950/40 border-violet-800 text-violet-200' : 'bg-violet-50 border-violet-200 text-violet-900'
        }`}>
          <div className="flex items-center gap-2 font-bold min-w-0">
            <ArrowDownAZ className="w-4 h-4 text-violet-500 shrink-0" />
            <span className="truncate">
              종속거래처 <span className="underline decoration-violet-400">'{selectedSubSortStore}'</span> 기준 정렬 활성화 (1순위: 동일 대표거래처 최상단, 2순위: 상호 오름차순)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedSubSortStore(null)}
            className={`px-2 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              theme === 'dark' ? 'hover:bg-violet-900 text-violet-300' : 'hover:bg-violet-200 text-violet-800'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            정렬 초기화
          </button>
        </div>
      )}

      <div className={`${bgMain} border ${borderMain} rounded-xl shadow-lg overflow-hidden pb-4 mb-24`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-sm ${textSub}`}>
            <thead className={`${bgHeader} border-b ${borderMain} text-xs ${textTableHead}`}>
              <tr>
                <th className="p-3 font-semibold">상가</th>
                <th className="p-3 font-semibold">상호</th>
                <th className="p-3 font-semibold text-center">주문 건수</th>
                {mode === 'stats' && (
                  <>
                    <th className="p-3 font-semibold text-right">대납 합계</th>
                    <th className="p-3 font-semibold text-right">물건 갯수</th>
                  </>
                )}
                {mode === 'collection' && (
                  <>
                    <th className="p-3 font-semibold text-right">청구액(수수료포함)</th>
                    <th className="p-3 font-semibold text-right">수금액</th>
                    <th className="p-3 font-semibold text-right">미수금</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className={`divide-y ${borderDiv}`}>
              {sortedGroups.length === 0 ? (
                <tr>
                  <td colSpan={mode === 'stats' ? 5 : 6} className={`p-10 text-center ${textMuted}`}>
                    해당 조건의 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedGroups.map((g, i) => {
                  const fee = mode === 'collection' ? g.completedCount * 4 : 0;
                  const balance = mode === 'collection' ? Math.max(0, (g.billed || 0) + fee - (g.paid || 0)) : 0;
                  const subStores = getSubStoresForRepresentative(g.store, collectionGroupRules);
                  const isExpanded = !!expandedSubStoreRows[g.store];
                  
                  // Compute orders belonging to this store group
                  let groupAllOrders: Transaction[] = [];
                  if (mode === 'stats' && g.orders) {
                    groupAllOrders = g.orders;
                  } else if (allTransactions) {
                    groupAllOrders = allTransactions.filter(t => (t as any)._billingStore === g.store || t.store === g.store);
                  }

                  return (
                    <React.Fragment key={i}>
                      <tr 
                        className={`${rowHover} transition cursor-pointer`}
                        onClick={() => {
                          setOrderListStore(g.store);
                          setOrderListManager(g.manager);
                          setOrderListDue(balance);
                          setSelectedSubFilter(null);
                          setShowOrderListModal(true);
                        }}
                      >
                        <td className={`p-3 font-semibold ${textSub}`}>{g.region}</td>
                        <td className={`p-3 ${textMain} font-bold`}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{g.store}</span>
                            {subStores.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSubRow(g.store);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] bg-violet-950/80 hover:bg-violet-900 text-violet-200 border border-violet-700/80 px-2 py-0.5 rounded-md font-bold transition shadow-2xs"
                                title="종속 거래처 목록 펼치기/접기"
                              >
                                <Layers className="w-3 h-3 text-violet-400" />
                                <span>종속 {subStores.length}곳</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className={`font-bold ${textMain}`}>{g.orderCount}건</div>
                          <div className="text-[10px] flex items-center justify-center gap-1 mt-0.5 whitespace-nowrap">
                            <span className={theme === 'dark' ? 'text-emerald-400 font-semibold' : 'text-emerald-600 font-semibold'}>완료 {g.completedCount}</span>
                            <span className={theme === 'dark' ? 'text-gray-600' : 'text-slate-300'}>/</span>
                            <span className={theme === 'dark' ? 'text-amber-500 font-semibold' : 'text-amber-600 font-semibold'}>미처리 {g.unprocessedCount}</span>
                          </div>
                        </td>
                        {mode === 'stats' && (
                          <>
                            <td className="p-3 text-right text-rose-400 font-mono">{formatMoney(g.totalExpense || 0)}</td>
                            <td className={theme === 'dark' ? "p-3 text-right text-emerald-400 font-bold" : "p-3 text-right text-emerald-600 font-bold"}>{(g.totalItemCount || 0)}개</td>
                          </>
                        )}
                        {mode === 'collection' && (
                          <>
                            <td className="p-3 text-right">
                              <div className="text-rose-600 font-mono">{formatMoney(g.billed || 0)}</div>
                              {fee > 0 && <div className="text-[10px] text-indigo-500 font-sans">+사입비 {formatMoney(fee)}</div>}
                            </td>
                            <td className="p-3 text-right text-emerald-600 font-mono">{formatMoney(g.paid || 0)}</td>
                            <td className={`p-3 text-right font-bold font-mono text-sm ${balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                              {formatMoney(balance)}
                            </td>
                          </>
                        )}
                      </tr>

                      {/* Subordinate Store Child Rows */}
                      {isExpanded && subStores.length > 0 && subStores.map(subName => {
                        const subRows = groupAllOrders.filter(t => (t.store || '').trim().toLowerCase() === subName.toLowerCase());
                        const subActualOrders = subRows.filter(t => normalizeMarketName(t.market || '') !== '입금' && normalizeMarketName(t.market || '') !== '미수금');
                        const subCompleted = subActualOrders.filter(t => (t.status || '').trim() !== '').length;
                        const subUnprocessed = subActualOrders.filter(t => (t.status || '').trim() === '').length;
                        const subExpense = subRows.filter(t => normalizeMarketName(t.market || '') !== '입금').reduce((acc, t) => acc + (mode === 'collection' ? ((t as any)._expense || 0) : Number(t.expense || 0)), 0);
                        const subPaid = subRows.filter(t => normalizeMarketName(t.market || '') === '입금').reduce((acc, t) => acc + (mode === 'collection' ? ((t as any)._income || 0) : Number(t.income || 0)), 0);
                        const subItemCount = subRows.reduce((acc, t) => acc + Number(t.itemCount || 0), 0);

                        return (
                          <tr
                            key={`sub-${g.store}-${subName}`}
                            onClick={() => {
                              setSelectedSubSortStore(subName);
                              setOrderListStore(g.store);
                              setOrderListManager(g.manager);
                              setOrderListDue(balance);
                              setSelectedSubFilter(subName);
                              setShowOrderListModal(true);
                            }}
                            className={`transition cursor-pointer text-xs ${
                              theme === 'dark' ? 'bg-violet-950/20 hover:bg-violet-900/30' : 'bg-violet-50/50 hover:bg-violet-100/50'
                            }`}
                          >
                            <td className="p-2.5 pl-6 text-gray-500 font-mono">
                              ↳
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1.5">
                                <Store className="w-3 h-3 text-cyan-400" />
                                <span className={`font-semibold ${theme === 'dark' ? 'text-violet-200' : 'text-violet-900'}`}>
                                  {subName}
                                </span>
                                <span className="text-[10px] text-gray-400 bg-gray-800/80 px-1 rounded">
                                  종속
                                </span>
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="font-bold">{subActualOrders.length}건</span>
                              <span className="text-[10px] text-gray-400 ml-1.5">
                                (완료 {subCompleted} / 미처리 {subUnprocessed})
                              </span>
                            </td>
                            {mode === 'stats' && (
                              <>
                                <td className="p-2.5 text-right font-mono text-rose-400">
                                  {formatMoney(subExpense)}
                                </td>
                                <td className="p-2.5 text-right font-bold text-emerald-400">
                                  {subItemCount}개
                                </td>
                              </>
                            )}
                            {mode === 'collection' && (
                              <>
                                <td className="p-2.5 text-right font-mono text-rose-400">
                                  {formatMoney(subExpense)}
                                </td>
                                <td className="p-2.5 text-right font-mono text-emerald-400">
                                  {formatMoney(subPaid)}
                                </td>
                                <td className="p-2.5 text-right text-gray-400 font-mono">
                                  -
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showOrderListModal && (() => {
        let storeOrders: Transaction[] = [];
        let matchedGroup = groups.find(g => g.store === orderListStore);
        
        if (mode === 'stats' && matchedGroup?.orders) {
          storeOrders = matchedGroup.orders;
        } else if (allTransactions) {
          // For Collection mode which filters dynamically on _billingStore or direct store
          const storeRows = allTransactions.filter(t => (t as any)._billingStore === orderListStore || t.store === orderListStore);
          storeOrders = storeRows;
        }

        const actualOrders = storeOrders.filter(t => normalizeMarketName(t.market || '') !== '입금' && normalizeMarketName(t.market || '') !== '미수금');
        const storeCompleted = actualOrders.filter(t => (t.status || '').trim() !== '').length;
        const storeUnprocessed = actualOrders.filter(t => (t.status || '').trim() === '').length;

        // Subordinate stores for orderListStore
        const subStoresFromRules = getSubStoresForRepresentative(orderListStore, collectionGroupRules);
        const presentSubStores = Array.from(new Set(
          storeOrders
            .map(t => (t.store || '').trim())
            .filter(s => s && s.toLowerCase() !== orderListStore.toLowerCase())
        ));
        const allSubStores = Array.from(new Set([...subStoresFromRules, ...presentSubStores]));

        // Filtered orders by selected subordinate filter
        const rawFiltered = selectedSubFilter
          ? storeOrders.filter(t => (t.store || '').trim().toLowerCase() === selectedSubFilter.toLowerCase())
          : storeOrders;

        // Sort orders: 1순위 동일 대표거래처 최상단, 2순위 개별 상호명 가나다순 오름차순
        const displayedOrders = sortTransactionsBySubStoreClick(
          rawFiltered,
          selectedSubFilter || selectedSubSortStore || orderListStore,
          collectionGroupRules
        );

        // Modal Theme values
        const mTextMain = theme === 'dark' ? 'text-white' : 'text-slate-900';
        const mTextIcon = theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-slate-400 hover:text-slate-700';
        
        // Transaction Item Theme
        const tBgCompleted = theme === 'dark' ? 'border-emerald-800 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50/20';
        const tBgPending = theme === 'dark' ? 'border-gray-700 hover:bg-gray-700/50' : 'border-slate-200 hover:bg-slate-50';
        
        const mDepositBadge = theme === 'dark' ? 'bg-emerald-900/60 text-emerald-400' : 'bg-emerald-100 text-emerald-700';
        const mOrderBadge = theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-slate-100 text-slate-600';
        
        const mStatusCompleted = theme === 'dark' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-700 border border-emerald-300';
        const mStatusPending = theme === 'dark' ? 'bg-amber-950 text-amber-500 border border-amber-800' : 'bg-amber-100 text-amber-700 border border-amber-300';
        
        const mFloorBadge = theme === 'dark' ? 'text-gray-400 bg-gray-900' : 'text-slate-500 bg-slate-100';
        const mStoreName = theme === 'dark' ? 'text-gray-100' : 'text-slate-800';
        
        const mRemark = theme === 'dark' ? 'text-amber-200 bg-amber-950 border border-amber-900' : 'text-amber-700 bg-amber-50 border border-amber-100';

        const mToggleBtnCompleted = theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-amber-900/50 hover:text-amber-400' : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800';
        const mToggleBtnPending = theme === 'dark' ? 'bg-emerald-700 text-white hover:bg-emerald-600' : 'bg-emerald-600 text-white hover:bg-emerald-500';

        return (
          <div className={`fixed inset-0 ${bgOverlay} backdrop-blur-sm z-[180] flex items-center justify-center p-3 sm:p-4 overflow-y-auto`}>
            <div className={`${bgModal} rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden p-5 border ${borderModal} my-auto flex flex-col max-h-[90vh]`}>
              <div className={`flex items-center justify-between mb-4 border-b ${borderModal} pb-3 shrink-0`}>
                <div>
                  <h3 className={`text-lg font-black ${mTextMain} flex items-center gap-2`}>
                    <Layers className="w-5 h-5 text-indigo-400" />
                    {orderListStore} 상세 내역
                  </h3>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span className={theme === 'dark' ? "text-emerald-400 font-semibold" : "text-emerald-600 font-semibold"}>완료 {storeCompleted}건</span>
                    <span className={theme === 'dark' ? "text-gray-600" : "text-slate-300"}>·</span>
                    <span className={theme === 'dark' ? "text-amber-400 font-semibold" : "text-amber-600 font-semibold"}>미처리 {storeUnprocessed}건</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mode === 'collection' && onAddCollection && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOrderListModal(false);
                        onAddCollection(orderListStore, orderListManager, orderListDue);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      수금하기
                    </button>
                  )}
                  <button type="button" onClick={() => setShowOrderListModal(false)} className={`${mTextIcon} p-1`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Subordinate Store Filter Chips */}
              {allSubStores.length > 0 && (
                <div className={`mb-3 p-2.5 rounded-xl border shrink-0 ${
                  theme === 'dark' ? 'bg-violet-950/40 border-violet-800/70' : 'bg-violet-50 border-violet-200'
                }`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-xs font-bold flex items-center gap-1 ${
                      theme === 'dark' ? 'text-violet-300' : 'text-violet-900'
                    }`}>
                      <Layers className="w-3.5 h-3.5 text-violet-400" />
                      연결된 종속 거래처 ({allSubStores.length}곳)
                    </span>
                    <span className="text-[10px] text-gray-400">클릭하여 해당 거래처 내역만 필터링</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedSubFilter(null)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        selectedSubFilter === null 
                          ? 'bg-violet-600 text-white shadow' 
                          : theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      전체 보기 ({storeOrders.length}건)
                    </button>
                    {allSubStores.map(subName => {
                      const count = storeOrders.filter(t => (t.store || '').trim().toLowerCase() === subName.toLowerCase()).length;
                      const isSelected = selectedSubFilter === subName;
                      return (
                        <button
                          key={subName}
                          type="button"
                          onClick={() => setSelectedSubFilter(isSelected ? null : subName)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-violet-600 text-white shadow' 
                              : theme === 'dark'
                              ? 'bg-violet-950/80 text-violet-200 border border-violet-700/70 hover:bg-violet-900/60'
                              : 'bg-violet-100 text-violet-800 border border-violet-200 hover:bg-violet-200'
                          }`}
                        >
                          <Store className="w-3 h-3 text-cyan-400" />
                          <span>{subName}</span>
                          <span className="text-[10px] opacity-80">({count}건)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-2">
                {displayedOrders.length === 0 ? (
                  <div className={`text-center py-8 ${textMuted} text-sm`}>
                    {selectedSubFilter ? `'${selectedSubFilter}'에 대한 내역이 없습니다.` : '내역이 없습니다.'}
                  </div>
                ) : (
                  displayedOrders.map(t => {
                    const isDeposit = normalizeMarketName(t.market || '') === '입금';
                    const isCompleted = (t.status || '').trim() !== '';
                    const expense = mode === 'collection' ? (t as any)._expense : Number(t.expense);
                    const income = mode === 'collection' ? (t as any)._income : Number(t.income);

                    return (
                      <div
                        key={t.id}
                        className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 transition ${
                          isCompleted ? tBgCompleted : tBgPending
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            isDeposit ? mDepositBadge : mOrderBadge
                          }`}>
                            {t.market}
                          </span>
                          {!isDeposit && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              isCompleted ? mStatusCompleted : mStatusPending
                            }`}>
                              {isCompleted ? '완료' : '미처리'}
                              {t.status && t.status !== '완료' && t.status !== '미처리' ? ` (${t.status})` : ''}
                            </span>
                          )}
                          {(t.floor || t.room) && (
                            <span className={`text-[11px] font-medium shrink-0 ${mFloorBadge} px-1.5 py-0.5 rounded`}>
                              {t.floor}{t.floor && t.room ? '-' : ''}{t.room}
                            </span>
                          )}
                          <span className={`text-[13px] font-bold ${mStoreName} shrink-0`}>
                            {t.store || '상호 없음'}
                          </span>
                          {t.store && orderListStore && t.store.trim().toLowerCase() !== orderListStore.trim().toLowerCase() && (
                            <span className="text-[10px] bg-violet-900/60 text-violet-200 border border-violet-700/60 px-1.5 py-0.5 rounded font-bold shrink-0">
                              종속: {t.store}
                            </span>
                          )}
                          {(t.remark || t.processingRemark) && (
                            <span className={`text-[11px] truncate ${mRemark} px-1.5 py-0.5 rounded ml-1`}>
                              {[t.remark, t.processingRemark].filter(Boolean).join(' | ')}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          {mode === 'stats' && (
                            <div className="flex flex-col items-end">
                               <span className={`text-[10px] ${textMuted} font-bold mb-0.5`}>물건갯수</span>
                               <span className={`text-sm font-black ${mTextMain}`}>{t.itemCount || 0}</span>
                            </div>
                          )}
                          <div className="font-bold font-mono text-[13px] text-right min-w-[60px]">
                            {expense > 0 ? (
                              <span className={theme === 'dark' ? "text-rose-400" : "text-rose-600"}>{formatMoney(expense)}</span>
                            ) : income > 0 ? (
                              <span className={theme === 'dark' ? "text-emerald-400" : "text-emerald-600"}>+{formatMoney(income)}</span>
                            ) : (
                              <span className={theme === 'dark' ? "text-gray-500" : "text-slate-400"}>0</span>
                            )}
                          </div>
                          
                          {!isDeposit && onOpenOrderDetail && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowOrderListModal(false);
                                onOpenOrderDetail(t);
                              }}
                              className={`px-2 py-1.5 border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-300 hover:text-indigo-400 hover:border-indigo-800 hover:bg-indigo-900/50' : 'border-slate-300 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'} rounded text-[10px] font-bold transition whitespace-nowrap active:scale-95 cursor-pointer`}
                              title="주문 확인 및 수정"
                            >
                              주문확인
                            </button>
                          )}

                          {mode === 'collection' && !isDeposit && onToggleComplete && (
                            <button
                              type="button"
                              onClick={() => onToggleComplete(t.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow-sm ${
                                isCompleted ? mToggleBtnCompleted : mToggleBtnPending
                              }`}
                              title={isCompleted ? '미처리로 변경' : '완료 처리'}
                            >
                              {isCompleted ? '미처리 전환' : '완료 처리'}
                            </button>
                          )}

                          {mode === 'collection' && isDeposit && (
                            <div className="flex items-center gap-1">
                              {onEditDeposit && (
                                <button type="button" onClick={() => {
                                  setShowOrderListModal(false);
                                  onEditDeposit(t);
                                }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="수금 금액 수정">
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onDeleteDeposit && (
                                <button type="button" onClick={() => {
                                  setShowOrderListModal(false);
                                  onDeleteDeposit(t.id);
                                }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="수금 내역 삭제">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                          
                          {mode === 'collection' && (
                            <div className={`text-[11px] ${textSub} font-medium ${theme === 'dark' ? 'bg-gray-800' : 'bg-slate-100'} px-2 py-0.5 rounded text-right shrink-0`} title="사입담당">
                              {t.actualManager || t.manager || t.originalManager || '-'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};
