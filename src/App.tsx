import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, Suspense, lazy } from 'react';
import * as XLSX from 'xlsx';
import { User, Transaction, CollectionRecord, CollectionGroupRule } from './types';
import {
  syncFirebaseUsers,
  syncFirebaseOrders,
    deleteOrderFromFirebase,
  saveOrderToFirebase,
  firebaseSignOutUser,
  getBusinessDate,
  checkOrderTimeAllowed,
  normalizeMarketName,
  formatMoney,
  SEED_USERS,
  factoryResetDatabase,
  saveOrdersBulkToFirebase,
  normalizeDateStr,
  getMarkets,
  saveMarkets,
  firestore
} from './lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  getSessionUser,
  setSessionUser,
  clearSessionUser,
  getLocalUsers,
  saveLocalUser,
  saveTransactionsToIndexedDB,
  updateTransactionInIndexedDB,
  loadTransactionsFromIndexedDB,
  loadCollections,
  saveCollections
} from './lib/storage';

import { Navbar } from './components/Navbar';
import { AuthScreen } from './components/AuthScreen';
import { CalendarView } from './components/CalendarView';

const AdminAddModal = lazy(() => import('./components/AdminAddModal').then(module => ({ default: module.AdminAddModal })));
const AdminUserManagementModal = lazy(() => import('./components/AdminUserManagementModal').then(module => ({ default: module.AdminUserManagementModal })));
const ProfileModal = lazy(() => import('./components/ProfileModal').then(module => ({ default: module.ProfileModal })));
const OrderEntryModal = lazy(() => import('./components/OrderEntryModal').then(module => ({ default: module.OrderEntryModal })));
const AiOrderImportModal = lazy(() => import('./components/AiOrderImportModal').then(module => ({ default: module.AiOrderImportModal })));
const CollectionScreen = lazy(() => import('./components/CollectionScreen').then(module => ({ default: module.CollectionScreen })));
const GroupRulesManagerModal = lazy(() => import('./components/GroupRulesManagerModal').then(module => ({ default: module.GroupRulesManagerModal })));
const BuyerWorkdayScreen = lazy(() => import('./components/BuyerWorkdayScreen').then(module => ({ default: module.BuyerWorkdayScreen })));
const BuyerWorkdayStatsScreen = lazy(() => import('./components/BuyerWorkdayStatsScreen').then(module => ({ default: module.BuyerWorkdayStatsScreen })));
const BoardScreen = lazy(() => import('./components/BoardScreen').then(module => ({ default: module.BoardScreen })));
const ExcelImportWizard = lazy(() => import('./components/ExcelImportWizard').then(module => ({ default: module.ExcelImportWizard })));
const LocalMerchantInfoModal = lazy(() => import('./components/LocalMerchantInfoModal').then(module => ({ default: module.LocalMerchantInfoModal })));
const DataManagementModal = lazy(() => import('./components/DataManagementModal').then(module => ({ default: module.DataManagementModal })));
const BuildingManagerModal = lazy(() => import('./components/BuildingManagerModal').then(module => ({ default: module.BuildingManagerModal })));

import { Search } from 'lucide-react';

export default function App() {
  // Global Data State
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
      const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // App Navigation & Selection State
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getBusinessDate());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Filter State (Search Only)
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Modal State
  const [showAdminAddModal, setShowAdminAddModal] = useState(false);
  const [showAdminUserManagementModal, setShowAdminUserManagementModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTargetUsername, setProfileTargetUsername] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [showBuyerWorkdayScreen, setShowBuyerWorkdayScreen] = useState(false);
  const [showBuyerWorkdayStatsScreen, setShowBuyerWorkdayStatsScreen] = useState(false);
  const [showBoardScreen, setShowBoardScreen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Request Notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [collectionGroupRules, setCollectionGroupRules] = useState<CollectionGroupRule[]>([]);
  const [showCollectionScreen, setShowCollectionScreen] = useState(false);
  const [showGroupRulesModal, setShowGroupRulesModal] = useState(false);

  const [showMerchantInfoModal, setShowMerchantInfoModal] = useState(false);
    const [showDataManagementModal, setShowDataManagementModal] = useState(false);
  const [showBuildingManagerModal, setShowBuildingManagerModal] = useState(false);
  const [fetchedMarkets, setFetchedMarkets] = useState<string[]>(['APM', 'APM 럭스', 'APM 플레이스', '팀204', '디자이너', '누죤', '골든상가', '샤넬 마네킹', '대일 마네킹', '에소르', '누누', '유어스', '벨포스트', '퀸즈', '광희', '제일평화', '맥스타일', '신평화', '남평화', '동평화', '아트', '더블유 스튜디오', '해양', '동원', '테크노', '청평화', '신발상가', '디오트', '픽대지', '상상', '자판', '남대', '세로나', '포키', '원', '시티', '페인트', '부르뎅', '마마', '웅이', '화이트', '탑', '크레용', '키즈', '팀엔드']);
  const [pendingExcelRows, setPendingExcelRows] = useState<any[] | null>(null);

  // Pre-normalize transaction records helper
  const cleanTransactions = useCallback((txs: Transaction[]): Transaction[] => {
    return txs
      .map(t => ({
        ...t,
        date: normalizeDateStr(t.date || t.businessDate || ''),
        market: normalizeMarketName(t.market || ''),
        status: (t.status || '').trim() === '미완료' ? '' : (t.status || '').trim(),
        expense: Number(t.expense) || 0,
        income: Number(t.income) || 0
      }))
      .filter(t => {
        const hasStore = t.store && t.store.trim() !== '';
        const hasExpense = t.expense !== 0;
        const hasIncome = t.income !== 0;
        return hasStore || hasExpense || hasIncome;
      });
  }, []);

  const setCleanTransactions = useCallback((txs: Transaction[]) => {
    setTransactions(cleanTransactions(txs));
  }, [cleanTransactions]);

  // 1. Initial Local Storage & Session Setup
  useEffect(() => {
    async function init() {

      getMarkets().then(m => {
        if (m && m.length > 0) setFetchedMarkets(m);
      }).catch(() => {});

      try {
        const [cachedUser, localUsers, cachedTxs, cachedCollections] = await Promise.race([
          Promise.all([
            getSessionUser(),
            getLocalUsers(),
            loadTransactionsFromIndexedDB(),
            Promise.resolve(loadCollections())
          ]),
          new Promise<any[]>((resolve) => setTimeout(() => resolve([null, [], [], []]), 2000))
        ]);

        if (cachedUser) {
          setCurrentUser(cachedUser);
          if (cachedUser.role === 'buyer') {
            setShowBuyerWorkdayScreen(true);
          } else if (cachedUser.role === 'merchant') {
            setShowOrderModal(true);
          }
        }

        if (localUsers.length > 0) {
          // Ensure seed users are also available in local list
          const merged = [...localUsers];
          SEED_USERS.forEach(su => {
            if (!merged.some(u => u.username === su.username)) {
              merged.push(su);
              saveLocalUser(su).catch(() => {});
            }
          });
          setUsers(merged);
        } else {
          setUsers(SEED_USERS);
          for (const su of SEED_USERS) {
            saveLocalUser(su).catch(() => {});
          }
        }

        if (cachedTxs.length > 0) {
          setCleanTransactions(cachedTxs);
        } else {
          setTransactions([]);
        }

        if (cachedCollections.length > 0) {
        }
      } catch (e) {
        console.warn('Init error:', e);
      }
      setIsInitializing(false);
    }
    init();
  }, [cleanTransactions, setCleanTransactions]);

  // 2. Real-time Firebase Sync Listeners
  useEffect(() => {
    const unsubUsers = syncFirebaseUsers((firebaseUsers) => {
      if (firebaseUsers.length > 0) {
        setUsers(firebaseUsers);
        firebaseUsers.forEach(u => saveLocalUser(u));

        // Keep currentUser updated with latest permissions/approval
        if (currentUser) {
          const fresh = firebaseUsers.find(u => u.username === currentUser.username);
          if (fresh) {
            setCurrentUser(fresh);
            setSessionUser(fresh);
          }
        }
      }
    });

    const unsubOrders = syncFirebaseOrders((firebaseOrders) => {
      // Check if this is an update (not initial load) and if there are new orders relevant to current user
      if (transactions.length > 0 && currentUser?.role === 'buyer') {
        // Compare previous and new orders to find additions
        const prevIds = new Set(transactions.map(t => t.id));
        const newOrders = firebaseOrders.filter(t => !prevIds.has(t.id));
        
        if (newOrders.length > 0) {
          // Find orders that match the buyer's assigned markets/regions
          const relevantNewOrders = newOrders.filter(order => {
            if (currentUser.isBuyerAdmin) return true; // Admin sees all new orders
            
            let isRelevant = false;
            if (currentUser.allowedMarkets && currentUser.allowedMarkets.length > 0) {
              const normMarket = normalizeMarketName(order.market);
              isRelevant = currentUser.allowedMarkets.some(m => normalizeMarketName(m) === normMarket);
            }
            if (!isRelevant && currentUser.assignedRegion && currentUser.assignedRegion !== '전체') {
              isRelevant = order.region === currentUser.assignedRegion;
            }
            return isRelevant;
          });

          if (relevantNewOrders.length > 0) {
            const orderText = relevantNewOrders.length === 1 
              ? `${relevantNewOrders[0].market} ${relevantNewOrders[0].store}`
              : `${relevantNewOrders.length}건의 주문`;
              
            setToastMessage(`🔔 새 주문 알림: ${orderText}`);
            setTimeout(() => setToastMessage(null), 5000); // 5초 후 사라짐

            if ('Notification' in window && Notification.permission === 'granted') {
              if (document.hidden) {
                new Notification('사입ON - 새 주문 알림', {
                  body: orderText,
                  icon: '/pwa-192x192.png',
                });
              }
            }
          }
        }
      }

      setCleanTransactions(firebaseOrders);
      saveTransactionsToIndexedDB(firebaseOrders);
    });


    return () => {
      unsubUsers();
      unsubOrders();
          };
  }, [currentUser?.username, setCleanTransactions, transactions]);

  // Handle Login & Logout
  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await setSessionUser(user);
    if (user.role === 'buyer') {
      setShowBuyerWorkdayScreen(true);
    } else if (user.role === 'merchant') {
      setShowOrderModal(true);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseSignOutUser();
    } catch (e) {
      console.warn('Firebase logout warning:', e);
    }
    await clearSessionUser();
    setCurrentUser(null);
    setShowBuyerWorkdayScreen(false);
  };

  // Role-based visibility base
  const roleFilteredTransactions = useMemo(() => {
    if (currentUser?.role === 'admin' || currentUser?.isBuyerAdmin || !currentUser) {
      return transactions;
    }

    const allowedMarkets = (currentUser?.role === 'buyer' && currentUser.allowedMarkets)
      ? new Set((currentUser.allowedMarkets || []).map(normalizeMarketName))
      : null;

    let assignedUsernames: string[] = [];
    let assignedStores = new Set<string>();
    
    if (currentUser?.role === 'local') {
      assignedUsernames = currentUser.assignedMerchants || [];
      assignedStores = new Set(
        users.filter(u => assignedUsernames.includes(u.username) && u.storeName)
             .map(u => u.storeName as string)
      );
    }

    return transactions.filter(t => {
      if (currentUser?.role === 'merchant') {
        const isOwner = t.merchantId === currentUser.username || t.store === currentUser.storeName;
        if (!isOwner) return false;
      }

      if (currentUser?.role === 'buyer') {
        if (allowedMarkets && allowedMarkets.size > 0 && !allowedMarkets.has(t.market)) {
          return false;
        }
      }

      if (currentUser?.role === 'local') {
        const isAssigned = 
          assignedUsernames.includes(t.merchantId || '') || 
          (t.store && assignedStores.has(t.store));
        if (!isAssigned) return false;
      }

      return true;
    });
  }, [transactions, currentUser, users]);


  // Memoized distinct values for dropdowns & filters
  const allMarkets: string[] = useMemo(() => ([...new Set([
    ...fetchedMarkets
  ])].filter(m => Boolean(m) && !['미수금', '결산', '회식비', '식대', '식비', '경비', '입금'].includes(m.trim())) as string[]), [fetchedMarkets]);

  const stores: string[] = useMemo(() => ([...new Set(roleFilteredTransactions.map(t => t.store).filter(Boolean))] as string[]).sort((a, b) => a.localeCompare(b, 'ko')), [roleFilteredTransactions]);

  const availableRegions: string[] = useMemo(() => {
    const reg = ([...new Set(roleFilteredTransactions.map(t => t.region).filter(Boolean))] as string[]).sort((a, b) => a.localeCompare(b, 'ko'));
    if (!reg.includes('합성동')) reg.unshift('합성동');
    return reg;
  }, [roleFilteredTransactions]);

  const managers: string[] = useMemo(() => ([...new Set([
    ...users.filter(u => u.role === 'buyer' || u.role === 'local').map(u => u.name),
    ...roleFilteredTransactions.map(t => t.manager)
  ])].filter(Boolean) as string[]).sort((a, b) => a.localeCompare(b, 'ko')), [users, roleFilteredTransactions]);

  // Memoized Filtering Logic (Search Only)
  const filteredTransactions = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    if (!q) return roleFilteredTransactions;

    return roleFilteredTransactions.filter(t => {
      const combined = `${t.store} ${t.manager} ${t.market} ${t.region} ${t.status} ${t.remark}`.toLowerCase();
      return combined.includes(q);
    });
  }, [roleFilteredTransactions, deferredSearchQuery]);

  // Month navigation
  const handleChangeMonth = useCallback((delta: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }, []);

  const handleGoToToday = useCallback(() => {
    const todayStr = getBusinessDate();
    setSelectedDateStr(todayStr);
    const [y, m] = todayStr.split('-').map(Number);
    setCurrentDate(new Date(y, m - 1, 1));
  }, []);

  // Transaction Actions
  const handleOpenAddModal = useCallback(() => {
    if (currentUser?.role !== 'admin' && !checkOrderTimeAllowed()) return;
    setEditingTransaction(null);
    setShowOrderModal(true);
  }, [currentUser]);

  const handleEditTransaction = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setShowOrderModal(true);
  }, []);

  const handleDeleteTransaction = useCallback(async (id: string) => {
    setTransactions(prev => {
      const target = prev.find(t => t.id === id);
      const updated = prev.filter(t => t.id !== id);
      saveTransactionsToIndexedDB(updated).catch(console.warn);
      if (target) {
        deleteOrderFromFirebase(target).catch(console.warn);
      }
      return updated;
    });
  }, []);

  const handleUpdateTransaction = useCallback(async (updatedTx: Transaction) => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === updatedTx.id ? updatedTx : t);
      saveTransactionsToIndexedDB(updated).catch(console.warn);
      return updated;
    });
    if (currentUser?.isFirebaseLinked) {
      try {
        await saveOrderToFirebase(updatedTx);
      } catch (e) {
        console.warn('Firebase sync error on update:', e);
      }
    }
  }, [currentUser?.isFirebaseLinked]);

  const handleToggleComplete = useCallback(async (id: string) => {
    let targetTx: Transaction | undefined;
    setTransactions(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          const isComp = (t.status || '').trim() !== '';
          targetTx = { ...t, status: isComp ? '' : '완료' };
          return targetTx;
        }
        return t;
      });
      if (targetTx) {
        updateTransactionInIndexedDB(targetTx).catch(console.warn);
        saveOrderToFirebase(targetTx).catch(e => console.warn('Firebase sync on toggle complete error:', e));
      }
      return updated;
    });
  }, []);

  const handleCompleteTransaction = useCallback(async (id: string) => {
    let targetTx: Transaction | undefined;
    setTransactions(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          targetTx = { ...t, status: '주문찾기' };
          return targetTx;
        }
        return t;
      });
      if (targetTx) {
        updateTransactionInIndexedDB(targetTx).catch(console.warn);
        saveOrderToFirebase(targetTx).catch(e => console.warn('Firebase sync on complete error:', e));
      }
      return updated;
    });
  }, []);

  const handleOpenAiModal = useCallback(() => setShowAiModal(true), []);
  const handleOpenWorkdayStats = useCallback(() => setShowBuyerWorkdayStatsScreen(true), []);
  
  const handleSelectDate = useCallback((dateStr: string, hasData: boolean) => {
    setSelectedDateStr(dateStr);
    if (!hasData && currentUser?.role === 'merchant') {
      if (currentUser?.role !== 'admin' && !checkOrderTimeAllowed()) return;
      setEditingTransaction(null);
      setShowOrderModal(true);
    }
  }, [currentUser]);

  const handleImportOrders = useCallback((newOrders: Transaction[]) => {
    setTransactions(prev => {
      const allTxs = [...prev, ...newOrders];
      const cleaned = cleanTransactions(allTxs);
      saveTransactionsToIndexedDB(cleaned);
      return cleaned;
    });
  }, [cleanTransactions]);
  const handleOpenOrderDetail = useCallback((id: string) => {
    setTransactions(prev => {
      const found = prev.find(t => t.id === id);
      if (found) {
        setEditingTransaction(found);
        setShowOrderModal(true);
      }
      return prev;
    });
  }, []);

  const handleSaveCollection = useCallback(async (colInput: CollectionRecord | CollectionRecord[]) => {
    const colsToSave = Array.isArray(colInput) ? colInput : [colInput];
    if (colsToSave.length === 0) return;

    setCollections(prev => {
      const updated = [...colsToSave, ...prev];
      saveCollections(updated);
      return updated;
    });

    const newTxs: Transaction[] = colsToSave.map((col, idx) => ({
      id: col.id || `col_tx_${Date.now()}_${idx}`,
      date: col.date,
      businessDate: col.date,
      market: '입금',
      store: col.store,
      localManager: col.localManager,
      income: col.amount,
      expense: 0,
      remark: col.note ? `수금 (${col.note})` : '수금',
      manager: '',
      region: '',
      floor: '',
      room: '',
      status: '완료',
      createdAt: new Date().toISOString()
    }));

    setTransactions(prev => {
      const updatedTx = [...newTxs, ...prev];
      saveTransactionsToIndexedDB(updatedTx);
      // Wait for currentUser? We can just pass currentUser as a dependency
      return updatedTx;
    });
    
    // Defer the firebase sync to not block
    if (currentUser?.isFirebaseLinked) {
      saveOrdersBulkToFirebase(newTxs).catch(console.error);
    }
  }, [currentUser?.isFirebaseLinked]);

  // Excel Handlers
  const handleExcelExport = () => {
    if (transactions.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    const rows = [
      ['날짜', '담당자', '지역', '상호', '건물명', '층', '호수', '대납금', '입금액', '상태', '비고']
    ];

    transactions.forEach(t => {
      rows.push([
        t.date || '',
        t.manager || '',
        t.region || '',
        t.store || '',
        t.market || '',
        t.floor || '',
        t.room || '',
        ((t.expense || 0) * 1000).toString(),
        ((t.income || 0) * 1000).toString(),
        t.status || '',
        t.remark || ''
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, '합성동사입원장');
    XLSX.writeFile(wb, `사입ON_정산장부_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExcelImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames.find(n => /주문|사입|원장|내역|Sheet1|data/i.test(n)) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rawJson.length < 2) {
          alert('가져올 데이터가 없습니다.');
          return;
        }

        // Find the best header row within first 10 rows
        const keywords = ['날짜', '일자', '일시', '담당', '삼촌', '상호', '거래처', '매장', '건물', '시장', '상가', '층', '호수', '호', '대납', '지출', '금액', '입금', '수금', '상태', '비고', '메모'];
        let bestHeaderRowIndex = 0;
        let maxMatches = -1;

        for (let r = 0; r < Math.min(10, rawJson.length); r++) {
          const row = rawJson[r] || [];
          let matches = 0;
          row.forEach(cell => {
            const cellStr = String(cell || '').replace(/\s+/g, '');
            if (keywords.some(k => cellStr.includes(k))) {
              matches++;
            }
          });
          if (matches > maxMatches) {
            maxMatches = matches;
            bestHeaderRowIndex = r;
          }
        }

        const headers = rawJson[bestHeaderRowIndex] || [];
        const findIdx = (kws: string[], def = -1) => {
          for (const k of kws) {
            const idx = headers.findIndex(h => String(h).replace(/\s+/g, '').toLowerCase().includes(k.toLowerCase()));
            if (idx >= 0) return idx;
          }
          return def;
        };

        const idx = {
          date: findIdx(['날짜', '일자', '주문일', '일시', 'date'], 0),
          manager: findIdx(['담당', '담당자', '사입삼촌', '삼촌', '사입자', 'manager'], 1),
          region: findIdx(['지역', '합성동', '소속', '지점', 'region'], 2),
          store: findIdx(['상호', '소매상호', '거래처', '매장', '가게', '소매', 'store'], 3),
          market: findIdx(['건물', '시장', '상가', '건물명', '도매', 'market'], 4),
          floor: findIdx(['층', '층수', 'floor'], 5),
          room: findIdx(['호수', '호', 'room'], 6),
          expense: findIdx(['대납', '대납금', '대납액', '지출', '사입금', '금액', '합계', 'expense'], 7),
          income: findIdx(['입금', '입금액', '수금', '수금액', 'income'], -1),
          status: findIdx(['상태', '완료', '진행', '구분', '완료여부', 'status'], -1),
          remark: findIdx(['비고', '메모', '특이사항', '내용', 'remark', 'memo'], -1)
        };

        let curDate = selectedDateStr;
        let curManager = '';
        let curRegion = '합성동';

        const parsed = rawJson.slice(bestHeaderRowIndex + 1).map((r, i) => {
          const rawDate = r[idx.date];
          const normalizedDate = normalizeDateStr(rawDate, '');
          if (normalizedDate) curDate = normalizedDate;

          const mgrVal = String(r[idx.manager] || '').trim();
          if (mgrVal) curManager = mgrVal;
          const regVal = String(r[idx.region] || '').trim();
          if (regVal) curRegion = regVal;

          return {
            date: curDate,
            sourceManager: curManager,
            region: curRegion,
            store: String(r[idx.store] || '').trim(),
            market: normalizeMarketName(r[idx.market]),
            floor: String(r[idx.floor] || '').trim(),
            room: String(r[idx.room] || '').trim(),
            expense: Number(String(r[idx.expense] || '0').replace(/,/g, '')) || 0,
            income: idx.income >= 0 ? Number(String(r[idx.income] || '0').replace(/,/g, '')) || 0 : 0,
            status: idx.status >= 0 ? String(r[idx.status] || '').trim() : '',
            remark: idx.remark >= 0 ? String(r[idx.remark] || '').trim() : ''
          };
        }).filter(r => {
          const hasStore = r.store.trim() !== '';
          const hasExpense = r.expense !== 0;
          const hasIncome = r.income !== 0;
          return hasStore || hasExpense || hasIncome;
        });

        if (parsed.length === 0) {
          alert('가져올 수 있는 유효한 데이터 행을 찾을 수 없습니다. 엑셀 열 구성을 확인해주세요.');
          return;
        }

        setPendingExcelRows(parsed);
      } catch (err: any) {
        console.error('엑셀 파싱 오류:', err);
        alert('엑셀 파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleInitializeData = async () => {
    if (currentUser?.role !== 'admin') {
      alert('관리자만 초기화할 수 있습니다.');
      return;
    }
    
    const confirmMsg = '⚠️ [데이터 공장 초기화]\n\n실사용을 위해 서버의 모든 장부 및 수금 데이터를 영구 삭제하시겠습니까?\n이 작업은 취소할 수 없으며, 모든 사용자의 데이터가 지워집니다.';
    if (confirm(confirmMsg)) {
      try {
        await factoryResetDatabase();
        setTransactions([]);
                saveTransactionsToIndexedDB([]);
        saveCollections([]);
        alert('모든 거래 및 수금 데이터가 완벽하게 초기화되었습니다.');
      } catch (e) {
        console.error('초기화 실패:', e);
        alert('데이터 초기화 중 오류가 발생했습니다.');
      }
    }
  };

  // DB Backup & Restore
  const handleBackupDB = () => {
    const payload = {
      format: 'SAIPON_FULL_BACKUP',
      version: 2,
      exportedAt: new Date().toISOString(),
      transactions,
      users,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `사입ON_DB_백업_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreDB = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const payload = JSON.parse(e.target?.result as string);
        if (!payload.transactions) {
          throw new Error('백업 파일 형식이 아닙니다.');
        }

        if (confirm('현재 DB를 백업 파일 내용으로 복원하시겠습니까?')) {
          setTransactions(payload.transactions);
          await saveTransactionsToIndexedDB(payload.transactions);
          await saveOrdersBulkToFirebase(payload.transactions);



          alert('데이터가 성공적으로 복원되었습니다.');
        }
      } catch (err: any) {
        alert('DB 복원 실패: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-semibold">사입ON 데이터를 불러오는 중...</p>
    </div>
    </div>
    );
  }

  // If not logged in, show AuthScreen
  if (!currentUser) {
    return (
      <>
        <AuthScreen
          users={users}
          availableRegions={availableRegions}
          onLoginSuccess={handleLoginSuccess}
          onOpenAdminAdd={() => setShowAdminAddModal(true)}
        />
        {showAdminAddModal && (
          <AdminAddModal
            users={users}
            currentUser={currentUser}
            onClose={() => setShowAdminAddModal(false)}
            onAdminCreated={(admin) => {
              setUsers(prev => [...prev.filter(u => u.username !== admin.username), admin]);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="bg-slate-100 text-slate-800 min-h-screen flex flex-col antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-green-500 text-white px-4 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 animate-bounce border-2 border-white/20 whitespace-nowrap">
          {toastMessage}
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenDataManagement={() => setShowDataManagementModal(true)}
          onOpenBuildingManagement={() => setShowBuildingManagerModal(true)}
        onOpenProfile={() => {
          setProfileTargetUsername(currentUser.username);
          setShowProfileModal(true);
        }}
        onOpenMerchantInfo={() => setShowMerchantInfoModal(true)}
        onOpenCollectionScreen={() => {
          if (roleFilteredTransactions.length > 0) {
            const maxDate = roleFilteredTransactions.map(t => t.date).sort().reverse()[0];
            if (maxDate) setSelectedDateStr(maxDate);
          }
          setShowCollectionScreen(true);
        }}
        onOpenBuyerWorkday={() => {
          if (roleFilteredTransactions.length > 0) {
            const maxDate = roleFilteredTransactions.map(t => t.date).sort().reverse()[0];
            if (maxDate) setSelectedDateStr(maxDate);
          }
          setShowBuyerWorkdayScreen(true);
        }}
        onOpenAdminManagement={() => setShowAdminUserManagementModal(true)}
        onOpenBoard={() => setShowBoardScreen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto p-3 flex-1 flex flex-col gap-3">
        {/* Search Bar */}
        <section className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-xs border border-slate-200 flex items-center justify-between gap-2.5 text-xs">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="상호, 건물, 비고, 담당자 검색..."
              className="border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50 w-full outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
    </div>

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-500 hover:text-indigo-600 font-semibold text-xs px-2 py-1 rounded-lg hover:bg-slate-100 transition shrink-0"
            >
              검색 초기화
            </button>
          )}
        </section>

        {/* Primary View: Calendar */}
        <CalendarView
          currentDate={currentDate}
          selectedDateStr={selectedDateStr}
          transactions={filteredTransactions}
          currentUser={currentUser}
          onOpenAiModal={handleOpenAiModal}
          onSelectDate={handleSelectDate}
          onChangeMonth={handleChangeMonth}
          onGoToToday={handleGoToToday}
          onOpenAddModal={handleOpenAddModal}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onCompleteTransaction={handleCompleteTransaction}
          onOpenWorkdayStats={handleOpenWorkdayStats}
          onImportOrders={handleImportOrders}
        />
      </main>

      {/* Modals */}
      <Suspense fallback={<div className="hidden">Loading...</div>}>
      {showAdminAddModal && (
        <AdminAddModal
          users={users}
          currentUser={currentUser}
          onClose={() => setShowAdminAddModal(false)}
          onAdminCreated={(admin) => {
            setUsers(prev => [...prev.filter(u => u.username !== admin.username), admin]);
          }}
        />
      )}

      {showAdminUserManagementModal && (
        <AdminUserManagementModal
          users={users}
          currentUser={currentUser}
          onClose={() => setShowAdminUserManagementModal(false)}
          onOpenProfile={(uName) => {
            setProfileTargetUsername(uName);
            setShowProfileModal(true);
          }}
          onOpenAdminAdd={() => setShowAdminAddModal(true)}
          onUserDeleted={(username) => {
            setUsers(prev => prev.filter(u => u.username !== username));
          }}
        />
      )}

      {showProfileModal && profileTargetUsername && (
        <ProfileModal
          username={profileTargetUsername}
          users={users}
          currentUser={currentUser}
          allMarkets={allMarkets}
          availableRegions={availableRegions}
          onClose={() => {
            setShowProfileModal(false);
            setProfileTargetUsername(null);
          }}
          onUserSaved={(updatedUser) => {
            setUsers(prev => prev.map(u => u.username === updatedUser.username ? updatedUser : u));
            if (updatedUser.username === currentUser?.username) {
              setCurrentUser(updatedUser);
            }
          }}
        />
      )}

      
      {showCollectionScreen && (
        <CollectionScreen
          initialDate={selectedDateStr}
          transactions={roleFilteredTransactions}
          collections={collections}
          currentUser={currentUser}
          users={users}
          collectionGroupRules={collectionGroupRules}
          onClose={() => setShowCollectionScreen(false)}
          onOpenGroupManager={() => setShowGroupRulesModal(true)}
          onResetCollectionData={() => {
            if (confirm('수금 데이터를 초기화하시겠습니까?')) {
              setCollections([]);
              saveCollections([]);
            }
          }}
          onResetAllData={handleInitializeData}
          onOpenOrderDetail={handleOpenOrderDetail}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onUpdateTransaction={handleUpdateTransaction}
          onToggleComplete={handleToggleComplete}
          onSaveCollection={handleSaveCollection}
        />
      )}

      {showGroupRulesModal && (
        <GroupRulesManagerModal
          rules={collectionGroupRules}
          currentUser={currentUser}
          currentDateStr={selectedDateStr}
          onClose={() => setShowGroupRulesModal(false)}
          onRulesUpdated={setCollectionGroupRules}
        />
      )}


      {showAiModal && (
        <AiOrderImportModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          selectedDateStr={selectedDateStr}
          currentUser={currentUser}
          onImportOrders={(orders) => {
            setCleanTransactions([...transactions, ...orders]);
          }}
        />
      )}

      {showOrderModal && (
        <OrderEntryModal
          editingTransaction={editingTransaction}
          currentUser={currentUser}
          selectedDate={selectedDateStr}
          onOpenAiModal={() => {
            setShowOrderModal(false);
            setShowAiModal(true);
          }}
          stores={stores}
          allMarkets={allMarkets}
          onClose={() => {
            setShowOrderModal(false);
            setEditingTransaction(null);
          }}
          onOrderSaved={(savedOrders) => {
            const savedIds = new Set(savedOrders.map(t => t.id));
            const updated = [
              ...savedOrders,
              ...transactions.filter(t => !savedIds.has(t.id))
            ];
            setTransactions(updated);
            saveTransactionsToIndexedDB(updated);
          }}
          onOrderCompleted={handleCompleteTransaction}
        />
      )}

      

      {showBuildingManagerModal && (
        <BuildingManagerModal
          onClose={() => setShowBuildingManagerModal(false)}
          onMarketsUpdated={(m) => setFetchedMarkets(m)}
        />
      )}

      {showDataManagementModal && (
        <DataManagementModal
          currentUser={currentUser}
          transactions={transactions}
          onClose={() => setShowDataManagementModal(false)}
          onExcelImport={handleExcelImport}
          onExcelExport={handleExcelExport}
          onBackupDB={handleBackupDB}
          onRestoreDB={handleRestoreDB}
          onResetComplete={() => {
            setTransactions([]);
                      }}
          onResetCollectionsOnly={() => {
                      }}
        />
      )}

      
      {showBoardScreen && currentUser && (
        <BoardScreen currentUser={currentUser} onClose={() => setShowBoardScreen(false)} />
      )}
      {showBuyerWorkdayStatsScreen && (currentUser?.role === 'buyer' || currentUser?.role === 'admin') && (
        <BuyerWorkdayStatsScreen
          currentUser={currentUser}
          transactions={roleFilteredTransactions}
          selectedDateStr={selectedDateStr}
          onSelectDateStr={setSelectedDateStr}
          onLogout={handleLogout}
          onStartEnteringOrder={() => setShowBuyerWorkdayStatsScreen(false)}
          onOpenAddOrder={() => setShowOrderModal(true)}
          onOpenOrder={handleEditTransaction}
          onUpdateTransaction={(updatedTx) => {
            React.startTransition(() => {
              setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
            });
            updateTransactionInIndexedDB(updatedTx).catch(console.warn);
          }}
        />
      )}
      {showBuyerWorkdayScreen && (currentUser?.role === 'buyer' || currentUser?.role === 'admin') && (

        <BuyerWorkdayScreen
          currentUser={currentUser}
          transactions={roleFilteredTransactions}
          selectedDateStr={selectedDateStr}
          onSelectDateStr={setSelectedDateStr}
          onLogout={handleLogout}
          onStartEnteringOrder={() => setShowBuyerWorkdayScreen(false)}
          onOpenAddOrder={() => setShowOrderModal(true)}
          onOpenOrder={handleEditTransaction}
          onUpdateTransaction={(updatedTx) => {
            React.startTransition(() => {
              setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
            });
            updateTransactionInIndexedDB(updatedTx).catch(console.warn);
          }}
        />
      )}

      {showMerchantInfoModal && (
        <LocalMerchantInfoModal
          currentUser={currentUser}
          users={users}
          onClose={() => setShowMerchantInfoModal(false)}
        />
      )}

      

      {pendingExcelRows && (
        <ExcelImportWizard
          parsedRows={pendingExcelRows}
          users={users}
          onClose={() => setPendingExcelRows(null)}
          onImportFinalized={async (imported) => {
            if (!imported || imported.length === 0) {
              setPendingExcelRows(null);
              return;
            }

            // Remove wiped flag so sync doesn't clear
            localStorage.removeItem('SAIPON_DATA_INITIALIZED');

            const existingIds = new Set(transactions.map(t => t.id));
            const newOnes = imported.filter(t => !existingIds.has(t.id));
            const updated = [...newOnes, ...transactions];
            
            setTransactions(updated);
            await saveTransactionsToIndexedDB(updated);

            // Persist bulk orders to Firebase
            // Do not block UI for Firebase sync
            saveOrdersBulkToFirebase(newOnes).catch(err => {
              console.warn('Firebase bulk save warning:', err);
            });

            // Auto-navigate to the latest date among imported items
            const dates = imported.map(t => normalizeDateStr(t.date || t.businessDate)).filter(Boolean).sort((a, b) => b.localeCompare(a));
            if (dates.length > 0) {
              const latestDate = dates[0];
              setSelectedDateStr(latestDate);
              const parts = latestDate.split('-');
              if (parts.length === 3) {
                const y = parseInt(parts[0], 10);
                const m = parseInt(parts[1], 10) - 1;
                const d = parseInt(parts[2], 10);
                if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                  setCurrentDate(new Date(y, m, d));
                }
              }
            }

            setPendingExcelRows(null);
            alert(`엑셀 불러오기가 완료되었습니다!\n총 ${newOnes.length}건이 등록되었으며, 해당 데이터가 위치한 날짜(${dates[0] || '선택일'})로 화면이 이동되었습니다.`);
          }}
        />
      )}

      </Suspense>
    </div>
  );
}
      
// Force update for publish button: Mon Aug 31 03:27:26 AM UTC 2026
// Verify GitHub sync status: Mon Aug 31 03:57:11 AM UTC 2026
// Force update for z-index: Mon Aug 31 06:13:55 AM UTC 2026
