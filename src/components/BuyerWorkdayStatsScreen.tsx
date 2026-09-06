import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, User } from '../types';
import {
  normalizeMarketName,
  normalizeFloorValue,
  saveOrderToFirebase,
  normalizeDateStr,
  rtdb,
  formatMoney
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
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

interface BuyerWorkdayStatsScreenProps {
  currentUser: User;
  transactions: Transaction[];
  selectedDateStr: string;
  onSelectDateStr: (date: string) => void;
  onLogout: () => void;
  onStartEnteringOrder: () => void;
  onOpenAddOrder?: () => void;
  onOpenOrder: (tx: Transaction) => void;
  onUpdateTransaction: (tx: Transaction) => void;
}

export const BuyerWorkdayStatsScreen: React.FC<BuyerWorkdayStatsScreenProps> = React.memo(({
  currentUser,
  transactions,
  selectedDateStr,
  onSelectDateStr,
  onLogout,
  onStartEnteringOrder,
  onOpenAddOrder,
  onOpenOrder,
  onUpdateTransaction
}) => {
  
  // State
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeActionType, setActiveActionType] = useState<'주문' | '미송' | '반품' | null>(null);
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
      list = list.filter(item => !(item.status || '').trim());
    } else if (statusFilter === 'completed') {
      list = list.filter(item => (item.status || '').trim() !== '');
    } else if (statusFilter === 'itemCountNonZero') {
      list = list.filter(item => (Number(item.itemCount) || 0) !== 0);
    } else if (statusFilter === 'itemCountGte2') {
      list = list.filter(item => (Number(item.itemCount) || 0) >= 2);
    } else if (statusFilter === '주문/물건 없음' || statusFilter === '주문/물건없음') {
      list = list.filter(item => {
        const s = (item.status || '').trim();
        return s === '주문없음' || s === '물건없음';
      });
    } else if (statusFilter === '교환/반송') {
      list = list.filter(item => {
        const s = (item.status || '').trim();
        return s === '교환' || s === '반품/교환' || s === '반송';
      });
    } else if (statusFilter === '교환/매입') {
      list = list.filter(item => {
        const s = (item.status || '').trim();
        return s === '교환/매입' || s === '교환매입' || s === '교환 매입';
      });
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

  // Create scopeOrders that ignores statusFilter for top stats, but includes searchQuery
  const scopeOrders = useMemo(() => {
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

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(item => {
        const combined = `${item.store} ${item.room} ${item.manager} ${item.remark} ${item.market}`.toLowerCase();
        return combined.includes(q);
      });
    }
    
    return list;
  }, [dateOrders, selectedBuilding, selectedFloor, searchQuery]);

  // Workday stats calculated with user's specific business rules:
  const workdayStats = useMemo(() => {
    const totalOrderCount = scopeOrders.length;
    let completedCount = 0;
    let uncompletedCount = 0;
    let totalItemCount = 0;
    let itemCountGte2Count = 0; // 물건 갯수합계
    let allMisongCount = 0;
    let misongFindCount = 0;
    let returnOnlyCount = 0;
    let returnExchangeCount = 0;
    let exchangePurchaseCount = 0;
    let purchaseCount = 0;
    let noOrderOrItemCount = 0;
    let totalExpense = 0;

    scopeOrders.forEach(order => {
      const status = (order.status || '').trim();
      const isAnyStatus = status !== '';
      if ((Number(order.itemCount) || 0) >= 2) {
        itemCountGte2Count++;
      }

      // 주문, 미송, 반품 버튼이 누른 건은 무조건 완료로 표시하고 완료건수에 포함
      if (isAnyStatus) {
        completedCount++;
        // 물건 갯수합계: 버튼 종류와 무관하게 사용자가 입력한 숫자를 무조건 그대로 합산
        totalItemCount += Number(order.itemCount) || 0;
      } else {
        uncompletedCount++;
      }

      if (status === '올미송(결제만)') {
        allMisongCount++;
      } else if (status === '반품만') {
        returnOnlyCount++;
      } else if (status === '미송(찾기)') {
        misongFindCount++;
      } else if (status === '반품/교환' || status === '교환' || status === '반송') {
        returnExchangeCount++;
      } else if (status === '교환/매입' || status === '교환매입' || status === '교환 매입') {
        exchangePurchaseCount++;
      } else if (status === '매입처리') {
        purchaseCount++;
      } else if (status === '주문없음' || status === '물건없음') {
        noOrderOrItemCount++;
      }

      totalExpense += Number(order.expense || 0);
    });

    return {
      totalOrderCount,
      completedCount,
      uncompletedCount,
      totalItemCount,
      itemCountGte2Count,
      allMisongCount,
      misongFindCount,
      returnOnlyCount,
      returnExchangeCount,
      exchangePurchaseCount,
      purchaseCount,
      noOrderOrItemCount,
      totalExpense
    };
  }, [scopeOrders]);

  // Update Status (완료 / 미송 / 반품)
  const handleUpdateStatus = async (tx: Transaction, newStatus: string) => {
    const targetStatus = tx.status === newStatus ? '' : newStatus;

    // Business Rules for itemCount & isReturn
    let finalItemCount = tx.itemCount ?? 0;
    let isReturnFlag = tx.isReturn;

    // 교환매입인 경우 갯수는 1
    if (targetStatus === '교환매입' || targetStatus === '교환 매입' || targetStatus === '교환/매입') {
      finalItemCount = 1;
    }
    // 그룹 1: 기본값 1
    else if (['주문찾기', '샘플', '미송(찾기)', '교환', '반송', '완료', '반품/교환'].includes(targetStatus)) {
      if (!finalItemCount || finalItemCount === 0) {
        finalItemCount = 1;
      }
    } 
    // 그룹 0: 기본값 0
    else if (['주문없음', '물건없음', '올미송(결제만)', '반품만', '매입처리', '주고옴'].includes(targetStatus)) {
      if (!finalItemCount || finalItemCount === 0) {
        finalItemCount = 0;
      }
    }

    if (['반품만', '반품/교환', '교환', '반송', '교환매입', '교환 매입', '교환/매입'].includes(targetStatus)) {
      isReturnFlag = true;
    }

    const updatedTx: Transaction = {
      ...tx,
      status: targetStatus,
      itemCount: finalItemCount,
      isReturn: isReturnFlag,
      actualManager: currentUser.name || tx.actualManager || tx.manager,
      assignedManager: currentUser.name || tx.assignedManager || tx.manager
    };
        
    // Update local state immediately
    onUpdateTransaction(updatedTx);

    // Save to Firebase RTDB
    try {
      await saveOrderToFirebase(updatedTx);
    } catch (err) {
      console.error('Firebase status update error:', err);
    }
  };

  // Update field (대납금, 메모/비고)
  const handleUpdateField = async (tx: Transaction, field: 'expense' | 'remark' | 'itemCount' | 'isReturn', value: any) => {
    let updatedTx: Transaction = {
      ...tx,
      [field]: field === 'expense' ? Number(String(value).replace(/[^0-9-]/g, '')) || 0 : field === 'itemCount' ? Number(value) || 0 : field === 'isReturn' ? Boolean(value) : String(value || ''),
      actualManager: currentUser.name || tx.actualManager || tx.manager
    };

    onUpdateTransaction(updatedTx);

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



  // Download/Save Excel specifically for the selected date
  const handleExportSelectedDateExcel = () => {
    if (dateOrders.length === 0) {
      alert(`선택한 날짜(${selectedDateStr})에 저장할 데이터가 없습니다.`);
      return;
    }

    const finalExport = dateOrders.map(order => {
      const isAnyDone = !!(order.status || '').trim();
      const count = Number(order.itemCount ?? 0);
      return {
        날짜: order.date || order.businessDate || selectedDateStr,
        담당자: order.actualManager || order.assignedManager || order.manager || currentUser.name || '',
        지역: order.region || '',
        소매상호: order.store || '',
        도매건물: order.market || '',
        층: order.floor || '',
        호수: order.room || '',
        수량: count,
        대납금: Number((order.expense || 0) * 1000),
        입금액: Number((order.income || 0) * 1000),
        처리상태: isAnyDone ? order.status : '미완료',
        반품여부: order.isReturn || ['반품만', '반품/교환', '교환', '반송', '교환매입', '교환 매입', '교환/매입'].includes(order.status || '') ? 'Y' : 'N',
        비고: order.remark || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(finalExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedDateStr}_사입데이터`);
    XLSX.writeFile(workbook, `사입ON_${selectedDateStr}_사입데이터.xlsx`);
  };

  return (
    <div id="buyerWorkdayScreen" className="fixed inset-0 z-50 overflow-y-auto bg-gray-950 text-gray-100 font-sans p-3 sm:p-4 pb-12 select-none">
      <div className="max-w-4xl mx-auto">
        
        {/* Top Header & Navigation */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-blue-400 tracking-tight flex items-center gap-1.5">
                사입ON <span className="text-xs sm:text-sm font-normal px-2 py-0.5 rounded-full bg-pink-900/60 text-pink-300 border border-pink-700">갯수 집계</span>
              </h1>
              <span className="text-xs text-gray-400">({currentUser.name} 사입삼촌)</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              실시간 시장 사입, 대납금 수정, 완료/미송/반품 상태 변경 및 엑셀 결과 다운로드
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btnTopExportExcelStats"
              type="button"
              onClick={handleExportSelectedDateExcel}
              className="bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white py-2 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
              title="선택한 날짜 엑셀 데이터 저장"
            >
              <Download className="w-3.5 h-3.5" />
              <span>엑셀데이터 저장</span>
            </button>

            <button
              type="button"
              onClick={onStartEnteringOrder}
              className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-gray-200 py-2 px-3 rounded-lg text-xs font-bold border border-gray-700 transition flex items-center gap-1 cursor-pointer"
              title="달력 화면으로 이동"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
              장부 달력 보기
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white p-2 rounded-lg border border-gray-800 transition cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls (날짜 / 건물 / 층수) */}
        <div className="bg-gray-900 border border-gray-800 p-3 sm:p-4 rounded-xl shadow-lg mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                <option value="">전체 건물</option>
                {uniqueBuildings.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* 층 */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> 층
              </label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 p-2 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">전체 층</option>
                {uniqueFloors.map(f => (
                  <option key={f} value={f}>{f}층</option>
                ))}
              </select>
            </div>

            {/* 검색 */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-blue-400" /> 검색
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="상호/호수/메모 검색"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        </div>

        {/* Order Count Summary */}
        <div className="mb-4 bg-gray-900 border border-gray-800 rounded-xl p-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-800 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 font-bold">
                검색 범위: <span className="text-white font-extrabold">{selectedBuilding || '전체 건물'}{selectedFloor ? ` ${selectedFloor}층` : ''}</span>
                {searchQuery.trim() && <span className="text-blue-300 ml-1">("{searchQuery.trim()}")</span>}
              </span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400">
                현재 목록: <b className="text-yellow-400 font-black">{filteredOrders.length}</b>건
                <span className="text-gray-500 ml-1">
                  ({statusFilter === 'uncompleted' ? '처리 대기' : statusFilter === 'completed' ? '처리 완료' : statusFilter === 'itemCountNonZero' ? '물건 갯수합계' : statusFilter === 'all' ? '전체' : statusFilter})
                </span>
              </span>
            </div>
            <div className="text-gray-400 text-xs">
              대납 합계: <b className="text-rose-400 text-sm font-black">{formatMoney(workdayStats.totalExpense)}</b>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5 text-center text-xs">
            <button 
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "all" ? "bg-gray-700 border-gray-500 ring-1 ring-gray-400 ring-offset-1 ring-offset-gray-900" : "bg-gray-800/80 border-gray-700/60"}`}>
              <div className="text-[10px] tracking-tight text-gray-400 font-semibold mb-0.5">총 주문건수</div>
              <div className="text-sm sm:text-base font-black text-white">{workdayStats.totalOrderCount}<span className="text-[10px] font-normal ml-0.5 text-gray-400">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "completed" ? "bg-emerald-900 border-emerald-500 ring-1 ring-emerald-400 ring-offset-1 ring-offset-gray-900" : "bg-emerald-950/40 border-emerald-800/60"}`}>
              <div className="text-[10px] tracking-tight text-emerald-300 font-semibold mb-0.5">완료건수</div>
              <div className="text-sm sm:text-base font-black text-emerald-400">{workdayStats.completedCount}<span className="text-[10px] font-normal ml-0.5 text-emerald-300">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("uncompleted")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "uncompleted" ? "bg-amber-900 border-amber-500 ring-1 ring-amber-400 ring-offset-1 ring-offset-gray-900" : "bg-amber-950/40 border-amber-800/60"}`}>
              <div className="text-[10px] tracking-tight text-amber-300 font-semibold mb-0.5">처리 대기</div>
              <div className="text-sm sm:text-base font-black text-amber-400">{workdayStats.uncompletedCount}<span className="text-[10px] font-normal ml-0.5 text-amber-300">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("itemCountNonZero")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "itemCountNonZero" ? "bg-cyan-900 border-cyan-500 ring-1 ring-cyan-400 ring-offset-1 ring-offset-gray-900" : "bg-cyan-950/40 border-cyan-800/60"}`}>
              <div className="text-[10px] tracking-tight text-cyan-300 font-semibold mb-0.5">물건 갯수합계</div>
              <div className="text-sm sm:text-base font-black text-cyan-400">{workdayStats.totalItemCount}<span className="text-[10px] font-normal ml-0.5 text-cyan-300">개</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("itemCountGte2")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "itemCountGte2" ? "bg-indigo-900 border-indigo-500 ring-1 ring-indigo-400 ring-offset-1 ring-offset-gray-900" : "bg-indigo-950/40 border-indigo-800/60"}`}>
              <div className="text-[10px] tracking-tight text-indigo-300 font-semibold mb-0.5">물건 2개이상</div>
              <div className="text-sm sm:text-base font-black text-indigo-400">{workdayStats.itemCountGte2Count}<span className="text-[10px] font-normal ml-0.5 text-indigo-300">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("주문/물건 없음")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "주문/물건 없음" ? "bg-slate-700 border-slate-400 ring-1 ring-slate-300 ring-offset-1 ring-offset-gray-900" : "bg-slate-800/80 border-slate-700/60"}`}>
              <div className="text-[10px] tracking-tight text-slate-300 font-semibold mb-0.5">주문/물건 없음</div>
              <div className="text-sm sm:text-base font-black text-slate-200">{workdayStats.noOrderOrItemCount}<span className="text-[10px] font-normal ml-0.5 text-slate-400">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("올미송(결제만)")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "올미송(결제만)" ? "bg-yellow-900 border-yellow-500 ring-1 ring-yellow-400 ring-offset-1 ring-offset-gray-900" : "bg-yellow-950/40 border-yellow-800/60"}`}>
              <div className="text-[10px] tracking-tight text-yellow-300 font-semibold mb-0.5">올미송(결제)</div>
              <div className="text-sm sm:text-base font-black text-yellow-400">{workdayStats.allMisongCount}<span className="text-[10px] font-normal ml-0.5 text-yellow-300">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("미송(찾기)")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "미송(찾기)" ? "bg-orange-900 border-orange-500 ring-1 ring-orange-400 ring-offset-1 ring-offset-gray-900" : "bg-orange-950/40 border-orange-800/60"}`}>
              <div className="text-[10px] tracking-tight text-orange-300 font-semibold mb-0.5">미송(찾기)</div>
              <div className="text-sm sm:text-base font-black text-orange-400">{workdayStats.misongFindCount}<span className="text-[10px] font-normal ml-0.5 text-orange-300">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("반품만")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "반품만" ? "bg-rose-900 border-rose-500 ring-1 ring-rose-400 ring-offset-1 ring-offset-gray-900" : "bg-rose-950/40 border-rose-800/60"}`}>
              <div className="text-[10px] tracking-tight text-rose-300 font-semibold mb-0.5">반품만</div>
              <div className="text-sm sm:text-base font-black text-rose-400">{workdayStats.returnOnlyCount}<span className="text-[10px] font-normal ml-0.5 text-rose-300">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("교환/반송")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "교환/반송" ? "bg-pink-900 border-pink-500 ring-1 ring-pink-400 ring-offset-1 ring-offset-gray-900" : "bg-pink-950/40 border-pink-800/60"}`}>
              <div className="text-[10px] tracking-tight text-pink-300 font-semibold mb-0.5">교환/반송</div>
              <div className="text-sm sm:text-base font-black text-pink-400">{workdayStats.returnExchangeCount}<span className="text-[10px] font-normal ml-0.5 text-pink-300">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("교환/매입")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "교환/매입" ? "bg-fuchsia-900 border-fuchsia-500 ring-1 ring-fuchsia-400 ring-offset-1 ring-offset-gray-900" : "bg-fuchsia-950/40 border-fuchsia-800/60"}`}>
              <div className="text-[10px] tracking-tight text-fuchsia-300 font-semibold mb-0.5">교환/매입</div>
              <div className="text-sm sm:text-base font-black text-fuchsia-400">{workdayStats.exchangePurchaseCount}<span className="text-[10px] font-normal ml-0.5 text-fuchsia-300">건</span></div>
            </button>
            <button 
              type="button"
              onClick={() => setStatusFilter("매입처리")}
              className={`rounded-lg py-1 px-0.5 border transition-all duration-200 cursor-pointer hover:brightness-125 active:scale-95 ${statusFilter === "매입처리" ? "bg-purple-900 border-purple-500 ring-1 ring-purple-400 ring-offset-1 ring-offset-gray-900" : "bg-purple-950/40 border-purple-800/60"}`}>
              <div className="text-[10px] tracking-tight text-purple-300 font-semibold mb-0.5">매입처리</div>
              <div className="text-sm sm:text-base font-black text-purple-400">{workdayStats.purchaseCount}<span className="text-[10px] font-normal ml-0.5 text-purple-300">건</span></div>
            </button>
          </div>
        </div>

        {/* Order Cards List */}
        <div className="space-y-3 pb-24">
          {filteredOrders.length === 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-10 text-center text-gray-400">
              해당 조건의 주문 내역이 없습니다.
            </div>
          ) : (
            filteredOrders.map(order => {
              const statusStr = (order.status || '').trim();
              const isAnyCompleted = statusStr !== '';
              const isOrderComplete = statusStr === '완료' || statusStr === '주문찾기' || statusStr === '매입처리' || statusStr === '주고옴' || statusStr === '샘플' || statusStr === '주문없음' || statusStr === '물건없음';
              const isPending = statusStr === '미송' || statusStr === '올미송(결제만)' || statusStr === '미송(찾기)' || statusStr === '찾기';
              const isReturn = statusStr === '반품' || statusStr === '반품/교환' || statusStr === '반품만' || statusStr === '교환' || statusStr === '반송' || statusStr === '교환매입' || statusStr === '교환 매입' || statusStr === '교환/매입';

              return (
                <div
                  key={order.id}
                  className={`border rounded-xl p-3.5 sm:p-4 shadow-md transition ${
                    isOrderComplete ? 'bg-green-900/20 border-green-800' :
                    isPending ? 'bg-yellow-900/20 border-yellow-800' :
                    isReturn ? 'bg-red-900/20 border-red-800' :
                    'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  {/* Top Badge: Market / Floor / Room & Store Name */}
                  <div className="flex flex-col gap-2 mb-3 pb-2.5 border-b border-gray-800">
                    <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 sm:gap-2">
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        <div className="bg-blue-950 border border-blue-600 text-cyan-200 text-sm sm:text-base font-extrabold px-3 py-1.5 rounded-lg shadow inline-flex items-center gap-1.5 shrink-0">
                          <span>🏢</span>
                          <span>{order.market || '건물 미지정'}</span>
                          <span className="text-yellow-300 ml-1">
                            {String(order.floor || '').replace(/층$/, '') ? `${String(order.floor || '').replace(/층$/, '')}층` : ''}
                          </span>
                          <span className="text-white ml-1 font-mono">
                            {String(order.room || '').replace(/호$/, '') ? `${String(order.room || '').replace(/호$/, '')}호` : ''}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h2 className="text-lg sm:text-xl font-black text-white tracking-wide break-keep shrink-0">
                            {order.store || '상호 미등록'}
                          </h2>
                          {order.region && (
                            <span className="text-[11px] text-violet-300 bg-violet-900/60 border border-violet-700/60 px-2 py-0.5 rounded-md font-bold shrink-0 mt-0.5 sm:mt-0">
                              {order.region}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0 self-end sm:self-auto">
                        {isAnyCompleted && (
                          <span className={`text-xs px-2 py-0.5 rounded-md font-black border flex items-center gap-1 shadow-sm ${
                            statusStr === '주문없음' || statusStr === '물건없음' ? 'bg-slate-900 text-slate-200 border-slate-600' :
                            isOrderComplete ? 'bg-emerald-950 text-emerald-300 border-emerald-500' :
                            isPending ? 'bg-yellow-950 text-yellow-300 border-yellow-500' :
                            isReturn ? 'bg-rose-950 text-rose-300 border-rose-500' :
                            'bg-indigo-950 text-indigo-300 border-indigo-500'
                          }`}>
                            <span>✓ {order.status}</span>
                          </span>
                        )}
                        <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-md font-bold border border-gray-700">
                          담당: {order.actualManager || order.assignedManager || order.manager || '미배정'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Input */}
                  <div className="flex justify-end items-center gap-3 mb-3">
                    <div className="flex gap-2 items-end shrink-0">
                      <div className="flex flex-col items-end">
                        <div className="mb-1">
                          <div className="flex items-center gap-1">
                            <input type="checkbox" checked={!!order.isReturn} readOnly className="w-3 h-3 text-red-500 rounded bg-gray-800 border-gray-700" />
                            <label className="text-[10px] text-red-400 font-semibold">반품있음</label>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-300 font-bold shrink-0">물건갯수</label>
                          <div className="bg-gray-800 text-white border border-gray-700 w-14 sm:w-16 p-1.5 rounded-lg text-center font-black text-sm sm:text-base cursor-default select-none">{order.itemCount ?? 0}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <label className="text-[10px] text-gray-400 mb-0.5 font-semibold">대납금</label>
                        <div className="relative flex items-center">
                          <div className="bg-gray-800 text-amber-400 border border-gray-700 w-28 sm:w-32 p-1.5 pr-10 rounded-lg text-right font-black text-sm sm:text-base cursor-default select-none overflow-hidden">{order.expense ? order.expense.toLocaleString() : ''}</div>
                          <span className="absolute right-2 text-gray-400 text-xs font-medium pointer-events-none">,000원</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Memo Input */}
                  <div className="mb-3">
                    <div className="w-full bg-gray-800 text-amber-300 border border-gray-700 p-2.5 rounded-lg text-xs sm:text-sm cursor-default select-none min-h-[38px]">{order.remark || '특이사항 없음'}</div>
                  </div>

                  {/* Status Buttons (완료 / 미송 / 반품) */}
                                  </div>
              );
            })
          )}
        </div>

        {/* 맨밑: 선택한 날짜만 데이터 저장하는 방식의 엑셀데이터 저장 버튼 */}
        <div id="bottomExcelExportSectionStats" className="mt-8 pt-6 border-t border-gray-800">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 text-center shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-2 text-emerald-400 font-bold text-base sm:text-lg">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <span>선택한 날짜 엑셀데이터 저장</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mb-4 max-w-md mx-auto leading-relaxed">
              선택된 날짜 <span className="text-blue-400 font-bold">[{selectedDateStr}]</span>의 사입 및 주문 처리 내역 전체(<span className="text-emerald-400 font-bold">{dateOrders.length}건</span>)를 엑셀 파일로 저장합니다.
            </p>
            <button
              id="btnBottomExportExcelStats"
              type="button"
              onClick={handleExportSelectedDateExcel}
              className="w-full max-w-md mx-auto bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white py-3.5 px-6 rounded-xl font-black shadow-lg text-sm sm:text-base transition flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>{selectedDateStr} 엑셀데이터 저장 ({dateOrders.length}건)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
});
