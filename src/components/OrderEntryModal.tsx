import React, { useState, useEffect } from 'react';
import { Transaction, User } from '../types';
import { saveOrderToFirebase, normalizeMarketName } from '../lib/firebase';
import { Plus, Trash2, Edit3, X, Check, Sparkles } from 'lucide-react';

interface OrderEntryModalProps {
  editingTransaction: Transaction | null;
  currentUser: User | null;
  selectedDate: string;
  stores: string[];
  allMarkets: string[];
  onClose: () => void;
  onOrderSaved: (savedOrders: Transaction[]) => void;
  onOrderCompleted?: (transactionId: string) => void;
  onOpenAiModal?: () => void;
}

interface OrderRowItem {
  market: string;
  floor: string;
  room: string;
}

export const OrderEntryModal: React.FC<OrderEntryModalProps> = ({
  editingTransaction,
  currentUser,
  selectedDate,
  stores,
  allMarkets,
  onClose,
  onOrderSaved,
  onOrderCompleted,
  onOpenAiModal
}) => {
  const isEditMode = !!editingTransaction;
  const isMerchant = currentUser?.role === 'merchant';
  const isBuyer = currentUser?.role === 'buyer';
  const isBuyerAdmin = isBuyer && currentUser?.isBuyerAdmin;
  const isRegularBuyer = isBuyer && !currentUser?.isBuyerAdmin;

  const [date, setDate] = useState(editingTransaction?.date || selectedDate);
  const [store, setStore] = useState(editingTransaction?.store || (isMerchant ? currentUser?.storeName || '' : ''));
  const [remark, setRemark] = useState(editingTransaction?.remark || '');
          
  const [orderRows, setOrderRows] = useState<OrderRowItem[]>(
    isEditMode
      ? [{ market: editingTransaction.market || '', floor: editingTransaction.floor || '', room: editingTransaction.room || '' }]
      : [
          { market: '', floor: '', room: '' },
          { market: '', floor: '', room: '' },
          { market: '', floor: '', room: '' },
          { market: '', floor: '', room: '' }
        ]
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleRowChange = (index: number, field: keyof OrderRowItem, value: string) => {
    setOrderRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addRow = () => {
    if (isEditMode) return;
    setOrderRows(prev => [...prev, { market: '', floor: '', room: '' }]);
  };

  const removeRow = (index: number) => {
    if (isEditMode || orderRows.length <= 1) return;
    setOrderRows(prev => prev.filter((_, i) => i !== index));
  };

  const validRows = orderRows.filter(r => r.market.trim() || r.floor.trim() || r.room.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !store.trim()) {
      alert('날짜와 상호명을 입력해주세요.');
      return;
    }

    if (validRows.length === 0) {
      alert('주문 내역(건물명, 층, 호수)을 1건 이상 입력해주세요.');
      return;
    }

    for (const r of validRows) {
      if (!r.market.trim() || !r.floor.trim() || !r.room.trim()) {
        alert('건물명, 층, 호수를 모두 입력해주세요.');
        return;
      }
      if (r.market.trim() === '===== 남대문 =====') {
        alert('올바른 건물명을 입력해주세요.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const savedList: Transaction[] = [];

      if (isEditMode && editingTransaction) {
        const r = validRows[0];
        const updated: Transaction = {
          ...editingTransaction,
          date,
          businessDate: date,
          store: store.trim(),
          market: normalizeMarketName(r.market),
          floor: r.floor.trim(),
          room: r.room.trim(),
          manager: editingTransaction?.manager || "",
          region: editingTransaction?.region || "",
          expense: editingTransaction?.expense || 0,
          income: editingTransaction?.income || 0,
          status: editingTransaction?.status || "",
          remark: remark.trim(),
          merchantId: editingTransaction.merchantId || (isMerchant ? currentUser?.username : ''),
          merchantName: editingTransaction.merchantName || (isMerchant ? currentUser?.name : ''),
          merchantStoreName: editingTransaction.merchantStoreName || (isMerchant ? currentUser?.storeName : '')
        };

        await saveOrderToFirebase(updated);
        savedList.push(updated);
      } else {
        for (const r of validRows) {
          const newOrder: Transaction = {
            id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            date,
            businessDate: date,
            store: store.trim(),
            market: normalizeMarketName(r.market),
            floor: r.floor.trim(),
            room: r.room.trim(),
            manager: "",
            region: "",
            expense: editingTransaction?.expense || 0,
            income: editingTransaction?.income || 0,
            status: editingTransaction?.status || "",
            remark: remark.trim(),
            merchantId: isMerchant ? currentUser?.username : '',
            merchantName: isMerchant ? currentUser?.name : '',
            merchantStoreName: isMerchant ? currentUser?.storeName : '',
            orderAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };

          const firebaseId = await saveOrderToFirebase(newOrder);
          newOrder.firebaseOrderId = firebaseId;
          savedList.push(newOrder);
        }
      }

      onOrderSaved(savedList);
      onClose();
    } catch (err: any) {
      console.error('주문 저장 오류:', err);
      alert(err.message || '주문을 저장하는 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = () => {
    if (editingTransaction && onOrderCompleted) {
      if (confirm('이 주문을 완료건으로 이동하시겠습니까?')) {
        onOrderCompleted(editingTransaction.id);
        onClose();
      }
    }
  };

  return (
    <div id="entryModal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden border border-slate-200 flex flex-col my-auto">
        
        {/* Header */}
        <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-300" />
              {isEditMode ? '사입 주문 수정 / 완료 처리' : '신규 사입 주문 입력'}
            </h3>
            {!isEditMode && onOpenAiModal && (
              <button
                type="button"
                onClick={onOpenAiModal}
                className="bg-indigo-700 hover:bg-indigo-600 text-indigo-100 text-[10px] font-bold px-2 py-1.5 rounded flex items-center gap-1 transition border border-indigo-500/50"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                스마트 입력
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Top Row: Date & Store */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">날짜 *</label>
              <input
                type="date"
                required
                value={date}
                disabled={isRegularBuyer && isEditMode}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none ${(isRegularBuyer && isEditMode) ? 'bg-slate-100 cursor-not-allowed' : 'focus:bg-white'}`}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">상호 (소매점) *</label>
              <input
                type="text"
                required
                list="storeDatalist"
                value={store}
                disabled={(isRegularBuyer && isEditMode) || (isMerchant && !!currentUser?.storeName)}
                onChange={(e) => setStore(e.target.value)}
                placeholder="상호명을 입력하세요"
                className={`w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none ${((isRegularBuyer && isEditMode) || (isMerchant && !!currentUser?.storeName)) ? 'bg-slate-100 cursor-not-allowed' : 'focus:bg-white'}`}
              />
              <datalist id="storeDatalist">
                {stores.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          

          {/* Multi-row Order Entry */}
          <div>
            <div className="grid grid-cols-[1.4fr_.7fr_.7fr_auto] gap-2 mb-1.5 text-[11px] font-bold text-slate-600">
              <div>건물명/시장 *</div>
              <div>층 *</div>
              <div>호수 *</div>
              <div></div>
            </div>

            <div className="space-y-2">
              {orderRows.map((row, index) => (
                <div key={index} className="grid grid-cols-[1.4fr_.7fr_.7fr_auto] gap-2 items-center">
                  <input
                    type="text"
                    list="marketDatalist"
                    value={row.market}
                    disabled={isRegularBuyer && isEditMode}
                    onChange={(e) => handleRowChange(index, 'market', e.target.value)}
                    onBlur={(e) => handleRowChange(index, 'market', normalizeMarketName(e.target.value))}
                    placeholder="예: 디오트, APM, 청평"
                    className={`w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none ${(isRegularBuyer && isEditMode) ? 'bg-slate-100 cursor-not-allowed' : 'focus:bg-white'}`}
                  />
                  <input
                    type="text"
                    value={row.floor}
                    disabled={isRegularBuyer && isEditMode}
                    onChange={(e) => handleRowChange(index, 'floor', e.target.value)}
                    placeholder="예: 3, 지1"
                    className={`w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none ${(isRegularBuyer && isEditMode) ? 'bg-slate-100 cursor-not-allowed' : 'focus:bg-white'}`}
                  />
                  <input
                    type="text"
                    value={row.room}
                    disabled={isRegularBuyer && isEditMode}
                    onChange={(e) => handleRowChange(index, 'room', e.target.value)}
                    placeholder="예: 25호"
                    className={`w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none ${(isRegularBuyer && isEditMode) ? 'bg-slate-100 cursor-not-allowed' : 'focus:bg-white'}`}
                  />
                  {!isEditMode && orderRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="text-slate-300 hover:text-rose-600 p-1"
                      title="행 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <datalist id="marketDatalist">
              {allMarkets.map(m => (
                <option 
                  key={m} 
                  value={m} 
                  disabled={m === '===== 남대문 ====='} 
                />
              ))}
            </datalist>

            {!isEditMode && (
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="px-3 py-1.5 rounded-xl border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold text-xs transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  주문 추가
                </button>
              </div>
            )}
          </div>

          {/* Order Summary Box */}
          <div className="border border-slate-200 rounded-xl bg-slate-50 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700">입력된 주문 내역</span>
              <span className="text-indigo-600 font-bold">{validRows.length}건</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] text-slate-600">
              {validRows.length > 0 ? (
                validRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5 border-b border-slate-200 last:border-b-0">
                    <span className="font-bold text-slate-400 w-4">{i + 1}.</span>
                    <span className="font-semibold text-slate-800">{r.market || '-'}</span>
                    <span>{String(r.floor || '').replace(/층$/, '') ? `${String(r.floor || '').replace(/층$/, '')}층` : ''}</span>
                    <span>{r.room ? `${r.room}` : ''}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-center py-2">건물명, 층, 호수를 입력하면 여기에 요약됩니다.</div>
              )}
            </div>
          </div>

          

          {/* Remark / Memo */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">비고 (메모)</label>
            <textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="특이사항, 요청사항 메모 등"
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none focus:bg-white resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            {isEditMode && isBuyer && (
              <button
                type="button"
                onClick={handleComplete}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1 shadow-md"
              >
                <Check className="w-4 h-4" />
                완료 처리
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-md disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
