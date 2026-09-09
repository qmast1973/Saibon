import React, { useState, useMemo } from 'react';
import { Transaction, User } from '../types';
import { formatMoney } from '../lib/firebase';
import { Table, Edit3, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface FullLedgerViewProps {
  transactions: Transaction[];
  currentUser: User | null;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const FullLedgerView: React.FC<FullLedgerViewProps> = React.memo(({
  transactions,
  currentUser,
  onEditTransaction,
  onDeleteTransaction
}) => {
  const isMerchant = currentUser?.role === 'merchant';
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));

  // Reset to page 1 if current page is out of bounds
  const validPage = Math.min(currentPage, totalPages);

  const paginatedTransactions = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, validPage, pageSize]);

  return (
    <section id="tableViewSection" className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
              <Table className="w-5 h-5" />
            </span>
            전체 사입·대납 원장 내역
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            등록된 모든 주문 및 사입, 입금 내역을 표 형태로 확인하고 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>표시:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={25}>25개씩</option>
              <option value={50}>50개씩</option>
              <option value={100}>100개씩</option>
              <option value={200}>200개씩</option>
            </select>
          </div>
          <span id="tableTotalRows" className="text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
            총 {transactions.length.toLocaleString()}건
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto border border-slate-200 rounded-xl max-h-[550px]">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 shadow-xs">
            <tr>
              <th className="p-3 border-b border-slate-200 whitespace-nowrap">날짜</th>
              <th className="p-3 border-b border-slate-200 whitespace-nowrap">담당자</th>
              <th className="p-3 border-b border-slate-200 whitespace-nowrap">지역</th>
              <th className="p-3 border-b border-slate-200 font-bold text-slate-900 whitespace-nowrap">소매상호</th>
              <th className="p-3 border-b border-slate-200 whitespace-nowrap">건물명/층/호</th>
              <th className="p-3 border-b border-slate-200 text-right text-rose-600 whitespace-nowrap">대납금</th>
              <th className="p-3 border-b border-slate-200 text-right text-blue-600 whitespace-nowrap">입금액</th>
              <th className="p-3 border-b border-slate-200 text-center whitespace-nowrap">상태</th>
              <th className="p-3 border-b border-slate-200">비고</th>
              <th className="p-3 border-b border-slate-200 text-center whitespace-nowrap">관리</th>
            </tr>
          </thead>
          <tbody id="fullTableBody" className="divide-y divide-slate-200">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-10 text-center text-slate-400 text-xs">
                  조건에 일치하는 원장 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              paginatedTransactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition text-xs">
                  <td className="p-3 text-slate-600 whitespace-nowrap font-mono">{t.date || '-'}</td>
                  <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">{t.manager || '-'}</td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{t.region || '-'}</td>
                  <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{t.store || '-'}</td>
                  <td className="p-3 text-slate-600 whitespace-nowrap">
                    <b>{t.market || ''}</b> {String(t.floor || '').replace(/층$/, '') ? `${String(t.floor || '').replace(/층$/, '')}층` : ''} {String(t.room || '').replace(/호$/, '') ? `${String(t.room || '').replace(/호$/, '')}호` : ''}
                  </td>
                  <td className="p-3 text-right font-semibold text-rose-600 whitespace-nowrap font-mono">
                    {formatMoney(t.expense)}
                  </td>
                  <td className="p-3 text-right font-semibold text-blue-600 whitespace-nowrap font-mono">
                    {formatMoney(t.income)}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${t.status ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {t.status || '처리 대기'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 max-w-xs truncate">
                    {[t.remark, t.processingRemark].filter(Boolean).join(' | ') || '-'}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onEditTransaction(t)}
                      className="text-indigo-600 hover:text-indigo-800 p-1 mr-1"
                      title="수정"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!isMerchant && (
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(t.id)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 mt-2 text-xs">
          <div className="text-slate-500 font-medium">
            전체 <b>{transactions.length.toLocaleString()}</b>건 중 {((validPage - 1) * pageSize + 1).toLocaleString()} - {Math.min(validPage * pageSize, transactions.length).toLocaleString()}건 표시
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition"
              title="첫 페이지"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition"
              title="이전 페이지"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2.5 py-1 text-slate-700 font-semibold text-xs">
              <b className="text-indigo-600">{validPage}</b> / {totalPages} 페이지
            </span>

            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition"
              title="다음 페이지"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition"
              title="마지막 페이지"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
});
