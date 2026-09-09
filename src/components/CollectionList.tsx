import React, { useState } from 'react';
import { Transaction } from '../types';
import { Layers, X, Edit3, Trash2, Plus } from 'lucide-react';
import { normalizeMarketName, formatMoney } from '../lib/firebase';

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
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={mode === 'stats' ? 5 : 6} className={`p-10 text-center ${textMuted}`}>
                    해당 조건의 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                groups.map((g, i) => {
                  const fee = mode === 'collection' ? g.completedCount * 4 : 0;
                  const balance = mode === 'collection' ? Math.max(0, (g.billed || 0) + fee - (g.paid || 0)) : 0;
                  
                  return (
                    <tr 
                      key={i} 
                      className={`${rowHover} transition cursor-pointer`}
                      onClick={() => {
                        setOrderListStore(g.store);
                        setOrderListManager(g.manager);
                        setOrderListDue(balance);
                        setShowOrderListModal(true);
                      }}
                    >
                      <td className={`p-3 font-semibold ${textSub}`}>{g.region}</td>
                      <td className={`p-3 ${textMain} font-bold`}>{g.store}</td>
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
          // For Collection mode which filters dynamically on _billingStore
          const storeRows = allTransactions.filter(t => (t as any)._billingStore === orderListStore);
          storeOrders = storeRows;
        }

        const actualOrders = storeOrders.filter(t => normalizeMarketName(t.market || '') !== '입금' && normalizeMarketName(t.market || '') !== '미수금');
        const storeCompleted = actualOrders.filter(t => (t.status || '').trim() !== '').length;
        const storeUnprocessed = actualOrders.filter(t => (t.status || '').trim() === '').length;

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

              <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-2">
                {storeOrders.length === 0 ? (
                  <div className={`text-center py-8 ${textMuted} text-sm`}>내역이 없습니다.</div>
                ) : (
                  storeOrders.map(t => {
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
                          
                          {mode === 'stats' && onOpenOrderDetail && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowOrderListModal(false);
                                onOpenOrderDetail(t);
                              }}
                              className={`px-2 py-1.5 border ${theme === 'dark' ? 'border-gray-600 bg-gray-700 text-gray-300 hover:text-indigo-400 hover:border-indigo-800 hover:bg-indigo-900/50' : 'border-slate-300 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300'} rounded text-[10px] font-bold transition whitespace-nowrap active:scale-95 cursor-pointer`}
                            >
                              수정/상세
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
