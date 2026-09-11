import React, { useState, useMemo, useEffect } from 'react';
import { CollectionGroupRule, User, Transaction } from '../types';
import { saveGroupRulesToFirebase, deleteGroupRuleFromFirebase } from '../lib/firebase';
import { 
  Layers, Plus, X, Check, Store, Edit2, Building2, 
  AlertCircle, Link2, Unlink, ChevronRight, Save
} from 'lucide-react';

interface GroupRulesManagerModalProps {
  rules: CollectionGroupRule[];
  currentUser: User | null;
  currentDateStr: string;
  availableStores?: string[];
  merchantUsers?: User[];
  transactions?: Transaction[];
  onClose: () => void;
  onRulesUpdated: (rules: CollectionGroupRule[]) => void;
}

export const GroupRulesManagerModal: React.FC<GroupRulesManagerModalProps> = ({
  rules = [],
  currentUser,
  currentDateStr,
  availableStores = [],
  merchantUsers = [],
  onClose,
  onRulesUpdated
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // 내부 즉각 반응형 로컬 규칙 상태 (상위 및 저장소와 실시간 동기화)
  const [localRules, setLocalRules] = useState<CollectionGroupRule[]>(rules || []);

  useEffect(() => {
    if (rules) {
      setLocalRules(rules);
    }
  }, [rules]);

  // 1. 고유한 대표거래처(Group Name) 목록 생성
  const groupNames = useMemo<string[]>(() => {
    const set = new Set<string>();

    // 상가 회원 마스터 상호명 추가
    merchantUsers.forEach(u => {
      const s = (u.storeName || u.name || u.username || '').trim();
      if (s) set.add(s);
    });

    // 기존 등록된 규칙의 대표 상호명 추가
    (localRules || []).forEach(r => {
      const g = (r.groupName || '').trim();
      if (g) set.add(g);
    });

    // 기본 거래처
    set.add('호치키스');

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko-KR'));
  }, [merchantUsers, localRules]);

  // 2. 현재 선택된 대표거래처 상태 (selectedGroupName)
  const initialGroupName = useMemo(() => {
    if (currentUser?.role === 'merchant') {
      const myStore = (currentUser.storeName || currentUser.name || currentUser.username || '').trim();
      if (myStore && groupNames.includes(myStore)) return myStore;
    }
    return groupNames.includes('호치키스') ? '호치키스' : (groupNames[0] || '호치키스');
  }, [currentUser, groupNames]);

  const [selectedGroupName, setSelectedGroupName] = useState<string>(initialGroupName);

  // 3. 입력 폼 상태
  const [storeName, setStoreName] = useState('');
  const [groupName, setGroupName] = useState(selectedGroupName);
  const [note, setNote] = useState('');
  const [applyAllDates, setApplyAllDates] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(currentDateStr || new Date().toISOString().slice(0, 10));
  const [matchType, setMatchType] = useState<'exact' | 'prefix'>('exact');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 4. 상세 모달 상태
  const [ruleForDetail, setRuleForDetail] = useState<CollectionGroupRule | null>(null);

  // 4-1. 대표거래처 요약 카드 클릭 시 연결된 종속 거래처 목록 팝업 모달 상태
  const [showConnectedStoresModal, setShowConnectedStoresModal] = useState(false);
  // 인라인 수정 중인 종속 거래처 상태
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineStoreName, setInlineStoreName] = useState('');
  const [inlineMatchType, setInlineMatchType] = useState<'exact' | 'prefix'>('exact');
  const [inlineNote, setInlineNote] = useState('');
  const [inlineApplyAll, setInlineApplyAll] = useState(true);
  const [inlineEffectiveFrom, setInlineEffectiveFrom] = useState('');

  // 대표거래처 탭/버튼 변경 시 폼 입력값의 대표상호도 즉시 동기화
  useEffect(() => {
    if (!editingId) {
      setGroupName(selectedGroupName);
    }
  }, [selectedGroupName, editingId]);

  // 5. 선택된 대표거래처와 매핑된 종속 거래처 엄격 필터링
  const mappedRules = useMemo(() => {
    if (!selectedGroupName) return [];
    const target = selectedGroupName.trim().toLowerCase();
    return (localRules || []).filter(r => {
      if (!r || !r.groupName || !r.storeName) return false;
      return r.groupName.trim().toLowerCase() === target;
    });
  }, [localRules, selectedGroupName]);

  // 6. 선택된 대표거래처의 회원 마스터 정보
  const selectedMerchantInfo = useMemo(() => {
    if (!selectedGroupName) return null;
    const clean = selectedGroupName.trim().toLowerCase();
    return merchantUsers.find(u => 
      (u.storeName && u.storeName.trim().toLowerCase() === clean) ||
      (u.name && u.name.trim().toLowerCase() === clean) ||
      (u.username && u.username.trim().toLowerCase() === clean)
    );
  }, [selectedGroupName, merchantUsers]);

  // 종속 거래처 회원 정보 검색 헬퍼
  const getSubordinateUserInfo = (subStoreName: string) => {
    if (!subStoreName) return null;
    const clean = subStoreName.trim().toLowerCase();
    return merchantUsers.find(u => 
      (u.storeName && u.storeName.trim().toLowerCase() === clean) ||
      (u.username && u.username.trim().toLowerCase() === clean) ||
      (u.name && u.name.trim().toLowerCase() === clean)
    );
  };

  // -------------------------------------------------------------
  // [3대 실제 구현 함수: handleEdit, handleUnlink, handleOpenDetail]
  // -------------------------------------------------------------

  /**
   * 1. handleEdit: 선택한 종속 거래처 정보를 상단 수정 폼으로 로드하고 스크롤 이동
   */
  const handleEdit = (item: CollectionGroupRule) => {
    if (!item) return;
    setStoreName(item.storeName);
    setGroupName(item.groupName);
    setMatchType(item.matchType || 'exact');
    setNote(item.note || '');
    if (item.effectiveFrom) {
      setApplyAllDates(false);
      setEffectiveFrom(item.effectiveFrom);
    } else {
      setApplyAllDates(true);
      setEffectiveFrom(currentDateStr || new Date().toISOString().slice(0, 10));
    }
    setEditingId(item.id);
    setFeedbackMsg({
      text: `[수정 모드] "${item.storeName}" 거래처 매핑 정보를 불러왔습니다. 내용 수정 후 완료 버튼을 누르세요.`,
      type: 'success'
    });

    setTimeout(() => {
      const formEl = document.getElementById('groupRuleForm');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  /**
   * 2. handleUnlink: 전달받은 ID의 종속 거래처 매핑을 해제하고 Firebase 및 로컬 저장
   */
  const handleUnlink = async (itemId: string) => {
    if (!itemId) return;
    const target = localRules.find(r => r.id === itemId);
    const targetName = target ? target.storeName : '거래처';

    try {
      const updated = localRules.filter(r => r.id !== itemId);
      // 1. UI 즉각 반영 (0초 체감)
      setLocalRules(updated);
      onRulesUpdated(updated);

      // 2. Firebase 단일 문서 직접 삭제 + RTDB 백업 동기화
      await deleteGroupRuleFromFirebase(itemId, updated, targetName);

      // 3. 완료 후 재확정
      onRulesUpdated(updated);
      setLocalRules(updated);

      setFeedbackMsg({ 
        text: `"${targetName}" 거래처의 대표거래처 연결(매핑)이 완전히 해제(삭제)되었습니다.`, 
        type: 'success' 
      });

      if (editingId === itemId) cancelEdit();
      if (ruleForDetail?.id === itemId) setRuleForDetail(null);

      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      console.error('규칙 삭제 오류:', err);
      const errMsg = err?.message || String(err);
      alert(`삭제 실패 원인: ${errMsg}`);
      setFeedbackMsg({ text: `거래처 연결 해제 저장 중 오류가 발생했습니다: ${errMsg}`, type: 'error' });
    }
  };

  /**
   * 3. handleOpenDetail: 행 클릭 시 해당 거래처의 상세 모달 열기
   */
  const handleOpenDetail = (item: CollectionGroupRule) => {
    if (!item) return;
    setRuleForDetail(item);
  };

  const cancelEdit = () => {
    setStoreName('');
    setNote('');
    setGroupName(selectedGroupName);
    setEditingId(null);
    setApplyAllDates(true);
    setFeedbackMsg(null);
  };

  /**
   * 4. 대표거래처 연결 거래처 모달 내부 인라인 수정/삭제 핸들러
   */
  const startInlineEdit = (item: CollectionGroupRule) => {
    setInlineEditingId(item.id);
    setInlineStoreName(item.storeName);
    setInlineMatchType(item.matchType || 'exact');
    setInlineNote(item.note || '');
    if (item.effectiveFrom) {
      setInlineApplyAll(false);
      setInlineEffectiveFrom(item.effectiveFrom);
    } else {
      setInlineApplyAll(true);
      setInlineEffectiveFrom(currentDateStr || new Date().toISOString().slice(0, 10));
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
  };

  const saveInlineEdit = async (item: CollectionGroupRule) => {
    const cleanStore = inlineStoreName.trim();
    if (!cleanStore) {
      alert('종속 거래처 상호명을 입력해 주세요.');
      return;
    }

    try {
      const updatedRules = localRules.map(r => {
        if (r.id === item.id) {
          return {
            ...r,
            storeName: cleanStore,
            matchType: inlineMatchType,
            note: inlineNote.trim(),
            effectiveFrom: inlineApplyAll ? '' : (inlineEffectiveFrom || ''),
            createdAt: r.createdAt || new Date().toISOString(),
          };
        }
        return r;
      });

      setLocalRules(updatedRules);
      onRulesUpdated(updatedRules);

      await saveGroupRulesToFirebase(updatedRules);

      onRulesUpdated(updatedRules);
      setLocalRules(updatedRules);

      setFeedbackMsg({
        text: `"${cleanStore}" 거래처 매핑 정보가 성공적으로 수정되었습니다.`,
        type: 'success'
      });
      setInlineEditingId(null);
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      console.error('인라인 수정 오류:', err);
      const errMsg = err?.message || String(err);
      alert(`저장 실패 원인: ${errMsg}`);
      setFeedbackMsg({ text: `거래처 정보 수정 중 오류가 발생했습니다: ${errMsg}`, type: 'error' });
    }
  };

  const deleteFromConnectedModal = (item: CollectionGroupRule) => {
    handleUnlink(item.id);
  };

  // 매핑 등록 및 수정 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStore = storeName.trim();
    const cleanGroup = (groupName || selectedGroupName).trim();
    const cleanNote = note.trim();

    if (!cleanStore || !cleanGroup) {
      setFeedbackMsg({ text: '종속 거래처(소속 상호)와 대표 거래처 상호를 모두 입력해주세요.', type: 'error' });
      return;
    }

    const isDuplicate = localRules.some(r => 
      r.id !== editingId &&
      r.storeName.trim().toLowerCase() === cleanStore.toLowerCase() && 
      r.groupName.trim().toLowerCase() === cleanGroup.toLowerCase() &&
      r.matchType === matchType
    );

    if (isDuplicate) {
      setFeedbackMsg({ text: '이미 해당 대표거래처에 동일한 종속 거래처 매핑 규칙이 등록되어 있습니다.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);
    try {
      let updated: CollectionGroupRule[];
      if (editingId) {
        updated = localRules.map(r => r.id === editingId ? {
          ...r,
          id: r.id,
          storeName: cleanStore,
          groupName: cleanGroup,
          effectiveFrom: applyAllDates ? '' : (effectiveFrom || ''),
          matchType,
          systemDefault: Boolean(r.systemDefault),
          createdAt: r.createdAt || new Date().toISOString(),
          note: cleanNote
        } : r);
      } else {
        const newRule: CollectionGroupRule = {
          id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          storeName: cleanStore,
          groupName: cleanGroup,
          matchType,
          effectiveFrom: applyAllDates ? '' : (effectiveFrom || ''),
          systemDefault: false,
          createdAt: new Date().toISOString(),
          note: cleanNote
        };
        updated = [...localRules, newRule];
      }

      // 1. 로컬 상태 즉각 반영 (화면 리스트에 0초 지연 즉시 반영)
      setLocalRules(updated);
      onRulesUpdated(updated);

      // 2. Firebase DB 동기화 저장 (Firestore + RTDB + LocalStorage)
      await saveGroupRulesToFirebase(updated);

      // 3. 저장 완료 후 상태 재확정
      onRulesUpdated(updated);
      setLocalRules(updated);

      if (cleanGroup !== selectedGroupName) {
        setSelectedGroupName(cleanGroup);
      }

      setFeedbackMsg({ 
        text: editingId 
          ? `"${cleanStore}" 거래처의 연결 속성이 성공적으로 수정되었습니다.` 
          : `"${cleanStore}" 거래처가 대표거래처 "${cleanGroup}"에 성공적으로 매핑되었습니다.`, 
        type: 'success' 
      });
      
      setStoreName('');
      setNote('');
      setEditingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      console.error('대표 거래처 규칙 저장 오류:', err);
      const errMsg = err?.message || String(err);
      // 저장 에러 표면화: 브라우저 alert로 실패 이유를 즉시 노출
      alert(`저장 실패 원인: ${errMsg}`);
      setFeedbackMsg({ text: `저장 실패 원인: ${errMsg}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const detailUserInfo = useMemo(() => {
    if (!ruleForDetail) return null;
    return getSubordinateUserInfo(ruleForDetail.storeName);
  }, [ruleForDetail, merchantUsers]);

  return (
    <div 
      id="groupRulesManagerModal" 
      className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain"
    >
      <div 
        className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-800 p-4 sm:p-6 my-auto flex flex-col max-h-[92vh] overflow-y-auto space-y-4 relative overscroll-contain"
      >
        
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-950 border border-violet-700 flex items-center justify-center text-violet-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-100 flex items-center gap-2">
                대표거래처 하위 매핑 관리
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                대표거래처를 선택하면 종속 거래처 목록이 실시간 전환되며, 행 클릭 시 상세 정보 조회 및 수정/삭제가 가능합니다.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ml-auto shrink-0"
          >
            [닫기]
          </button>
        </div>

        {/* 피드백 알림 메시지 */}
        {feedbackMsg && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-950/90 border border-emerald-700 text-emerald-300' 
              : 'bg-rose-950/90 border border-rose-700 text-rose-300'
          }`}>
            {feedbackMsg.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* 1. [대표거래처 선택 및 즉시 반응 버튼들] */}
        <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-violet-400" />
                <span>대표거래처 선택</span>
                <span className="text-[10px] text-gray-500 font-normal">(클릭 시 해당 대표거래처의 하위 목록으로 즉시 전환됩니다)</span>
              </label>

              {/* 드롭다운 셀렉트 박스 */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedGroupName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedGroupName(val);
                    setGroupName(val);
                  }}
                  className="border border-gray-700 rounded-lg px-3 py-2 bg-gray-900 text-gray-100 font-bold text-xs outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                >
                  {groupNames.map(g => {
                    const count = (localRules || []).filter(r => r.groupName && r.groupName.trim().toLowerCase() === g.trim().toLowerCase()).length;
                    return (
                      <option key={g} value={g}>
                        {g} ({count}개 종속 거래처)
                      </option>
                    );
                  })}
                </select>

                {/* 빠른 선택 버튼 칩 (클릭 즉시 리렌더링) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {groupNames.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setSelectedGroupName(g);
                        setGroupName(g);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                        selectedGroupName === g 
                          ? 'bg-violet-600 text-white ring-2 ring-violet-400' 
                          : 'bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white'
                      }`}
                    >
                      <Store className="w-3 h-3 text-violet-300" />
                      <span>{g}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 대표거래처 요약 카드 (클릭 시 연결된 종속 거래처 목록 조회 및 수정/삭제 팝업) */}
            <div 
              role="button"
              tabIndex={0}
              onClick={() => setShowConnectedStoresModal(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowConnectedStoresModal(true);
                }
              }}
              title="클릭하여 연결된 종속 거래처 목록을 조회하고 수정/삭제할 수 있습니다"
              className="bg-gray-900 hover:bg-violet-950/40 border border-gray-800 hover:border-violet-500/80 rounded-xl p-3 text-xs flex items-center gap-3 shrink-0 flex-wrap cursor-pointer transition shadow-xs group ring-1 ring-transparent hover:ring-violet-500/40 active:scale-[0.98]"
            >
              <div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <span>현재 대표 상호</span>
                  <span className="text-[9px] bg-violet-900/60 text-violet-300 px-1 py-0.2 rounded font-medium">선택됨</span>
                </div>
                <div className="font-bold text-violet-300 text-sm">
                  {selectedGroupName}
                </div>
              </div>
              <div className="h-6 w-px bg-gray-800 group-hover:bg-violet-800/50 transition" />
              <div>
                <div className="text-[10px] text-gray-400">사업자등록번호</div>
                <div className="font-mono text-gray-200">
                  {selectedMerchantInfo?.businessNumber || '미등록'}
                </div>
              </div>
              <div className="h-6 w-px bg-gray-800 group-hover:bg-violet-800/50 transition" />
              <div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <span>매핑된 종속 거래처</span>
                  <span className="text-[9px] text-violet-400 font-bold underline decoration-violet-500">클릭하여 관리</span>
                </div>
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>{mappedRules.length}개 바인딩</span>
                  <ChevronRight className="w-3.5 h-3.5 text-violet-400 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 자동완성 데이터리스트 */}
        <datalist id="groupRulesStoreList">
          {availableStores.map(s => <option key={s} value={s} />)}
        </datalist>

        {/* 2. [종속 거래처 등록 / 수정 폼] */}
        <form 
          id="groupRuleForm"
          onSubmit={handleSubmit} 
          className={`p-4 rounded-xl border text-xs space-y-3 transition-colors ${
            editingId 
              ? 'bg-indigo-950/40 border-indigo-700 shadow-md ring-1 ring-indigo-600/50' 
              : 'bg-gray-950 border-gray-800'
          }`}
        >
          <div className="font-bold text-gray-200 flex items-center justify-between pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              {editingId ? (
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Edit2 className="w-4 h-4" />
                  <span className="font-bold text-indigo-300">
                    종속 거래처 매핑 수정 모드: <span className="underline decoration-indigo-400">{storeName || '선택 거래처'}</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-violet-400">
                  <Link2 className="w-4 h-4" />
                  <span className="text-gray-100 font-bold">
                    [{selectedGroupName}] 에 종속 거래처 새로 묶기
                  </span>
                </div>
              )}
            </div>
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEdit} 
                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-[11px] font-medium transition cursor-pointer"
              >
                수정 취소
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-300 block mb-1">
                종속 거래처 (묶을 개별 상호명) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                list="groupRulesStoreList"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="예: 호치강남, 호치겔러리 등"
                className="w-full border border-gray-700 rounded-lg p-2.5 bg-gray-900 text-gray-100 outline-none focus:ring-2 focus:ring-violet-500 font-medium"
              />
              <p className="text-[10px] text-gray-500 mt-0.5">실제 주문에 사용되는 개별 종속 상호명</p>
            </div>

            <div>
              <label className="font-bold text-gray-300 block mb-1">
                대표 거래처 상호 (통합 관리) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="예: 호치키스"
                className="w-full border border-gray-700 rounded-lg p-2.5 bg-gray-900 text-gray-100 outline-none focus:ring-2 focus:ring-violet-500 font-bold text-violet-300"
              />
              <p className="text-[10px] text-gray-500 mt-0.5">모든 주문을 통합 조회할 대표 거래처 상호</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="font-bold text-gray-300 block mb-1">일치 규칙 (매칭 방식)</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as 'exact' | 'prefix')}
                className="w-full border border-gray-700 rounded-lg p-2 bg-gray-900 text-gray-100 outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
              >
                <option value="exact">이 상호만 (완전 일치 - 권장)</option>
                <option value="prefix">이 글자로 시작하는 모든 상호 (접두사 일치)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-300 block mb-1">적용 대상 일자</label>
              <div className="flex items-center gap-2 mb-1.5 pt-0.5">
                <input
                  type="checkbox"
                  id="applyAllDatesCheck"
                  checked={applyAllDates}
                  onChange={(e) => setApplyAllDates(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 bg-gray-900 border-gray-700 focus:ring-violet-500 cursor-pointer"
                />
                <label htmlFor="applyAllDatesCheck" className="text-xs text-gray-300 cursor-pointer select-none">
                  모든 주문에 적용 (과거/현재)
                </label>
              </div>
              {!applyAllDates && (
                <input
                  type="date"
                  required
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full border border-gray-700 rounded-lg p-2 bg-gray-900 text-gray-100 outline-none focus:ring-2 focus:ring-violet-500"
                />
              )}
            </div>

            <div>
              <label className="font-bold text-gray-300 block mb-1">
                매핑 비고 (연결 특이사항 / 메모)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 강남점 통합 정산, 구상호명 등"
                className="w-full border border-gray-700 rounded-lg p-2 bg-gray-900 text-gray-100 outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2 text-white cursor-pointer active:scale-98 ${
              editingId ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-violet-600 hover:bg-violet-500'
            }`}
          >
            {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{editingId ? '종속 거래처 매핑 속성 수정 완료' : '종속 거래처 매핑 등록 (실시간 저장)'}</span>
          </button>
        </form>

        {/* 3. [테이블 강제 노출: 뼈대 고정 및 스크롤 영역] */}
        <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950 flex flex-col text-xs shadow-inner">
          <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-gray-100 text-xs sm:text-sm">
                [{selectedGroupName}] 종속 거래처 목록 (매핑 리스트)
              </span>
              <span className="text-[11px] bg-violet-950 text-violet-300 border border-violet-800 px-2 py-0.5 rounded-full font-bold">
                {mappedRules.length}개 바인딩
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span className="bg-gray-800/80 px-2 py-0.5 rounded text-gray-300 border border-gray-700">
                💡 행 클릭 시 상세 정보 팝업
              </span>
              <span>•</span>
              <span>우측 <b>[수정]</b> 또는 <b>[삭제]</b></span>
            </div>
          </div>

          {/* 항상 렌더링되는 고정 테이블 뼈대 */}
          <div className="overflow-x-auto min-h-[220px]">
            <table className="w-full text-left text-xs text-gray-300 divide-y divide-gray-800">
              <thead className="bg-gray-900 text-gray-400 uppercase text-[10px] tracking-wider font-semibold sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 bg-gray-900 whitespace-nowrap">종속 거래처 코드</th>
                  <th className="py-2.5 px-3 bg-gray-900 whitespace-nowrap">거래처명</th>
                  <th className="py-2.5 px-3 bg-gray-900 whitespace-nowrap">사업자번호</th>
                  <th className="py-2.5 px-3 bg-gray-900 whitespace-nowrap">비고 (메모)</th>
                  <th className="py-2.5 px-3 bg-gray-900 whitespace-nowrap">매핑 일자</th>
                  <th className="py-2.5 px-3 text-center bg-gray-900 whitespace-nowrap">매핑 관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 bg-gray-950/40">
                {mappedRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Building2 className="w-8 h-8 text-gray-600 mb-2 opacity-60" />
                        <p className="font-bold text-sm text-gray-200">
                          연결된 종속 거래처가 없습니다
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          [{selectedGroupName}] 대표거래처에 매핑된 하위 거래처가 없습니다.
                        </p>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          상단 입력 폼에서 종속시킬 거래처 상호명을 입력하고 등록 버튼을 눌러주세요.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  mappedRules.map((item) => {
                    const subUser = getSubordinateUserInfo(item.storeName);
                    const subCode = subUser?.username || item.id;
                    const subBizNum = subUser?.businessNumber || '-';
                    const mappingDate = item.createdAt ? item.createdAt.slice(0, 10) : (item.effectiveFrom || '-');
                    const isEditing = editingId === item.id;

                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => handleOpenDetail(item)}
                        className={`transition cursor-pointer group ${
                          isEditing 
                            ? 'bg-indigo-950/40 border-l-2 border-indigo-500' 
                            : 'hover:bg-violet-950/20 hover:text-white'
                        }`}
                        title="클릭하여 거래처 상세 정보를 확인하세요"
                      >
                        <td className="py-3 px-3 font-mono text-gray-300 whitespace-nowrap">
                          <span className="bg-gray-900 border border-gray-750 px-2 py-0.5 rounded text-[11px] text-gray-300 group-hover:border-violet-600 group-hover:text-violet-200 transition">
                            {subCode}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-gray-100 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-100 font-bold group-hover:text-violet-300 transition">
                              {item.storeName}
                            </span>
                            {item.matchType === 'prefix' ? (
                              <span className="text-[9px] bg-amber-950/70 border border-amber-700/80 text-amber-300 px-1.5 py-0.5 rounded font-medium">
                                접두사 일치*
                              </span>
                            ) : (
                              <span className="text-[9px] bg-gray-800 border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                                완전 일치
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-400 whitespace-nowrap">
                          {subBizNum}
                        </td>
                        <td className="py-3 px-3 text-gray-400 whitespace-nowrap max-w-[140px] truncate">
                          {item.note ? (
                            <span className="text-gray-300 text-[11px]" title={item.note}>
                              {item.note}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-400 whitespace-nowrap text-[11px]">
                          {mappingDate}
                        </td>
                        <td 
                          className="py-3 px-3 text-center whitespace-nowrap" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                alert(`${item.storeName} 수정창 호출`);
                                handleEdit(item);
                              }}
                              className="bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 hover:text-indigo-100 px-2.5 py-1 rounded-lg transition text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                              title="매핑 정보 수정"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>수정</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnlink(item.id);
                              }}
                              className="bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-rose-100 px-2.5 py-1 rounded-lg transition text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                              title="해당 거래처 매핑 해제(즉시 삭제)"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                              <span>삭제</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 바닥글 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <div className="text-[11px] text-gray-500">
            현재 대표거래처 [{selectedGroupName}] 에 <span className="text-violet-300 font-bold">{mappedRules.length}</span>개의 종속 거래처가 매핑되어 있습니다.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>

        {/* 4. 행 클릭 시 거래처 상세 조회 팝업 모달 */}
        {ruleForDetail && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[350] flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-700 p-5 overflow-hidden animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-950 border border-violet-700 flex items-center justify-center text-violet-400">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-gray-100 flex items-center gap-2">
                      <span>{ruleForDetail.storeName}</span>
                      <span className="text-[11px] bg-violet-950 text-violet-300 border border-violet-800 px-2 py-0.5 rounded-md font-medium">
                        종속 거래처 상세
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      대표거래처 <span className="text-violet-300 font-bold">[{ruleForDetail.groupName}]</span> 에 바인딩된 거래처 정보
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRuleForDetail(null)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ml-auto shrink-0"
                >
                  [닫기]
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs max-h-[60vh] overflow-y-auto overscroll-contain">
                {/* 1) 대표거래처 매핑 속성 */}
                <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                  <div className="text-[11px] font-bold text-violet-400 flex items-center gap-1.5 pb-1.5 border-b border-gray-800">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>대표거래처 매핑 속성</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">대표 거래처명</span>
                      <span className="font-bold text-violet-300 text-sm">{ruleForDetail.groupName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">매칭 방식 (일치 규칙)</span>
                      <span className="font-medium text-gray-200">
                        {ruleForDetail.matchType === 'prefix' ? '접두사 일치 (해당 상호로 시작)' : '완전 일치 (정확한 상호명만)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">적용 대상 일자</span>
                      <span className="font-medium text-gray-200">
                        {ruleForDetail.effectiveFrom ? `${ruleForDetail.effectiveFrom} 이후 주문 적용` : '전체 일자 (과거/현재/미래)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">매핑 등록일자</span>
                      <span className="font-mono text-gray-300">
                        {ruleForDetail.createdAt ? ruleForDetail.createdAt.slice(0, 10) : '-'}
                      </span>
                    </div>
                  </div>

                  {ruleForDetail.note && (
                    <div className="pt-2 border-t border-gray-800/80">
                      <span className="text-gray-400 block text-[10px] mb-0.5">매핑 비고 (메모)</span>
                      <div className="bg-gray-900 p-2 rounded-lg text-gray-200 text-xs border border-gray-800">
                        {ruleForDetail.note}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2) 거래처 마스터(회원) 정보 */}
                <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-800 space-y-2.5">
                  <div className="text-[11px] font-bold text-gray-300 flex items-center justify-between pb-1.5 border-b border-gray-800">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>거래처 마스터(회원) 정보</span>
                    </div>
                    {detailUserInfo ? (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">
                        회원 등록 확인
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded">
                        상호명만 매핑됨 (회원 미등록)
                      </span>
                    )}
                  </div>

                  {detailUserInfo ? (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-400 block text-[10px]">거래처 코드(ID)</span>
                          <span className="font-mono font-bold text-gray-100">{detailUserInfo.username}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">대표자명</span>
                          <span className="font-medium text-gray-200">{detailUserInfo.name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">사업자등록번호</span>
                          <span className="font-mono font-bold text-gray-200">
                            {detailUserInfo.businessNumber || '미등록'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">연락처</span>
                          <span className="font-mono text-gray-200">{detailUserInfo.phone || '미등록'}</span>
                        </div>
                      </div>

                      {detailUserInfo.address && (
                        <div className="pt-1.5">
                          <span className="text-gray-400 block text-[10px]">배송 주소</span>
                          <span className="text-gray-200">{detailUserInfo.address}</span>
                        </div>
                      )}

                      {detailUserInfo.assignedRegion && (
                        <div className="pt-1">
                          <span className="text-gray-400 block text-[10px]">담당 지역</span>
                          <span className="text-gray-200">{detailUserInfo.assignedRegion}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-gray-400 text-xs">
                      <p>해당 상호명과 정확히 일치하는 상가 회원 계정이 없습니다.</p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        주문서 엑셀 상의 상호명 <span className="text-gray-300 font-bold">"{ruleForDetail.storeName}"</span> 으로 대표거래처에 묶여 통합 정산됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 팝업 하단 버튼 */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = ruleForDetail;
                      setRuleForDetail(null);
                      handleEdit(target);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>매핑 수정</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = ruleForDetail;
                      setRuleForDetail(null);
                      if (target) {
                        handleUnlink(target.id);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>매핑 해제(삭제)</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setRuleForDetail(null)}
                  className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. [대표거래처 요약 카드 클릭 시] 연결된 종속 거래처 전용 조회 및 수정/삭제 팝업 모달 */}
        {showConnectedStoresModal && (
          <div 
            id="connectedStoresListModal"
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[360] flex items-center justify-center p-3 sm:p-5 overflow-y-auto overscroll-contain"
          >
            <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-violet-700/80 p-5 overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[88vh]">
              {/* 모달 상단 헤더 */}
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-950 border border-violet-500 flex items-center justify-center text-violet-300 shrink-0 shadow-xs">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base sm:text-lg text-gray-100 flex items-center gap-2">
                      <span className="text-violet-300">[{selectedGroupName}]</span>
                      <span>연결 종속 거래처</span>
                      <span className="text-xs bg-violet-950 text-violet-300 border border-violet-600 px-2.5 py-0.5 rounded-full font-bold">
                        {mappedRules.length}개 바인딩
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      대표거래처 <b className="text-violet-300">"{selectedGroupName}"</b>에 연결되어 한 그룹으로 묶인 종속 상호명 목록입니다. 각 거래처의 수정 및 삭제(매핑 해제)가 가능합니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectedStoresModal(false);
                    cancelInlineEdit();
                  }}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs sm:text-sm font-bold rounded-lg transition-colors cursor-pointer ml-auto shrink-0"
                >
                  [닫기]
                </button>
              </div>

              {/* 연결 거래처 목록 내용 */}
              <div className="py-4 space-y-3 text-xs overflow-y-auto flex-1 pr-1 overscroll-contain">
                {mappedRules.length === 0 ? (
                  <div className="py-12 px-4 text-center bg-gray-950 rounded-xl border border-gray-800">
                    <Building2 className="w-10 h-10 text-gray-600 mx-auto mb-2 opacity-60" />
                    <p className="font-bold text-sm text-gray-200">
                      연결된 종속 거래처가 없습니다
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      [{selectedGroupName}] 대표거래처에 묶인 거래처가 아직 등록되지 않았습니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowConnectedStoresModal(false);
                        const inputEl = document.querySelector('input[list="groupRulesStoreList"]') as HTMLInputElement;
                        if (inputEl) {
                          inputEl.focus();
                          inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>새 종속 거래처 등록하기</span>
                    </button>
                  </div>
                ) : (
                  mappedRules.map((item, idx) => {
                    const subUser = getSubordinateUserInfo(item.storeName);
                    const isInline = inlineEditingId === item.id;

                    return (
                      <div 
                        key={item.id}
                        className={`rounded-xl border transition-all p-3.5 ${
                          isInline 
                            ? 'bg-violet-950/50 border-violet-500 ring-1 ring-violet-500/50' 
                            : 'bg-gray-950 border-gray-800 hover:border-violet-900/60'
                        }`}
                      >
                        {isInline ? (
                          /* 인라인 수정 폼 */
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-violet-900/60 text-violet-300 font-bold">
                              <span className="flex items-center gap-1.5">
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>종속 거래처 정보 수정</span>
                              </span>
                              <span className="text-[10px] text-gray-400">ID: {item.id}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[10px] text-gray-400 block mb-1 font-bold">
                                  종속 상호명 <span className="text-rose-400">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={inlineStoreName}
                                  onChange={(e) => setInlineStoreName(e.target.value)}
                                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-100 font-bold text-xs focus:ring-1 focus:ring-violet-500 outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-gray-400 block mb-1 font-bold">
                                  매칭 방식
                                </label>
                                <select
                                  value={inlineMatchType}
                                  onChange={(e) => setInlineMatchType(e.target.value as 'exact' | 'prefix')}
                                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-100 text-xs focus:ring-1 focus:ring-violet-500 outline-none cursor-pointer"
                                >
                                  <option value="exact">완전 일치 (이 상호만)</option>
                                  <option value="prefix">접두사 일치 (이 상호로 시작)</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[10px] text-gray-400 block mb-1 font-bold">
                                  비고 (메모)
                                </label>
                                <input
                                  type="text"
                                  value={inlineNote}
                                  onChange={(e) => setInlineNote(e.target.value)}
                                  placeholder="특이사항 메모"
                                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-100 text-xs focus:ring-1 focus:ring-violet-500 outline-none"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] text-gray-400 block mb-1 font-bold">
                                  적용 기간
                                </label>
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-1 text-[11px] text-gray-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={inlineApplyAll}
                                      onChange={(e) => setInlineApplyAll(e.target.checked)}
                                      className="rounded bg-gray-900 border-gray-700 text-violet-600"
                                    />
                                    <span>전체</span>
                                  </label>
                                  {!inlineApplyAll && (
                                    <input
                                      type="date"
                                      value={inlineEffectiveFrom}
                                      onChange={(e) => setInlineEffectiveFrom(e.target.value)}
                                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-gray-100 text-[11px]"
                                    />
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-violet-900/40">
                              <button
                                type="button"
                                onClick={cancelInlineEdit}
                                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium cursor-pointer transition"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => saveInlineEdit(item)}
                                className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>수정 완료 저장</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* 일반 조회 카드 */
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-mono text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-800">
                                  #{idx + 1}
                                </span>
                                <span className="font-bold text-gray-100 text-sm">
                                  {item.storeName}
                                </span>
                                {item.matchType === 'prefix' ? (
                                  <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-medium">
                                    접두사 일치
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
                                    완전 일치
                                  </span>
                                )}
                                {subUser ? (
                                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-medium">
                                    회원: {subUser.username} {subUser.name ? `(${subUser.name})` : ''}
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                                    회원계정 없음 (상호 매핑)
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                                {subUser?.businessNumber && (
                                  <span>사업자: <b className="text-gray-300 font-mono">{subUser.businessNumber}</b></span>
                                )}
                                {subUser?.phone && (
                                  <span>연락처: <b className="text-gray-300 font-mono">{subUser.phone}</b></span>
                                )}
                                <span>
                                  적용: <b className="text-gray-300">{item.effectiveFrom ? `${item.effectiveFrom}~` : '전체 기간'}</b>
                                </span>
                                {item.note && (
                                  <span className="text-violet-300 bg-violet-950/50 px-1.5 py-0.2 rounded border border-violet-900/80">
                                    비고: {item.note}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 관리 액션 버튼: 수정 & 삭제 */}
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => startInlineEdit(item)}
                                className="px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                                title="이 거래처 정보 바로 수정하기"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>수정</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteFromConnectedModal(item)}
                                className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                                title="이 거래처 매핑 해제(삭제)"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                                <span>삭제</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 모달 하단 바닥글 */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectedStoresModal(false);
                    const inputEl = document.querySelector('input[list="groupRulesStoreList"]') as HTMLInputElement;
                    if (inputEl) {
                      inputEl.focus();
                      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-violet-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ 새 종속 거래처 등록</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowConnectedStoresModal(false);
                    cancelInlineEdit();
                  }}
                  className="px-5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
