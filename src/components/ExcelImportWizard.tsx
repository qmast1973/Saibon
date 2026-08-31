import React, { useState } from 'react';
import { Transaction, User, UserRole } from '../types';
import { normalizeMarketName, normalizeDateStr } from '../lib/firebase';
import { Coins, CalendarCheck, UserCheck, ArrowRight, X, Check } from 'lucide-react';

interface ExcelImportWizardProps {
  parsedRows: any[];
  users: User[];
  onClose: () => void;
  onImportFinalized: (importedTransactions: Transaction[]) => void;
}

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({
  parsedRows,
  users,
  onClose,
  onImportFinalized
}) => {
  const isReceivable = (r: any) => {
    return String(r.market || '').includes('미수금') || String(r.status || '').includes('미수금') || String(r.remark || '').includes('미수금');
  };

  const allReceivableRows = parsedRows.filter(isReceivable);
  const allNormalRows = parsedRows.filter(r => !isReceivable(r));

  // Step 1 State: Receivable dates
  const receivableDateMap = new Map<string, any[]>();
  allReceivableRows.forEach(r => {
    const d = r.date || '날짜 없음';
    if (!receivableDateMap.has(d)) receivableDateMap.set(d, []);
    receivableDateMap.get(d)!.push(r);
  });
  const receivableDates = [...receivableDateMap.keys()].sort((a, b) => b.localeCompare(a));
  const [selectedReceivableDates, setSelectedReceivableDates] = useState<Set<string>>(new Set(receivableDates));

  // Step 2 State: Order dates
  const normalDateMap = new Map<string, any[]>();
  allNormalRows.forEach(r => {
    const d = r.date || '날짜 없음';
    if (!normalDateMap.has(d)) normalDateMap.set(d, []);
    normalDateMap.get(d)!.push(r);
  });
  const normalDates = [...normalDateMap.keys()].sort((a, b) => b.localeCompare(a));
  const [selectedNormalDates, setSelectedNormalDates] = useState<Set<string>>(new Set(normalDates));

  // Step 3 State: Manager Mapping
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [managerIndex, setManagerIndex] = useState(0);
  const [managerRoleMapping, setManagerRoleMapping] = useState<Record<string, UserRole | 'other'>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filtered rows for Step 3
  const [activeRowsForImport, setActiveRowsForImport] = useState<any[]>([]);

  // Step 1 handlers
  const handleReceivableToggle = (date: string) => {
    const copy = new Set(selectedReceivableDates);
    if (copy.has(date)) copy.delete(date);
    else copy.add(date);
    setSelectedReceivableDates(copy);
  };

  const handleSelectAllReceivables = (flag: boolean) => {
    setSelectedReceivableDates(new Set(flag ? receivableDates : []));
  };

  const handleConfirmReceivables = () => {
    setCurrentStep(2);
  };

  // Step 2 handlers
  const handleNormalDateToggle = (date: string) => {
    const copy = new Set(selectedNormalDates);
    if (copy.has(date)) copy.delete(date);
    else copy.add(date);
    setSelectedNormalDates(copy);
  };

  const handleSelectAllNormalDates = (flag: boolean) => {
    setSelectedNormalDates(new Set(flag ? normalDates : []));
  };

  const handleConfirmDates = () => {
    const selectedReceivables = allReceivableRows.filter(r => selectedReceivableDates.has(r.date));
    const selectedNormals = allNormalRows.filter(r => selectedNormalDates.has(r.date));
    const combined = [...selectedReceivables, ...selectedNormals];

    if (combined.length === 0) {
      alert('가져올 날짜의 데이터를 최소 1건 이상 선택해주세요.');
      return;
    }

    setActiveRowsForImport(combined);

    // Prepare manager list
    const managers = [...new Set(combined.map(r => r.sourceManager).filter(Boolean))];
    if (managers.length === 0) {
      finalize(combined, {});
      return;
    }

    // Auto-match known users
    const initialMap: Record<string, UserRole | 'other'> = {};
    managers.forEach(m => {
      const match = users.find(u => u.name === m);
      if (match) initialMap[m] = match.role;
    });

    setManagerRoleMapping(initialMap);
    setManagerIndex(0);
    setCurrentStep(3);
  };

  // Step 3 handlers
  const managers: string[] = [...new Set(activeRowsForImport.map(r => r.sourceManager).filter(Boolean))] as string[];
  const currentManagerName: string = String(managers[managerIndex] || '');
  const existingUser = users.find(u => u.name === currentManagerName);

  const handleRoleSelect = (role: UserRole | 'other') => {
    if (!currentManagerName) return;
    setManagerRoleMapping(prev => ({ ...prev, [currentManagerName]: role }));
  };

  const handleNextManager = async () => {
    if (isSaving) return;
    const selected = managerRoleMapping[currentManagerName];
    if (!selected) {
      alert('담당자 역할을 선택해주세요.');
      return;
    }

    if (managerIndex + 1 >= managers.length) {
      setIsSaving(true);
      try {
        await finalize(activeRowsForImport, managerRoleMapping);
      } catch (err) {
        console.error(err);
        alert("저장 중 오류가 발생했습니다.");
      } finally {
        setIsSaving(false);
      }
    } else {
      setManagerIndex(managerIndex + 1);
    }
  };

  const finalize = async (rows: any[], mapping: Record<string, UserRole | 'other'>) => {
    const finalTransactions: Transaction[] = rows.map((r, index) => {
      const sourceManager = String(r.sourceManager || '').trim();
      const role = mapping[sourceManager] || '';
      const isRec = isReceivable(r);
      const date = normalizeDateStr(r.date);
      const expense = Number(r.expense) || 0;
      const income = Number(r.income) || 0;

      return {
        id: `excel_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        orderAt: new Date().toISOString(),
        businessDate: date,
        date,
        manager: sourceManager,
        originalManager: sourceManager,
        sourceManager,
        actualManager: role === 'buyer' ? sourceManager : '',
        localManager: role === 'local' ? sourceManager : '',
        assignedManager: role === 'buyer' ? sourceManager : '',
        importedManagerRole: role,
        region: String(r.region || '합성동').trim(),
        store: String(r.store || '').trim(),
        market: normalizeMarketName(r.market || ''),
        floor: String(r.floor || '').trim(),
        room: String(r.room || '').trim(),
        expense,
        income,
        status: String(r.status || '').trim(),
        remark: String(r.remark || '').trim(),
        recordType: isRec ? 'receivable' : 'order',
        importedFromExcel: true,
        createdAt: new Date().toISOString()
      };
    });

    await onImportFinalized(finalTransactions);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[320] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[90vh]">
        
        {/* Step 1: Receivable Selection */}
        {currentStep === 1 && (
          <>
            <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-200" />
                  1단계 · 미수금 데이터 선택
                </h3>
                <p className="text-[11px] text-amber-100 mt-0.5">
                  미수금은 날짜별로 선택됩니다. 체크한 날짜의 미수금 전체가 포함됩니다.
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-amber-100 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-800">
                  {selectedReceivableDates.size}개 일자 선택됨
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllReceivables(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200"
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllReceivables(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200"
                  >
                    전체 해제
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {receivableDates.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">엑셀에 미수금 내역이 없습니다. 다음으로 진행하세요.</div>
                ) : (
                  receivableDates.map(date => {
                    const count = receivableDateMap.get(date)?.length || 0;
                    const isChecked = selectedReceivableDates.has(date);
                    return (
                      <label key={date} className="flex items-center justify-between p-3 hover:bg-amber-50/50 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleReceivableToggle(date)}
                            className="w-4 h-4 text-amber-600 rounded"
                          />
                          <span className="font-bold text-slate-900">{date}</span>
                        </div>
                        <span className="font-semibold text-amber-700">{count}건</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-200 font-semibold text-xs">
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmReceivables}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-md"
              >
                다음 · 주문 날짜 선택 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Date Selection */}
        {currentStep === 2 && (
          <>
            <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-emerald-200" />
                  2단계 · 주문/입금 날짜 선택
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  가져올 주문 및 입금 일자를 선택합니다.
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-emerald-100 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-800">
                  {selectedNormalDates.size}개 일자 선택됨
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllNormalDates(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAllNormalDates(false)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200"
                  >
                    전체 해제
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {normalDates.map(date => {
                  const count = normalDateMap.get(date)?.length || 0;
                  const isChecked = selectedNormalDates.has(date);
                  return (
                    <label key={date} className="flex items-center justify-between p-3 hover:bg-emerald-50/50 cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleNormalDateToggle(date)}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className="font-bold text-slate-900">{date}</span>
                      </div>
                      <span className="font-semibold text-emerald-700">{count}건</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between shrink-0">
              <button type="button" onClick={() => setCurrentStep(1)} className="px-4 py-2 rounded-xl bg-slate-200 font-semibold text-xs">
                이전
              </button>
              <button
                type="button"
                onClick={handleConfirmDates}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-md"
              >
                다음 · 담당자 확인 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Manager Role Mapping */}
        {currentStep === 3 && (
          <>
            <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-300" />
                  3단계 · 담당자 역할 검증 ({managerIndex + 1} / {managers.length})
                </h3>
                <p className="text-[11px] text-indigo-200 mt-0.5">
                  엑셀의 담당자명이 어떤 역할인지 확인하고 매핑합니다.
                </p>
              </div>
              <button type="button" onClick={onClose} className="text-slate-300 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-center">
                <div className="text-slate-500 text-[11px] mb-1">엑셀 담당자명</div>
                <div className="text-xl font-bold text-indigo-900">{currentManagerName}</div>
                {existingUser && (
                  <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                    사입ON 회원 '{existingUser.name}'과 일치합니다. (기본 역할: {existingUser.role})
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-2">담당 역할을 선택하세요</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { role: 'buyer', label: '🧑‍💼 서울 사입삼촌' },
                    { role: 'local', label: '🚚 지방 삼촌' },
                    { role: 'admin', label: '🛡️ 관리자' },
                    { role: 'other', label: '❓ 기타 / 담당 없음' }
                  ].map(item => {
                    const isSelected = managerRoleMapping[currentManagerName] === item.role;
                    return (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => handleRoleSelect(item.role as any)}
                        className={`p-3 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (managerIndex > 0) setManagerIndex(managerIndex - 1);
                  else setCurrentStep(2);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 font-semibold text-xs"
              >
                이전
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleNextManager}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1 shadow-md"
              >
                {isSaving ? '저장 중...' : (managerIndex + 1 >= managers.length ? '가져오기 완료' : '확인하고 다음')} {!isSaving && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
