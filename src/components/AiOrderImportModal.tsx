import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Loader2, Zap, FileText, CheckCircle2, AlertCircle, Trash2, Edit3, ArrowRight } from 'lucide-react';
import { Transaction } from '../types';
import { normalizeMarketName, saveOrdersBulkToFirebase } from '../lib/firebase';
import { parseSmartOrderText, ParsedOrderItem } from '../lib/orderParser';

interface AiOrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDateStr: string;
  onImportOrders: (newOrders: Transaction[]) => void;
  currentUser: any;
}

const SAMPLE_PRESETS = [
  {
    title: '상호 그룹형 주문',
    text: `[초코송이마켓]
디오트 3층 12호
청평화 1층 가동 5호 니트 1개
퀸즈스퀘어 4층 102호 스커트`
  },
  {
    title: '슬래시(/) 분할형',
    text: `블루문 / 디오트 / 3층 / 12호 / 샘플픽업
오렌지박스 / APM플레이스 / 7층 / 45호 / 단가 15000`
  }
];

export const AiOrderImportModal: React.FC<AiOrderImportModalProps> = ({
  isOpen,
  onClose,
  selectedDateStr,
  onImportOrders,
  currentUser
}) => {
  const defaultStore = currentUser?.role === 'merchant' ? (currentUser?.storeName || currentUser?.name || '') : '';
  const [textInput, setTextInput] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedOrderItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 텍스트가 바뀔 때마다 실시간으로 자동 분석 수행
  useEffect(() => {
    if (!textInput.trim()) {
      setParsedRows([]);
      setErrorMsg(null);
      return;
    }
    const results = parseSmartOrderText(textInput, defaultStore);
    setParsedRows(results);
    if (results.length === 0) {
      setErrorMsg('입력된 텍스트에서 주문 정보를 찾지 못했습니다.');
    } else {
      setErrorMsg(null);
    }
  }, [textInput, defaultStore]);

  if (!isOpen) return null;

  const handleRowChange = (index: number, field: keyof ParsedOrderItem, value: string) => {
    setParsedRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcessAndSave = async () => {
    if (parsedRows.length === 0) {
      setErrorMsg('등록할 주문 항목이 없습니다. 텍스트를 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const newTransactions: Transaction[] = parsedRows.map((order, index) => {
        const market = normalizeMarketName(order.market || '');
        const store = (order.store || defaultStore || '상호 미지정').trim();
        const floor = (order.floor || '').trim();
        const room = (order.room || '').trim();
        const remark = (order.remark || '').trim();

        const orderId = `item_ai_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`;

        return {
          id: `firebase_${encodeURIComponent(selectedDateStr)}_${encodeURIComponent(orderId)}`,
          firebaseOrderId: orderId,
          firebaseDate: selectedDateStr,
          date: selectedDateStr,
          businessDate: selectedDateStr,
          region: '',
          store,
          market,
          floor,
          room,
          manager: currentUser?.name || '',
          originalManager: currentUser?.name || '',
          actualManager: currentUser?.name || '',
          expense: 0,
          income: 0,
          status: '',
          remark,
          recordType: market === '미수금' ? 'receivable' : 'order',
          importedFromFirebase: true
        };
      });

      await saveOrdersBulkToFirebase(newTransactions);
      onImportOrders(newTransactions);
      setTextInput('');
      setParsedRows([]);
      onClose();
    } catch (err: any) {
      console.error('Fast order save error:', err);
      setErrorMsg('주문 저장 중 오류가 발생했습니다: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-gray-800 animate-slide-up flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 bg-gray-900/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">지능형 빠른 주문 등록</h3>
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium border border-blue-500/30">
                  실시간 자동 분석
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                카톡 주문서, 줄임말, 슬래시 형식을 그대로 붙여넣으면 즉시 표로 분리됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 bg-gray-950/60 p-3 rounded-xl border border-gray-800">
            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              테스트 예시 클릭:
            </span>
            {SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setTextInput(preset.text)}
                className="text-xs bg-gray-800 hover:bg-blue-600/30 hover:border-blue-500/50 hover:text-blue-300 text-gray-300 px-2.5 py-1 rounded-lg border border-gray-700 transition-all font-medium"
              >
                {preset.title}
              </button>
            ))}
          </div>

          {/* Grid Layout: Left Input / Right Live Result */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left: Text Input */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-300">카톡/문자 텍스트 붙여넣기 (Ctrl + V)</label>
                {textInput && (
                  <button
                    onClick={() => setTextInput('')}
                    className="text-xs text-gray-500 hover:text-gray-300"
                  >
                    지우기
                  </button>
                )}
              </div>
              <textarea
                className="w-full h-56 lg:h-80 bg-gray-950 border border-gray-800 rounded-xl p-3.5 text-xs sm:text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono leading-relaxed transition-all"
                placeholder={`카톡이나 문자 주문을 여기에 편하게 붙여넣으세요!\n\n예시 1:\n디 3-12 구름상회 바지 2장\nAPM 7F 45 은하수어패럴 픽업요망\n청 B1-5 오렌지박스\n\n예시 2:\n블루문/디오트/3층/12호/샘플`}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isProcessing}
              />
            </div>

            {/* Right: Live Parsed Table */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-300">실시간 분석 결과</label>
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold">
                    {parsedRows.length}건 인식됨
                  </span>
                </div>
                <span className="text-xs text-gray-500">클릭하여 바로 수정 가능</span>
              </div>

              <div className="w-full h-56 lg:h-80 bg-gray-950 border border-gray-800 rounded-xl overflow-y-auto p-2">
                {parsedRows.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 p-6 text-center">
                    <Zap className="w-8 h-8 mb-2 opacity-30 text-blue-400" />
                    <p className="text-xs sm:text-sm">왼쪽에 주문 글을 입력하면</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-400">여기에 상가, 층, 호수, 상호가 자동으로 분리됩니다.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {parsedRows.map((row, idx) => (
                      <div
                        key={row.id || idx}
                        className="bg-gray-900 border border-gray-800 hover:border-blue-500/50 rounded-xl p-2.5 transition-all text-xs flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-1.5">
                          <span className="font-bold text-gray-400">#{idx + 1}</span>
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-gray-500 text-[11px] truncate">원본: {row.rawText}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-gray-800 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Editable Field Inputs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-0.5">상호(소매)</span>
                            <input
                              type="text"
                              value={row.store}
                              onChange={(e) => handleRowChange(idx, 'store', e.target.value)}
                              className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white font-medium focus:border-blue-500 focus:outline-none"
                              placeholder="상호"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-blue-400 font-semibold block mb-0.5">건물명(상가)</span>
                            <input
                              type="text"
                              value={row.market}
                              onChange={(e) => handleRowChange(idx, 'market', e.target.value)}
                              className="w-full bg-gray-950 border border-blue-500/40 rounded px-2 py-1 text-blue-300 font-bold focus:border-blue-500 focus:outline-none"
                              placeholder="건물명"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-indigo-400 font-semibold block mb-0.5">층</span>
                            <input
                              type="text"
                              value={row.floor}
                              onChange={(e) => handleRowChange(idx, 'floor', e.target.value)}
                              className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white focus:border-blue-500 focus:outline-none"
                              placeholder="층"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] text-indigo-400 font-semibold block mb-0.5">호수</span>
                            <input
                              type="text"
                              value={row.room}
                              onChange={(e) => handleRowChange(idx, 'room', e.target.value)}
                              className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white focus:border-blue-500 focus:outline-none"
                              placeholder="호수"
                            />
                          </div>
                        </div>

                        {/* Remark / Note Field */}
                        <div>
                          <span className="text-[10px] text-gray-500 block mb-0.5">비고 / 주문 품목 및 수량</span>
                          <input
                            type="text"
                            value={row.remark}
                            onChange={(e) => handleRowChange(idx, 'remark', e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-gray-300 focus:border-blue-500 focus:outline-none"
                            placeholder="비고, 수량, 픽업요망 등"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs sm:text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-900/80 flex-shrink-0">
          <div className="text-xs text-gray-400">
            총 <strong className="text-white font-bold text-sm">{parsedRows.length}</strong>건의 주문이 등록됩니다.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              disabled={isProcessing}
            >
              닫기
            </button>
            <button
              type="button"
              onClick={handleProcessAndSave}
              disabled={parsedRows.length === 0 || isProcessing}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {parsedRows.length > 0 ? `${parsedRows.length}건 즉시 주문 등록` : '주문 일괄 등록'}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
