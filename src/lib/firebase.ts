import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { getDatabase, ref, set, remove, onValue, get, update, push, query, limitToLast, orderByKey } from 'firebase/database';
import { User, UserRole, Transaction, CollectionGroupRule, CollectionRecord } from '../types';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCKUn8yVyL9V5NP9rpHWbtcDddiwW1MWSQ',
  authDomain: 'ildang-505711.firebaseapp.com',
  databaseURL: 'https://purchaseon-351f4-default-rtdb.firebaseio.com',
  projectId: 'ildang-505711',
  storageBucket: 'ildang-505711.firebasestorage.app',
  messagingSenderId: '176312937811',
  appId: '1:176312937811:web:9c4602f12842e52d2c85a6'
};

export const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const rtdb = getDatabase(app);

// SHA-256 fallback hasher
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const _MARKETS_FOR_RESOLVE = [
  'APM', 'APM 럭스', 'APM 플레이스', '팀204', '디자이너', '누죤', '골든상가', '샤넬 마네킹', '대일 마네킹', '에소르', '누누', '유어스', '벨포스트', '퀸즈', '광희', '제일평화', '맥스타일', '신평화', '남평화', '동평화', '아트', '더블유 스튜디오', '해양', '동원', '테크노', '청평화', '신발상가', '디오트', '픽대지', '상상', '자판', '===== 남대문 =====', '세로나', '포키', '원', '시티', '페인트', '부르뎅', '마마', '웅이', '화이트', '탑', '크레용', '키즈', '팀엔드'
];

function getChosung(str: string) {
  const cho = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  let result = '';
  for(let i=0; i<str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if(code > -1 && code < 11172) result += cho[Math.floor(code / 588)];
    else result += str.charAt(i);
  }
  return result;
}

export function normalizeMarketName(value: string | undefined): string {
  const input = String(value ?? '').trim();
  if (!input) return '';
  const raw = input.replace(/\s+/g, '').toLowerCase();
  
  // 1. Exact match (ignoring spaces/case)
  for (const m of _MARKETS_FOR_RESOLVE) {
    if (m.replace(/\s+/g, '').toLowerCase() === raw) return m;
  }
  
  // 2. Chosung match
  for (const m of _MARKETS_FOR_RESOLVE) {
    const chosung = getChosung(m).replace(/\s+/g, '').toLowerCase();
    if (chosung === raw) return m;
  }
  
  // 3. Partial Chosung or Partial match (prefix)
  for (const m of _MARKETS_FOR_RESOLVE) {
    const chosung = getChosung(m).replace(/\s+/g, '').toLowerCase();
    const cleanM = m.replace(/\s+/g, '').toLowerCase();
    if (chosung.startsWith(raw) || cleanM.startsWith(raw)) return m;
  }

  return input.replace(/\s+/g, ' ').replace(/[A-Za-z]+/g, m => m.toUpperCase());
}

export function normalizeFloorValue(value: string | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return '층 미지정';
  if (/^-?\d+$/.test(raw)) return `${raw}층`;
  return raw;
}

export function floorSortValue(value: string): number {
  const m = String(value || '').match(/-?\d+/);
  return m ? Number(m[0]) : 99999;
}


export function checkOrderTimeAllowed(): boolean {
  const now = new Date();
  const hours = now.getHours();
  if (hours >= 2 && hours < 7) {
    alert("주문 가능 시간이 아닙니다.\n(주문 가능 시간: 아침 7시 ~ 새벽 2시)");
    return false;
  }
  return true;
}

export function getBusinessDate(baseDate = new Date()): string {
  const d = new Date(baseDate);
  if (d.getHours() < 7) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatMoney(n: number | undefined): string {
  const v = Number(n || 0);
  if (!Number.isFinite(v) || v === 0) return '0원';
  return v.toLocaleString('ko-KR') + ',000원';
}

// ----------------- FIREBASE AUTHENTICATION FLOWS -----------------

// Predefined seed users for seamless offline/fallback access
export const SEED_USERS: User[] = [
  {
    uid: 'seed_admin',
    email: 'admin@saipon.app',
    username: 'admin',
    name: '관리자',
    phone: '010-0000-0000',
    role: 'admin',
    approved: true,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    uid: 'seed_buyer',
    email: 'buyer@saipon.app',
    username: 'buyer',
    name: '서울사입삼촌',
    phone: '010-1111-2222',
    role: 'buyer',
    approved: true,
    allowedMarkets: ['APM', '디오트', '청평', '테크노', '플레이스', '남평', '더블유', '아트', '신평', '유어스'],
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    uid: 'seed_local',
    email: 'local@saipon.app',
    username: 'local',
    name: '인혁(합성동)',
    phone: '010-3333-4444',
    role: 'local',
    approved: true,
    assignedRegion: '합성동',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    uid: 'seed_merchant',
    email: 'merchant@saipon.app',
    username: 'merchant',
    name: '초록밀크',
    phone: '010-5555-6666',
    role: 'merchant',
    approved: true,
    storeName: '초록밀크',
    address: '창원시 마산회원구 합성동 123-45',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export interface SignUpParams {
  email: string;
  password: string;
  username: string;
  name: string;
  phone: string;
  role: UserRole;
  storeName?: string;
  address?: string;
  assignedRegion?: string;
  allowedMarkets?: string[];
  createdBy?: string;
}

/**
 * Sign up a new user using Firebase Authentication (Email/Password)
 * and persist profile in Firestore & RTDB.
 */
export async function firebaseSignUp(params: SignUpParams): Promise<User> {
  const email = params.email.trim().toLowerCase();
  const username = params.username.trim().toLowerCase() || email.split('@')[0];
  
  let fbUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // 1. Attempt Firebase Auth account creation if possible
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, params.password);
    if (cred?.user) {
      fbUid = cred.user.uid;
      if (params.name) {
        try {
          await updateProfile(cred.user, { displayName: params.name });
        } catch (e) {
          console.warn('Could not update, Firebase Auth profile display name', e);
        }
      }
    }
  } catch (authError: any) {
    const code = authError?.code || '';
    if (code === 'auth/email-already-in-use') {
      throw new Error('이미 가입된 이메일 주소입니다. 로그인을 시도하거나 비밀번호를 재설정하세요.');
    }
    if (code === 'auth/weak-password') {
      throw new Error('비밀번호 보안 강도가 약합니다. 6자 이상 입력해주세요.');
    }
    if (code === 'auth/invalid-email') {
      throw new Error('올바르지 않은 이메일 형식입니다. 정확한 이메일을 입력해주세요.');
    }
    console.warn('Firebase Auth email provider fallback activated:', authError);
  }

  // 2. Hash password for local & database authentication
  const passwordHash = await sha256(params.password);

  const newUser: User = {
    uid: fbUid,
    email,
    username,
    name: params.name.trim(),
    phone: params.phone.trim(),
    passwordHash,
    role: params.role,
    approved: params.role === 'admin', // Admin auto-approves, others wait for approval
    storeName: params.role === 'merchant' ? (params.storeName || '').trim() : '',
    address: params.role === 'merchant' ? (params.address || '').trim() : '',
    assignedRegion: params.role === 'local' ? (params.assignedRegion || '').trim() : '',
    allowedMarkets: params.allowedMarkets || [],
    assignedMerchants: [],
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy || 'self_register',
    updatedAt: new Date().toISOString()
  };

  // 3. Save user document to RTDB & Firestore
  await saveUserToFirebase(newUser);

  return newUser;
}

/**
 * Sign in using Firebase Auth Email & Password or User Database / Seed matching
 */
export async function firebaseSignIn(
  identifier: string,
  password: string,
  allCachedUsers: User[] = []
): Promise<{ user: User; firebaseUser?: FirebaseUser }> {
  const trimmed = identifier.trim();
  const inputHash = await sha256(password);

  // 1. Gather all users from all available sources
  let allUsers: User[] = [...allCachedUsers];
  if (allUsers.length === 0) {
    const fetched = await fetchAllFirebaseUsers();
    allUsers = fetched.length > 0 ? fetched : [...SEED_USERS];
  } else {
    // Merge seed users if not present
    SEED_USERS.forEach(su => {
      if (!allUsers.some(u => u.username === su.username)) {
        allUsers.push(su);
      }
    });
  }

  // 2. Search for user by username, email, or name
  const matchedUser = allUsers.find(
    u => String(u.username || '').toLowerCase() === trimmed.toLowerCase() ||
         String(u.email || '').toLowerCase() === trimmed.toLowerCase() ||
         String(u.name || '').trim() === trimmed
  );

  // If user profile is found in database/seeds
  if (matchedUser) {
    if (matchedUser.passwordHash) {
      if (matchedUser.passwordHash === inputHash) {
        return { user: matchedUser };
      } else {
        throw new Error('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
      }
    } else {
      // Legacy user or uninitialized user without hash
      const isDefaultAdminPassword = (matchedUser.role === 'admin' || matchedUser.username === 'admin') &&
        (password === 'admin1234' || password === '1234' || password === '123456' || password === 'admin');
      const isDefaultSeedPassword = (matchedUser.uid?.startsWith('seed_')) &&
        (password === '123456' || password === '1234' || password === 'admin1234');
      
      const isNormalUserInitializing = !matchedUser.uid?.startsWith('seed_') && matchedUser.role !== 'admin' && password.length >= 4;

      if (isDefaultAdminPassword || isDefaultSeedPassword || isNormalUserInitializing) {
        matchedUser.passwordHash = inputHash;
        saveUserToFirebase(matchedUser).catch(() => {});
        return { user: matchedUser };
      } else {
        throw new Error('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
      }
    }
  }

  // 3. If not found in user list, check if identifier is a valid email for Firebase Auth
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

  if (isEmail) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmed.toLowerCase(), password);
      const fbUser = userCredential.user;

      // Fetch fresh user profile from database
      const users = await fetchAllFirebaseUsers();
      let profile = users.find(u => u.uid === fbUser.uid || u.email?.toLowerCase() === trimmed.toLowerCase());

      if (!profile) {
        profile = {
          uid: fbUser.uid,
          email: fbUser.email || trimmed.toLowerCase(),
          username: (fbUser.email || trimmed).split('@')[0],
          name: fbUser.displayName || '회원',
          phone: '',
          role: 'merchant',
          approved: false,
          passwordHash: inputHash,
          createdAt: new Date().toISOString()
        };
        await saveUserToFirebase(profile);
      }

      return { user: profile, firebaseUser: fbUser };
    } catch (authError: any) {
      const code = authError?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('비밀번호가 일치하지 않습니다. 다시 확인해주세요.');
      }
      if (code === 'auth/user-not-found') {
        throw new Error('등록되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.');
      }
      if (code === 'auth/invalid-email') {
        throw new Error('올바른 이메일 주소 형식을 입력해주세요.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('연속된 로그인 실패로 일시 차단되었습니다. 잠시 후 다시 시도해주세요.');
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error('등록되지 않은 계정이거나 비밀번호가 올바르지 않습니다.');
      }
      throw new Error('로그인에 실패했습니다. 아이디 및 비밀번호를 확인해주세요.');
    }
  }

  // If not an email and not found in database:
  throw new Error('등록되지 않은 아이디(또는 이메일)입니다. 회원가입을 먼저 진행해주세요.');
}

/**
 * Send Password Reset Email using Firebase Authentication
 */
export async function firebaseSendPasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('올바른 이메일 주소 형식을 입력해주세요.');
  }
  await sendPasswordResetEmail(auth, cleanEmail);
}

/**
 * Sign out of Firebase Auth
 */
export async function firebaseSignOutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.warn('Firebase sign out error:', e);
  }
}

/**
 * Listen for Firebase Auth state changes
 */
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ----------------- USER FIREBASE SYNC -----------------


function getBlacklistedUsers(): string[] {
  try {
    return JSON.parse(localStorage.getItem('deleted_firebase_users') || '[]');
  } catch { return [
    'APM', 'APM 럭스', 'APM 플레이스', '팀204', '디자이너', '누죤', '골든상가', '샤넬 마네킹', '대일 마네킹', '에소르', '누누', '유어스', '벨포스트', '퀸즈', '광희', '제일평화', '맥스타일', '신평화', '남평화', '동평화', '아트', '더블유 스튜디오', '해양', '동원', '테크노', '청평화', '신발상가', '디오트', '픽대지', '상상', '자판', '남대', '세로나', '포키', '원', '시티', '페인트', '부르뎅', '마마', '웅이', '화이트', '탑', '크레용', '키즈', '팀엔드'
  ]; }
}
function blacklistUser(username: string) {
  try {
    const list = getBlacklistedUsers();
    if (!list.includes(username)) {
      list.push(username.toLowerCase());
      localStorage.setItem('deleted_firebase_users', JSON.stringify(list));
    }
  } catch {}
}

export function syncFirebaseUsers(onUsersUpdate: (users: User[]) => void) {
  const usersRef = ref(rtdb, 'users');
  return onValue(usersRef, (snapshot) => {
    const data = snapshot.val() || {};
    const blacklist = getBlacklistedUsers();
    const usersList: User[] = (Object.values(data).filter(Boolean) as User[])
      .filter(u => u && u.username && !blacklist.includes(String(u.username).toLowerCase()));
    onUsersUpdate(usersList);
  }, (error) => {
    console.warn('Firebase users sync error:', error);
  });
}

export async function fetchAllFirebaseUsers(): Promise<User[]> {
  try {
    const usersRef = ref(rtdb, 'users');
    const snapshot = await get(usersRef);
    const data = snapshot.val() || {};
    const blacklist = getBlacklistedUsers();
    return (Object.values(data).filter(Boolean) as User[])
      .filter(u => u && u.username && !blacklist.includes(String(u.username).toLowerCase()));
  } catch (error) {
    console.warn('Error fetching firebase users:', error);
    return [];
  }
}

export async function saveUserToFirebase(user: User): Promise<void> {
  if (!user?.username) return;
  const key = String(user.username).trim().toLowerCase();
  const payload = {
    ...user,
    username: key,
    updatedAt: new Date().toISOString()
  };

  // 1. RTDB Save (최대 2초 대기 후 UI 진행)
  try {
    const userRef = ref(rtdb, `users/${key}`);
    await Promise.race([
      set(userRef, payload),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB Save Timeout')), 2000))
    ]);
  } catch (e) {
    console.warn('RTDB user save error or timeout:', e);
  }

  // 2. Firestore Save (비동기 처리로 UI 블로킹 방지)
  const syncToFirestore = async () => {
    try {
      const docId = user.uid || key;
      await setDoc(doc(firestore, 'users', docId), payload, { merge: true });
      if (user.uid && user.uid !== key) {
        await setDoc(doc(firestore, 'users', key), payload, { merge: true });
      }
    } catch (e) {
      console.warn('Firestore user save warning:', e);
    }
  };
  // 백그라운드에서 실행 (await 하지 않음)
  syncToFirestore();
}

export async function deleteUserFromFirebase(username: string): Promise<void> {
  if (!username) return;
  const key = String(username).trim().toLowerCase();
  blacklistUser(key);
  try {
    const userRef = ref(rtdb, `users/${key}`);
    // Timeout added to prevent hang if RTDB is disabled
    await Promise.race([
      remove(userRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB timeout')), 2000))
    ]);
  } catch (e) {
    console.warn('RTDB delete error:', e);
  }
  try {
    // Timeout added to prevent hang if Firestore is disabled
    await Promise.race([
      deleteDoc(doc(firestore, 'users', key)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000))
    ]);
  } catch (e) {
    console.warn('Firestore delete error:', e);
  }
}
// ----------------- ORDER FIREBASE SYNC -----------------

export function syncFirebaseOrders(onOrdersUpdate: (orders: Transaction[]) => void) {
  const ordersRef = ref(rtdb, 'orders');
  // 성능 최적화: 최근 90일(약 3개월) 데이터만 가져오도록 제한
  const recentOrdersQuery = query(ordersRef, orderByKey(), limitToLast(90));
  return onValue(recentOrdersQuery, (snapshot) => {
    const data = snapshot.val() || {};
    const remoteRows: Transaction[] = [];
    Object.entries(data).forEach(([dateKey, dayOrders]: [string, any]) => {
      if (dayOrders && typeof dayOrders === 'object') {
        Object.entries(dayOrders).forEach(([firebaseId, order]: [string, any]) => {
          if (!order) return;
          const storeName = String(order?.상호 || '').trim();
          const payment = Number(String(order?.대납금 ?? '').replace(/,/g, '').replace(/,000원?$/, '').trim()) || 0;
          const income = Number(String(order?.입금액 ?? '').replace(/,/g, '').replace(/,000원?$/, '').trim()) || 0;

          // 삭제: 상호 없고 대납금, 미수금 없는 건수
          if (!storeName && payment === 0 && income === 0) {
            // 빈 데이터는 로컬 상태에 넣지 않음 (자동 숨김 효과)
            return;
          }

          const market = normalizeMarketName(order?.건물명 || '');
          const isPayment = market === '입금';
          remoteRows.push({
            id: `firebase_${encodeURIComponent(dateKey)}_${encodeURIComponent(firebaseId)}`,
            firebaseOrderId: String(firebaseId),
            firebaseDate: String(dateKey),
            orderAt: order?.orderAt || order?.createdAt || null,
            businessDate: String(order?.날짜 || dateKey),
            date: String(order?.날짜 || dateKey),
            merchantId: String(order?.merchantId || ''),
            merchantName: String(order?.merchantName || ''),
            merchantStoreName: String(order?.merchantStoreName || ''),
            manager: String(order?.담당 || ''),
            originalManager: String(order?.담당 || ''),
            actualManager: String(order?.actualManager || ''),
            localManager: String(order?.localManager || ''),
            assignedManager: String(order?.assignedManager || ''),
            region: String(order?.지역 || ''),
            store: String(order?.상호 || ''),
            market,
            floor: String(order?.층 || ''),
            room: String(order?.호수 || ''),
            itemCount: Number(order?.수량 ?? 0),
            isReturn: Boolean(order?.반품여부),
            expense: isPayment ? -Math.abs(payment) : payment,
            income,
            status: String(order?.완료여부 || '') === '미완료' ? '' : String(order?.완료여부 || ''),
            remark: String(order?.메모 || ''),
            recordType: market === '미수금' ? 'receivable' : 'order',
            importedFromFirebase: true
          });
        });
      }
    });
    onOrdersUpdate(remoteRows);
  }, (error) => {
    console.warn('Firebase orders sync error:', error);
  });
}

export async function saveOrderToFirebase(t: Transaction): Promise<string> {
  const date = String(t.date || t.businessDate || '').trim();
  if (!date) throw new Error('Order date is missing');

  const storeName = String(t.store || '').trim();
  const payment = Number(t.expense || 0);
  const income = Number(t.income || 0);
  
  if (!storeName && payment === 0 && income === 0) {
    throw new Error('빈 주문(상호 및 금액 없음)은 저장할 수 없습니다.');
  }

  const market = normalizeMarketName(t.market || '');
  const finalPayment = market === '입금' ? -Math.abs(Number(t.expense || t.income || 0)) : payment;

  const payload = {
    날짜: date,
    상호: String(t.store || ''),
    건물명: market,
    층: String(t.floor || ''),
    호수: String(t.room || ''),
    담당: String(t.manager || t.originalManager || ''),
    수량: Number(t.itemCount ?? 0),
    반품여부: Boolean(t.isReturn),
    대납금: finalPayment,
    입금액: Number(t.income || 0),
    메모: String(t.remark || ''),
    완료여부: String(t.status || ''),
    지역: String(t.region || ''),
    localManager: String(t.localManager || ''),
    actualManager: String(t.actualManager || ''),
    assignedManager: String(t.assignedManager || ''),
    merchantId: String(t.merchantId || ''),
    merchantName: String(t.merchantName || ''),
    merchantStoreName: String(t.merchantStoreName || ''),
    orderAt: t.orderAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const firebaseId = t.firebaseOrderId || `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const previousDate = String(t.firebaseDate || date);
  try {
    const operations = [];
    if (previousDate !== date && t.firebaseOrderId) {
      operations.push(remove(ref(rtdb, `orders/${previousDate}/${firebaseId}`)));
    }
    operations.push(set(ref(rtdb, `orders/${date}/${firebaseId}`), payload));
    
    await Promise.race([
      Promise.all(operations),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB Timeout')), 10000))
    ]);
  } catch(e) {
    console.warn('Order save timeout or offline. Handled in background:', e);
  }
  return firebaseId;
}

export async function deleteOrderFromFirebase(t: Transaction): Promise<void> {
  if (!t.firebaseOrderId || !t.firebaseDate) return;
  try {
    await Promise.race([
      remove(ref(rtdb, `orders/${t.firebaseDate}/${t.firebaseOrderId}`)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB Timeout')), 10000))
    ]);
  } catch(e) {
    console.warn('Order delete timeout or offline. Handled in background:', e);
  }
}

// ----------------- GROUP RULES FIREBASE SYNC -----------------

export function syncFirebaseGroupRules(onRulesUpdate: (rules: CollectionGroupRule[]) => void) {
  const rulesRef = ref(rtdb, 'collectionGroupRules');
  return onValue(rulesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const rulesList = Array.isArray(data) ? data : Object.values(data);
    onRulesUpdate(rulesList.filter(Boolean) as CollectionGroupRule[]);
  }, (error) => {
    console.warn('Firebase group rules sync error:', error);
  });
}

export async function saveGroupRulesToFirebase(rules: CollectionGroupRule[]): Promise<void> {
  const rulesRef = ref(rtdb, 'collectionGroupRules');
  try {
    await Promise.race([
      set(rulesRef, rules),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB Timeout')), 10000))
    ]);
  } catch(e) {
    console.warn('saveGroupRulesToFirebase timeout:', e);
  }
}

export async function factoryResetDatabase(): Promise<void> {
  try {
    await remove(ref(rtdb, 'orders'));
    await remove(ref(rtdb, 'collectionGroupRules'));
  } catch (error) {
    console.error('Factory reset failed:', error);
    throw error;
  }
}

export function normalizeDateStr(val: any, fallbackDate = ''): string {
  if (val === null || val === undefined) return fallbackDate;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallbackDate;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Check if it's an Excel numeric serial date (e.g. 45424)
  if (typeof val === 'number' || (!isNaN(Number(val)) && String(val).trim().length >= 4 && Number(val) > 20000 && Number(val) < 80000)) {
    const num = Number(val);
    const utc_days = Math.floor(num - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    if (!isNaN(date_info.getTime())) {
      const y = date_info.getUTCFullYear();
      const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date_info.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const s = String(val).trim();
  if (!s) return fallbackDate;

  // Regex patterns:
  // 1. YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, YYYY MM DD
  const ymdMatch = s.match(/^(\d{4})[-./\s](\d{1,2})[-./\s](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. YY-MM-DD, YY.MM.DD, YY/MM/DD (e.g. 24.05.12)
  const shortYmdMatch = s.match(/^(\d{2})[-./\s](\d{1,2})[-./\s](\d{1,2})/);
  if (shortYmdMatch) {
    const y = `20${shortYmdMatch[1]}`;
    const m = shortYmdMatch[2].padStart(2, '0');
    const d = shortYmdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 3. YYYYMMDD (8 digits)
  const digits8 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (digits8) {
    return `${digits8[1]}-${digits8[2]}-${digits8[3]}`;
  }

  // 4. MM-DD, MM.DD, MM/DD or M월 D일
  const mdMatch = s.match(/^(\d{1,2})[-./\s월]\s*(\d{1,2})/);
  if (mdMatch) {
    const currentYear = new Date().getFullYear();
    const m = mdMatch[1].padStart(2, '0');
    const d = mdMatch[2].padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  }

  return s;
}

export async function saveOrdersBulkToFirebase(transactions: Transaction[]): Promise<void> {
  if (!transactions || transactions.length === 0) return;
  try {
    const updates: Record<string, any> = {};
    for (const t of transactions) {
      const date = normalizeDateStr(t.date || t.businessDate || '');
      if (!date) continue;
      
      const storeName = String(t.store || '').trim();
      const rawExpense = Number(t.expense || 0);
      const rawIncome = Number(t.income || 0);
      
      if (!storeName && rawExpense === 0 && rawIncome === 0) {
        continue; // 빈 항목 건너뛰기
      }

      const market = normalizeMarketName(t.market || '');
      const payment = market === '입금' ? -Math.abs(Number(t.expense || t.income || 0)) : rawExpense;
      const firebaseId = t.firebaseOrderId || `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const payload = {
        날짜: date,
        상호: String(t.store || ''),
        건물명: market,
        층: String(t.floor || ''),
        호수: String(t.room || ''),
        담당: String(t.manager || t.originalManager || ''),
        수량: Number(t.itemCount ?? 0),
        반품여부: Boolean(t.isReturn),
        대납금: payment,
        입금액: Number(t.income || 0),
        메모: String(t.remark || ''),
        완료여부: String(t.status || ''),
        지역: String(t.region || ''),
        localManager: String(t.localManager || ''),
        actualManager: String(t.actualManager || ''),
        assignedManager: String(t.assignedManager || ''),
        merchantId: String(t.merchantId || ''),
        merchantName: String(t.merchantName || ''),
        merchantStoreName: String(t.merchantStoreName || ''),
        orderAt: t.orderAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      updates[`orders/${date}/${firebaseId}`] = payload;
    }

    if (Object.keys(updates).length > 0) {
      await Promise.race([
        update(ref(rtdb), updates),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB Timeout')), 10000))
      ]);
    }
  } catch (error) {
    console.error('Bulk save to Firebase failed:', error);
  }
}






export const getMarkets = async (): Promise<string[]> => {
  try {
    const docRef = doc(firestore, 'settings', 'markets_v2');
    const snap = await getDoc(docRef);
    if (snap.exists() && Array.isArray(snap.data().list)) {
      return snap.data().list;
    }
  } catch (err) {
    console.warn('Failed to fetch markets from Firestore:', err);
  }
  // Default fallback list
  return ['APM', 'APM 럭스', 'APM 플레이스', '팀204', '디자이너', '누죤', '골든상가', '샤넬 마네킹', '대일 마네킹', '에소르', '누누', '유어스', '벨포스트', '퀸즈', '광희', '제일평화', '맥스타일', '신평화', '남평화', '동평화', '아트', '더블유 스튜디오', '해양', '동원', '테크노', '청평화', '신발상가', '디오트', '픽대지', '상상', '자판', '===== 남대문 =====', '세로나', '포키', '원', '시티', '페인트', '부르뎅', '마마', '웅이', '화이트', '탑', '크레용', '키즈', '팀엔드'];
};

export const saveMarkets = async (markets: string[]): Promise<void> => {
  try {
    const docRef = doc(firestore, 'settings', 'markets_v2');
    await Promise.race([
      setDoc(docRef, { list: markets, updatedAt: new Date().toISOString() }, { merge: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 2000))
    ]);
  } catch (err) {
    console.warn('Failed to save markets:', err);
    throw err;
  }
};

export function subscribeToBoardPosts(callback: (posts: any[]) => void): () => void {
  const postsRef = ref(rtdb, 'board');
  const unsubscribe = onValue(postsRef, (snapshot) => {
    const posts = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        posts.push({ id: child.key, ...child.val() });
      });
    }
    callback(posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
  return unsubscribe;
}

export async function addBoardPost(post: Omit<import('../types').BoardPost, 'id' | 'createdAt'>): Promise<void> {
  const postsRef = ref(rtdb, 'board');
  const newPostRef = push(postsRef);
  await set(newPostRef, {
    ...post,
    createdAt: new Date().toISOString()
  });
}


export async function updateBoardPost(id: string, data: { title: string; content: string }): Promise<void> {
  const postRef = ref(rtdb, `board/${id}`);
  await update(postRef, data);
}

export async function deleteBoardPost(id: string): Promise<void> {
  await remove(ref(rtdb, `board/${id}`));
}

export async function addBoardComment(postId: string, comment: Omit<import('../types').BoardComment, 'id' | 'createdAt'>): Promise<void> {
  const commentsRef = ref(rtdb, `board/${postId}/comments`);
  const newCommentRef = push(commentsRef);
  await set(newCommentRef, {
    ...comment,
    createdAt: new Date().toISOString()
  });
}

export async function deleteBoardComment(postId: string, commentId: string): Promise<void> {
  await remove(ref(rtdb, `board/${postId}/comments/${commentId}`));
}
