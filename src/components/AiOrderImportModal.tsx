import React, { useState } from 'react';
import { X, Sparkles, Loader2, Zap, FileText } from 'lucide-react';
import { Transaction } from '../types';
import { normalizeMarketName, normalizeDateStr, saveOrdersBulkToFirebase } from '../lib/firebase';

interface AiOrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDateStr: string;
  onImportOrders: (newOrders: Transaction[]) => void;
  currentUser: any;
}

const TEMPLATE_TEXT = `상호/건물명/층/호수/비고
상호/건물명/층/호수/비고
상호/건물명/층/호수/비고`;

export const AiOrderImportModal: React.FC<AiOrderImportModalProps> = ({
  isOpen,
  onClose,
  selectedDateStr,
  onImportOrders,
  currentUser
}) => {
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseOrdersLocally = (text: string) => {
    const orders = [];
    const lines = text.split('\n');
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      // 템플릿 안내문 무시
      if (line === '상호/건물명/층/호수/비고') continue;

      // 슬래시(/) 기준으로 주문 파싱
      const parts = line.split('/').map(p => p.trim());
      
      if (parts.length >= 2) {
        let store = parts[0];
        store = store.replace(/^\d+[\.\)]\s*/, ''); // 줄 번호가 있으면 제거 (예: 1. 상호)
        
        let market = parts[1] || '';
        let floor = parts[2] || '';
        let room = parts[3] || '';
        let remark = parts.length > 4 ? parts.slice(4).join(' / ') : '';

        orders.push({
          market,
          floor,
          room,
          store,
          remark
        });
      }
    }
        
    return orders;
  };

  const handleProcess = async () => {
    if (!textInput.trim()) {
      setErrorMsg("요청서 메시지를 입력해주세요.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    
    try {
      const parsedOrders = parseOrdersLocally(textInput);

      if (!parsedOrders || parsedOrders.length === 0) {
        setErrorMsg("입력된 텍스트에서 주문을 인식하지 못했습니다. 아래 권장 형식을 확인해주세요.");
        setIsProcessing(false);
        return;
      }

      // 소매상(상호) 누락 체크
      const isMissingStore = parsedOrders.some(o => !o.store || o.store.trim() === '');
      if (isMissingStore) {
        const proceed = window.confirm("상호(소매상)가 입력되지 않은 주문이 있습니다. 이대로 '상호 미지정'으로 등록하시겠습니까?");
        if (!proceed) {
          setIsProcessing(false);
          return;
        }
      }

      const newTransactions: Transaction[] = parsedOrders.map((order: any, index: number) => {
        const market = normalizeMarketName(order.market || '');
        const store = (order.store || '상호 미지정').trim();
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
          status: '미완료',
          remark,
          recordType: 'order',
          importedFromFirebase: true
        };
      });

      await saveOrdersBulkToFirebase(newTransactions);
      onImportOrders(newTransactions);
      setTextInput('');
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("처리 중 오류가 발생했습니다: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyTemplate = () => {
    setTextInput((prev) => prev ? prev + '\n\n' + TEMPLATE_TEXT : TEMPLATE_TEXT);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-800 animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">스마트 텍스트 자동 입력</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-blue-400 flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                정확한 인식을 위한 권장 형식
              </h4>
              <button 
                onClick={applyTemplate}
                className="flex items-center gap-1 text-xs bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 px-2 py-1.5 rounded transition-colors"
              >
                <FileText className="w-3 h-3" />
                양식 넣기
              </button>
            </div>
            <pre className="text-xs text-blue-200/80 whitespace-pre-wrap font-mono bg-black/30 p-3 rounded-lg border border-blue-900/50">
쵸이/APM/7층/45호 아워룸/단가 15000
제이/청평화/1층/가동 7 한일상회/픽업요망
            </pre>
            <p className="text-xs text-blue-400/80 mt-2">
              * 줄마다 <strong>[상호 / 건물명 / 층 / 호수 / 비고]</strong> 순서로 슬래시를 넣어주세요.
            </p>
          </div>

          <textarea
            className="w-full h-48 bg-gray-950 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all mb-4 font-mono leading-relaxed"
            placeholder="상호/건물명/층/호수/비고&#13;&#10;상호/건물명/층/호수/비고"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isProcessing}
          />
          
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 font-medium">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-800 bg-gray-900/50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            disabled={isProcessing}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleProcess}
            disabled={!textInput.trim() || isProcessing}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                자동 분석 및 등록
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
