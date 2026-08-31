import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, User } from '../types';
import { AnnouncementBanner } from './AnnouncementComponents';
import {
  normalizeMarketName,
  normalizeFloorValue,
  saveOrderToFirebase,
  normalizeDateStr,
  rtdb
} from '../lib/firebase';
import {
  Building2,
  Calendar,
  Layers,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  LogOut,
  LayoutGrid,
  Search,
  Filter,
  UserCheck,
  Plus,
  RefreshCw
} from 'lucide-react';

interface BuyerWorkdayScreenProps {
  announcement: string;
  onSaveAnnouncement: (text: string) => Promise<void>;
  currentUser: User;
  transactions: Transaction[];
  selectedDateStr: string;
  onSelectDateStr: (date: string) => void;
  onLogout: () => void;
  onStartEnteringOrder: () => void;
  onOpenAddOrder?: () => void;
  onOpenOrder: (tx: Transaction) => void;
  onTransactionsUpdated: (updated: Transaction[]) => void;
}

export const BuyerWorkdayScreen: React.FC<BuyerWorkdayScreenProps> = ({
  announcement,
  onSaveAnnouncement,
  currentUser,
  transactions,
  selectedDateStr,
  onSelectDateStr,
  onLogout,
  onStartEnteringOrder,
  onOpenAddOrder,
  onOpenOrder,
  onTransactionsUpdated
}) => {
  
  // State
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'uncompleted' | '완료' | '미송' | '반품'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filter orders for the selected date
  const dateOrders = useMemo(() => {
    return transactions.filter(t => {
      const txDate = normalizeDateStr(t.date || t.businessDate);
      return txDate === selectedDateStr;
    });
  }, [transactions, selectedDateStr]);

  // Unique buildings for dropdown
  const uniqueBuildings = useMemo(() => {
    const buildings = dateOrders
      .map(item => normalizeMarketName(item.market))
      .filter(Boolean);
    return ([...new Set(buildings)] as string[]).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [dateOrders]);

  // Unique floors based on selected building
  const uniqueFloors = useMemo(() => {
    let orders = dateOrders;
    if (selectedBuilding) {
      orders = orders.filter(item => normalizeMarketName(item.market) === selectedBuilding);
    }
    const floors = orders
      .map(item => String(item.floor || '').replace(/층$/, '').trim())
      .filter(f => f && f !== 'undefined');
    return ([...new Set(floors)] as string[]).sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }));
  }, [dateOrders, selectedBuilding]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    let list = dateOrders;

    if (selectedBuilding) {
      list = list.filter(item => normalizeMarketName(item.market) === selectedBuilding);
    }

    if (selectedFloor) {
      list = list.filter(item => {
        const cleanFloor = String(item.floor || '').replace(/층$/, '').trim();
        return cleanFloor === selectedFloor;
      });
    }

    if (statusFilter === 'uncompleted') {
      list = list.filter(item => (item.status || '').trim() !== '완료');
    } else if (statusFilter !== 'all') {
      list = list.filter(item => (item.status || '').trim() === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(item => {
        const combined = `${item.store} ${item.room} ${item.manager} ${item.remark} ${item.market}`.toLowerCase();
        return combined.includes(q);
      });
    }

    return list.sort((a, b) => {
      const mCompare = String(a.market || '').localeCompare(String(b.market || ''), 'ko');
      if (mCompare !== 0) return mCompare;

      const fA = String(a.floor || '').replace(/층$/, '');
      const fB = String(b.floor || '').replace(/층$/, '');
      const fCompare = fA.localeCompare(fB, 'ko', { numeric: true });
      if (fCompare !== 0) return fCompare;

      const rA = String(a.room || '');
      const rB = String(b.room || '');
      return rA.localeCompare(rB, 'ko', { numeric: true });
    });
  }, [dateOrders, selectedBuilding, selectedFloor, statusFilter, searchQuery]);

  // Update Status (완료 / 미송 / 반품)
  const handleUpdateStatus = async (tx: Transaction, newStatus: string) => {
    const targetStatus = tx.status === newStatus ? '' : newStatus;
    const updatedTx: Transaction = {
      ...tx,
      status: targetStatus,
      actualManager: currentUser.name || tx.actualManager || tx.manager,
      assignedManager: currentUser.name || tx.assignedManager || tx.manager
    };

    // Update local state immediately
    const updatedList = transactions.map(t => (t.id === tx.id ? updatedTx : t));
    onTransactionsUpdated(updatedList);

    // Save to Firebase RTDB
    try {
      await saveOrderToFirebase(updatedTx);
    } catch (err) {
      console.error('Firebase status update error:', err);
    }
  };

  // Update field (대납금, 메모/비고)
  const handleUpdateField = async (tx: Transaction, field: 'expense' | 'remark', value: any) => {
    const updatedTx: Transaction = {
      ...tx,
      [field]: field === 'expense' ? Number(String(value).replace(/[^0-9-]/g, '')) || 0 : String(value || ''),
      actualManager: currentUser.name || tx.actualManager || tx.manager
    };

    const updatedList = transactions.map(t => (t.id === tx.id ? updatedTx : t));
    onTransactionsUpdated(updatedList);

    try {
      await saveOrderToFirebase(updatedTx);
    } catch (err) {
      console.error('Firebase field update error:', err);
    }
  };

  // Format Excel date to YYYY-MM-DD
  const formatDateForFilter = (excelDate: any): string => {
    if (!excelDate) return '';
    let d: Date;
    if (typeof excelDate === 'number') {
      d = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    } else {
      d = new Date(excelDate);
    }
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };



  // Download Modified Final Excel
  const handleDownloadExcel = () => {
    if (filteredOrders.length === 0) {
      alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const finalExport = filteredOrders.map(order => ({
      날짜: order.date || order.businessDate || selectedDateStr,
      상호: order.store || '',
      건물명: order.market || '',
      층: order.floor || '',
      호수: order.room || '',
      담당: order.actualManager || order.assignedManager || order.manager || '',
      완료여부: order.status || '',
      대납금: order.expense || 0,
      비고: order.remark || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(finalExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '정산데이터');
    XLSX.writeFile(workbook, `사입완료_${selectedDateStr}.xlsx`);
  };

  return (
    <div id="buyerWorkdayScreen" className="fixed inset-0 z-50 overflow-y-auto bg-gray-950 text-gray-100 font-sans p-3 sm:p-4 pb-28 select-none">
      <div className="max-w-4xl mx-auto">
        
        {/* Announcement Banner */}
        <div className="mb-4 bg-white rounded-2xl overflow-hidden">
          <AnnouncementBanner announcement={announcement} currentUser={currentUser} onSave={onSaveAnnouncement} />
        </div>

        {/* Top Header & Navigation */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-blue-400 tracking-tight flex items-center gap-1.5">
                사입ON <span className="text-xs sm:text-sm font-normal px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700">실시간 동선</span>
              </h1>
              <span className="text-xs text-gray-400">({currentUser.name} 사입삼촌)</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              실시간 시장 사입, 대납금 수정, 완료/미송/반품 상태 변경 및 엑셀 결과 다운로드
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAddOrder && (
              <button
                type="button"
                onClick={onOpenAddOrder}
                className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                title="새로운 주문 입력"
              >
                <Plus className="w-3.5 h-3.5" />
                신규 주문 입력
              </button>
            )}
            <button
              type="button"
              onClick={onStartEnteringOrder}
              className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-200 py-2 px-3 rounded-lg text-xs font-bold border border-gray-700 transition flex items-center gap-1"
              title="정산 장부 및 달력 화면으로 이동"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
              장부 달력 보기
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white p-2 rounded-lg border border-gray-800 transition"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls (날짜 / 건물 / 층수) */}
        <div className="bg-gray-900 border border-gray-800 p-3 sm:p-4 rounded-xl shadow-lg mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 날짜 */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" /> 날짜
              </label>
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => {
                  onSelectDateStr(e.target.value);
                  setSelectedBuilding('');
                  setSelectedFloor('');
                }}
                className="w-full bg-gray-800 text-white border border-gray-700 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* 건물 */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-400" /> 건물
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => {
                  setSelectedBuilding(e.target.value);
                  setSelectedFloor('');
                }}
                className="w-full bg-gray-800 text-white border border-gray-700 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">전체 건물 ({uniqueBuildings.length}곳)</option>
                {uniqueBuildings.map(bldg => (
                  <option key={bldg} value={bldg}>{bldg}</option>
                ))}
              </select>
            </div>

            {/* 층수 */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> 층수
              </label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">전체 층</option>
                {uniqueFloors.map(fl => (
                  <option key={fl} value={fl}>{fl}층</option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Filter Pills & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-800 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-400 font-semibold mr-1">상태:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition border ${
                  statusFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                }`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('uncompleted')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition border ${
                  statusFilter === 'uncompleted'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                }`}
              >
                미완료만
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('완료')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition border ${
                  statusFilter === '완료'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                }`}
              >
                완료건
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('미송')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition border ${
                  statusFilter === '미송'
                    ? 'bg-yellow-600 text-white border-yellow-500'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                }`}
              >
                미송건
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('반품')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition border ${
                  statusFilter === '반품'
                    ? 'bg-rose-600 text-white border-rose-500'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                }`}
              >
                반품건
              </button>
            </div>

            <div className="relative flex-1 sm:flex-initial min-w-[160px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="상호/호수/메모 검색"
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg pl-7 pr-3 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Order Count Summary */}
        <div className="mb-3 text-xs sm:text-sm text-gray-400 flex justify-between items-center px-1">
          <span>
            필터링된 오더: <b className="text-yellow-400 text-sm sm:text-base font-black">{filteredOrders.length}</b>건
            {selectedBuilding && <span className="ml-1 text-blue-300">({selectedBuilding}{selectedFloor ? ` ${selectedFloor}층` : ''})</span>}
          </span>
          <span className="text-[11px] text-gray-500">
            총 대납 합계: <b className="text-amber-400">{filteredOrders.reduce((sum, o) => sum + (o.expense || 0), 0).toLocaleString()}원</b>
          </span>
        </div>

        {/* Orders Card List */}
        <div className="space-y-3.5">
          {filteredOrders.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl text-center text-gray-500 py-16 px-4">
              <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400">선택한 조건의 데이터가 없습니다.</p>
              <p className="text-xs text-gray-600 mt-1">상단에서 날짜를 변경하거나 '장부 달력 보기' 화면에서 수기로 추가하세요.</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const isCompleted = order.status === '완료';
              const isPending = order.status === '미송';
              const isReturn = order.status === '반품';

              return (
                <div
                  key={order.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 sm:p-4 shadow-md transition hover:border-gray-700"
                >
                  {/* Top Badge: Market / Floor / Room */}
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-3 pb-2.5 border-b border-gray-800">
                    <div className="bg-blue-950 border border-blue-600 text-cyan-200 text-sm sm:text-base font-extrabold px-3 py-1.5 rounded-lg shadow inline-flex items-center gap-1.5">
                      <span>🏢</span>
                      <span>{order.market || '건물 미지정'}</span>
                      <span className="text-yellow-300 ml-1">
                        {String(order.floor || '').replace(/층$/, '') ? `${String(order.floor || '').replace(/층$/, '')}층` : ''}
                      </span>
                      <span className="text-white ml-1 font-mono">
                        {order.room ? `${order.room}호` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-md font-bold border border-gray-700">
                        담당: {order.actualManager || order.assignedManager || order.manager || '미배정'}
                      </span>
                    </div>
                  </div>

                  {/* Store Name & Payment Input */}
                  <div className="flex justify-between items-center gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-wide truncate">
                        {order.store || '상호 미등록'}
                      </h2>
                      {order.region && (
                        <span className="text-[10px] text-violet-400 bg-violet-950/70 border border-violet-800 px-1.5 py-0.5 rounded font-bold mt-0.5 inline-block">
                          {order.region}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <label className="text-[11px] text-gray-400 mb-0.5 font-semibold">대납금</label>
                      <input
                        type="text"
                        defaultValue={order.expense ? order.expense.toLocaleString() : ''}
                        onBlur={(e) => handleUpdateField(order, 'expense', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        placeholder="금액입력"
                        className="bg-gray-800 text-amber-400 border border-gray-700 w-28 sm:w-32 p-1.5 rounded-lg text-right font-black text-sm sm:text-base outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Memo Input */}
                  <div className="mb-3">
                    <input
                      type="text"
                      defaultValue={order.remark || ''}
                      onBlur={(e) => handleUpdateField(order, 'remark', e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="특이사항 메모 (비고 입력 후 엔터 또는 다른 곳 클릭)"
                      className="w-full bg-gray-800 text-amber-300 border border-gray-700 p-2.5 rounded-lg text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                    />
                  </div>

                  {/* Status Buttons (완료 / 미송 / 반품) */}
                  <div className="flex space-x-2 pt-2 border-t border-gray-800">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order, '완료')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                        isCompleted
                          ? 'bg-green-600 border-green-500 ring-2 ring-green-400 text-white shadow-md'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      완료
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order, '미송')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                        isPending
                          ? 'bg-yellow-600 border-yellow-500 ring-2 ring-yellow-400 text-white shadow-md'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      미송
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order, '반품')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                        isReturn
                          ? 'bg-red-600 border-red-500 ring-2 ring-red-400 text-white shadow-md'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      반품
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Bottom Fixed Excel Download Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 z-50 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold shadow-lg text-sm sm:text-base transition flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            수정된 최종 엑셀 다운로드 ({selectedDateStr})
          </button>
        </div>
      </div>
    </div>
  );
};
