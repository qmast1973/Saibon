import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, Suspense, lazy } from 'react';
import * as XLSX from 'xlsx';
import { User, Transaction, CollectionRecord, CollectionGroupRule } from './types';
import {
  syncFirebaseUsers,
  syncFirebaseOrders,
  syncFirebaseGroupRules,
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
  saveCollections,
  loadGroupRules,
  saveGroupRules
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
import { BuildingManagerModal } from './components/BuildingManagerModal';
import { SearchWithGroupDropdown } from './components/SearchWithGroupDropdown';
import { matchesTransactionWithGroup } from './lib/groupRules';

import { Search, Layers } from 'lucide-react';

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
    if (!isInitializing && currentUser && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isInitializing, currentUser]);



  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [collectionGroupRules, setCollectionGroupRules] = useState<CollectionGroupRule[]>(() => loadGroupRules());
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

        const cachedGroupRules = loadGroupRules();
        if (cachedGroupRules.length > 0) {
          setCollectionGroupRules(cachedGroupRules);
        }
      } catch (e) {
        console.warn('Init error:', e);
      }
      setIsInitializing(false);
    }
    init();
  }, [cleanTransactions, setCleanTransactions]);

  const transactionsRef = React.useRef(transactions);
  const currentUserRef = React.useRef(currentUser);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // 2. Real-time Firebase Sync Listeners
  useEffect(() => {
    const unsubUsers = syncFirebaseUsers((firebaseUsers) => {
      if (firebaseUsers.length > 0) {
        setUsers(firebaseUsers);
        firebaseUsers.forEach(u => saveLocalUser(u));

        // Keep currentUser updated with latest permissions/approval
        const currentU = currentUserRef.current;
        if (currentU) {
          const fresh = firebaseUsers.find(u => u.username === currentU.username);
          if (fresh) {
            setCurrentUser(fresh);
            setSessionUser(fresh);
          }
        }
      }
    });

    const unsubOrders = syncFirebaseOrders((firebaseOrders) => {
      const prevTransactions = transactionsRef.current;
      const currentU = currentUserRef.current;
      // Check if this is an update (not initial load) and if there are new orders relevant to current user
      if (prevTransactions.length > 0 && currentU?.role === 'buyer') {
        // Compare previous and new orders to find additions
        const prevIds = new Set(prevTransactions.map(t => t.id));
        const newOrders = firebaseOrders.filter(t => !prevIds.has(t.id));
        
        if (newOrders.length > 0) {
          // Find orders that match the buyer's assigned markets/regions
          const relevantNewOrders = newOrders.filter(order => {
            if (currentU.isBuyerAdmin) return true; // Admin sees all new orders
            
            let isRelevant = false;
            if (currentU.allowedMarkets && currentU.allowedMarkets.length > 0) {
              const normMarket = normalizeMarketName(order.market);
              isRelevant = currentU.allowedMarkets.some(m => normalizeMarketName(m) === normMarket);
            }
            if (!isRelevant && currentU.assignedRegion && currentU.assignedRegion !== '전체') {
              isRelevant = order.region === currentU.assignedRegion;
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

    const unsubGroupRules = syncFirebaseGroupRules((firebaseRules) => {
      if (firebaseRules) {
        setCollectionGroupRules(firebaseRules);
      }
    });

    return () => {
      unsubUsers();
      unsubOrders();
      unsubGroupRules();
    };
  }, [currentUser?.username, setCleanTransactions]);

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
    setShowBuyerWorkdayStatsScreen(false);
    setShowOrderModal(false);
    setShowCollectionScreen(false);
    setShowBoardScreen(false);
    setShowProfileModal(false);
    setShowMerchantInfoModal(false);
    setShowAdminUserManagementModal(false);
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

    const isMerchant = currentUser?.role === 'merchant';
    const merchantStore = (isMerchant ? (currentUser.storeName || currentUser.name || '') : '');
    const merchantUsername = currentUser?.username || '';
    
    const normalizeStore = (s: string) => String(s || '').replace(/\s+/g, '').toLowerCase();
    const normMerchantStore = normalizeStore(merchantStore);

    return transactions.filter(t => {
      if (isMerchant) {
        // 1. Direct owner match
        if (t.merchantId && t.merchantId === merchantUsername) return true;
        
        const normTStore = normalizeStore(t.store);
        if (normMerchantStore && normTStore && (normTStore === normMerchantStore || normTStore.includes(normMerchantStore) || normMerchantStore.includes(normTStore))) return true;

        // 2. Representative store grouping match
        if (normMerchantStore && normTStore && collectionGroupRules && collectionGroupRules.length > 0) {
          const tDate = t.date || t.businessDate || '';
          
          const isGrouped = collectionGroupRules.some(rule => {
            const rGroup = normalizeStore(rule.groupName);
            const rStore = normalizeStore(rule.storeName);
            
            // Check effective date if specified (Temporarily bypassed to allow all past orders to merge)
            // if (rule.effectiveFrom && tDate && tDate < rule.effectiveFrom) {
            //   return false;
            // }

            // A: Current logged in user is the Representative Store (groupName)
            if (rGroup === normMerchantStore || rGroup.includes(normMerchantStore) || normMerchantStore.includes(rGroup)) {
              if (rule.matchType === 'prefix') {
                return normTStore.startsWith(rStore) || rStore.startsWith(normTStore);
              }
              return normTStore === rStore || normTStore.includes(rStore) || rStore.includes(normTStore);
            }

            // B: Current logged in user is the member store (storeName)
            if (rStore === normMerchantStore || rStore.includes(normMerchantStore) || normMerchantStore.includes(rStore)) {
              return normTStore === rGroup || normTStore.includes(rGroup) || rGroup.includes(normTStore);
            }

            return false;
          });

          if (isGrouped) return true;
        }

        return false;
      }

      if (currentUser?.role === 'buyer') {
        if (!allowedMarkets || !allowedMarkets.has(normalizeMarketName(t.market))) {
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
  }, [transactions, currentUser, users, collectionGroupRules]);


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

  // Bundled stores list for the logged-in merchant (representative store + member stores)
  const merchantBundledStores: string[] = useMemo(() => {
    if (currentUser?.role !== 'merchant') return [];
    const myStore = (currentUser.storeName || currentUser.name || '').trim();
    if (!myStore) return [];

    const storeSet = new Set<string>([myStore]);
    const normalizeStore = (s: string) => String(s || '').replace(/\s+/g, '').toLowerCase();
    const normMyStore = normalizeStore(myStore);

    (collectionGroupRules || []).forEach(rule => {
      const rGroup = normalizeStore(rule.groupName);
      const rStore = normalizeStore(rule.storeName);

      // If current merchant is the representative store
      if (rGroup === normMyStore || rGroup.includes(normMyStore) || normMyStore.includes(rGroup)) {
        if (rule.matchType === 'prefix') {
          transactions.forEach(t => {
            const normTStore = normalizeStore(t.store);
            if (normTStore && (normTStore.startsWith(rStore) || rStore.startsWith(normTStore))) {
              storeSet.add(t.store.trim()); // add original to show correctly in UI
            }
          });
          storeSet.add(rule.storeName.trim()); // fallback
        } else {
          storeSet.add(rule.storeName.trim());
        }
      }
      // If current merchant is a member store
      else if (rStore === normMyStore || rStore.includes(normMyStore) || normMyStore.includes(rStore)) {
        storeSet.add(rule.groupName.trim());
      }
    });

    return [...storeSet].sort((a, b) => a.localeCompare(b, 'ko'));
  }, [currentUser, collectionGroupRules, transactions]);

  // Merchant branch quick filter state ('all' or specific storeName)
  const [merchantStoreFilter, setMerchantStoreFilter] = useState<string>('all');

  // Reset merchantStoreFilter if user logs out or changes
  useEffect(() => {
    setMerchantStoreFilter('all');
  }, [currentUser?.username]);

  // Memoized Filtering Logic (Search + Merchant Branch Filter)
  const filteredTransactions = useMemo(() => {
    let result = roleFilteredTransactions;

    // Apply merchant branch filter if selected
    if (currentUser?.role === 'merchant' && merchantStoreFilter !== 'all') {
      const normalizeStore = (s: string) => String(s || '').replace(/\s+/g, '').toLowerCase();
      const normFilter = normalizeStore(merchantStoreFilter);
      result = result.filter(t => {
        const normTStore = normalizeStore(t.store);
        return normTStore === normFilter || normTStore.includes(normFilter) || normFilter.includes(normTStore);
      });
    }

    if (deferredSearchQuery.trim()) {
      result = result.filter(t => matchesTransactionWithGroup(t, deferredSearchQuery, collectionGroupRules));
    }

    return result;
  }, [roleFilteredTransactions, deferredSearchQuery, currentUser?.role, merchantStoreFilter, collectionGroupRules]);

  // Check if admin is currently searching for a representative group store
  const matchedAdminGroup = useMemo(() => {
    if (!deferredSearchQuery.trim() || currentUser?.role !== 'admin') return null;
    const cleanQ = String(deferredSearchQuery).replace(/\s+/g, '').toLowerCase();
    const rules = collectionGroupRules || [];
    const found = rules.find(r => {
      if (!r || !r.groupName) return false;
      const cleanG = String(r.groupName).replace(/\s+/g, '').toLowerCase();
      return cleanG === cleanQ || cleanG.includes(cleanQ) || cleanQ.includes(cleanG);
    });
    if (!found) return null;
    const groupName = found.groupName.trim();
    const cleanG = String(groupName).replace(/\s+/g, '').toLowerCase();
    const subStores = Array.from(new Set(
      rules
        .filter(r => r && r.groupName && String(r.groupName).replace(/\s+/g, '').toLowerCase() === cleanG)
        .map(r => r.storeName.trim())
    ));
    return { groupName, subStores };
  }, [deferredSearchQuery, currentUser?.role, collectionGroupRules]);

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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-400 font-semibold">사입ON 데이터를 불러오는 중...</p>
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
    <div className="bg-gray-950 text-gray-100 min-h-screen flex flex-col antialiased">
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
        onOpenGroupRules={() => setShowGroupRulesModal(true)}
        onOpenBoard={() => setShowBoardScreen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto p-3 flex-1 flex flex-col gap-3">
        {/* Bundled Stores Branch Selector for Representative Merchant */}
        {currentUser?.role === 'merchant' && merchantBundledStores.length > 1 && (
          <section className="bg-gradient-to-r from-violet-950/70 to-indigo-950/70 border border-violet-800/60 rounded-2xl p-3 sm:p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-800/80 border border-violet-600 flex items-center justify-center text-violet-200 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-100 text-sm">대표거래처 통합 주문</span>
                  <span className="bg-violet-900 text-violet-200 border border-violet-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {merchantBundledStores.length}개 상호 묶음
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-[11px] text-gray-400">
                    대표거래처로 묶인 모든 상호의 주문이 나열됩니다. 상호별 버튼을 눌러 개별 조회도 가능합니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGroupRulesModal(true)}
                    className="px-2 py-0.5 rounded-lg bg-violet-800/80 hover:bg-violet-700 text-violet-200 border border-violet-600 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3 h-3" />
                    <span>대표거래처 하위 매핑 관리 열기</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setMerchantStoreFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center gap-1.5 shadow-xs ${
                  merchantStoreFilter === 'all'
                    ? 'bg-violet-600 text-white ring-2 ring-violet-400 font-black'
                    : 'bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800'
                }`}
              >
                <span>전체 묶음 주문</span>
                <span className="text-[10px] opacity-80">({merchantBundledStores.length})</span>
              </button>

              {merchantBundledStores.map(st => {
                const isRep = st.toLowerCase() === (currentUser.storeName || '').trim().toLowerCase();
                const isSelected = merchantStoreFilter.toLowerCase() === st.toLowerCase();
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setMerchantStoreFilter(st)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition text-xs flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-violet-600 text-white ring-2 ring-violet-400 shadow-xs'
                        : 'bg-gray-900 text-gray-300 border border-gray-700 hover:bg-gray-800'
                    }`}
                  >
                    <span>{st}</span>
                    {isRep ? (
                      <span className="text-[9px] bg-violet-900 text-violet-200 border border-violet-700 px-1 py-0.2 rounded font-semibold">대표</span>
                    ) : (
                      <span className="text-[9px] bg-gray-800 text-gray-400 border border-gray-700 px-1 py-0.2 rounded">소속</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Search Bar */}
        <section className="bg-gray-900 p-2 sm:p-2.5 rounded-2xl shadow-xs border border-gray-800 flex items-center justify-between gap-2.5 text-xs">
          <SearchWithGroupDropdown
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="상호, 대표거래처, 건물, 비고, 담당자 검색 (초성 가능: ㅎㅊㅋㅅ)..."
            collectionGroupRules={collectionGroupRules}
            knownStores={stores}
            theme="dark"
            className="relative flex-1 max-w-md"
            inputClassName="border border-gray-700 rounded-xl pl-8 pr-7 py-1.5 bg-gray-900 w-full outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-gray-900 text-xs text-gray-100 placeholder:text-gray-500"
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-indigo-600 font-semibold text-xs px-2 py-1 rounded-lg hover:bg-gray-950 transition shrink-0"
            >
              검색 초기화
            </button>
          )}
        </section>

        {/* Admin Representative Group Search Notice */}
        {matchedAdminGroup && (
          <section className="bg-gradient-to-r from-violet-950/80 to-indigo-950/80 border border-violet-700/70 rounded-xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-violet-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                대표거래처 <span className="text-white font-extrabold underline decoration-violet-400">'{matchedAdminGroup.groupName}'</span> 검색 적용 중
              </span>
              <span className="text-[11px] text-gray-300">
                (종속 거래처: {matchedAdminGroup.subStores.length > 0 ? matchedAdminGroup.subStores.join(', ') : '지정됨'} 주문 포함 총 {filteredTransactions.length}건)
              </span>
            </div>
          </section>
        )}

        {/* Primary View: Calendar */}
        <CalendarView
          currentDate={currentDate}
          selectedDateStr={selectedDateStr}
          transactions={filteredTransactions}
          currentUser={currentUser}
          collectionGroupRules={collectionGroupRules}
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
          onOpenGroupRules={() => setShowGroupRulesModal(true)}
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
          availableStores={stores}
          merchantUsers={users.filter(u => u.role === 'merchant')}
          transactions={transactions}
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
          allMarkets={currentUser?.role === 'buyer' && !currentUser.isBuyerAdmin ? (currentUser.allowedMarkets || []).map(normalizeMarketName) : allMarkets}
          bundledStores={merchantBundledStores}
          collectionGroupRules={collectionGroupRules}
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
          collectionGroupRules={collectionGroupRules}
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
          collectionGroupRules={collectionGroupRules}
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
