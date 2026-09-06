import { User, Transaction, CollectionRecord } from '../types';
import { normalizeMarketName } from './firebase';

const DB_NAME = 'WholesaleLedgerDB';
const DB_VERSION = 1;
const DB_STORE = 'transactions';

const AUTH_DB_NAME = 'WholesaleLedgerAuthDB';
const AUTH_DB_VERSION = 2;
const AUTH_STORE = 'users';
const AUTO_SESSION_STORE = 'autoSession';
const AUTO_LOGIN_KEY = 'WHOLESALE_AUTO_LOGIN';
const AUTO_LOGIN_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

export const COLLECTION_STORAGE_KEY = 'SAIPON_COLLECTIONS_V1';

function openAuthDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUTH_DB_NAME, AUTH_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE, { keyPath: 'username' });
      }
      if (!db.objectStoreNames.contains(AUTO_SESSION_STORE)) {
        db.createObjectStore(AUTO_SESSION_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getLocalUsers(): Promise<User[]> {
  try {
    const db = await openAuthDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUTH_STORE, 'readonly');
      const req = tx.objectStore(AUTH_STORE).getAll();
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch {
    return [];
  }
}

export async function saveLocalUser(user: User): Promise<void> {
  try {
    const db = await openAuthDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUTH_STORE, 'readwrite');
      tx.objectStore(AUTH_STORE).put(user);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('saveLocalUser error:', e);
  }
}

export async function deleteLocalUser(username: string): Promise<void> {
  try {
    const db = await openAuthDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUTH_STORE, 'readwrite');
      tx.objectStore(AUTH_STORE).delete(username);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('deleteLocalUser error:', e);
  }
}

export async function getSessionUser(): Promise<User | null> {
  try {
    const db = await openAuthDB();
    const saved = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(AUTO_SESSION_STORE, 'readonly');
      const req = tx.objectStore(AUTO_SESSION_STORE).get('current');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!saved || !saved.user || !saved.loginAt) throw new Error("Not found in IDB");
    if (Date.now() - Number(saved.loginAt) >= AUTO_LOGIN_TIMEOUT) {
      await clearSessionUser();
      return null;
    }
    return saved.user;
  } catch {
    try {
      const raw = sessionStorage.getItem(AUTO_LOGIN_KEY) || localStorage.getItem(AUTO_LOGIN_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (!saved || !saved.user || !saved.loginAt || Date.now() - Number(saved.loginAt) >= AUTO_LOGIN_TIMEOUT) {
        localStorage.removeItem(AUTO_LOGIN_KEY);
        return null;
      }
      return saved.user;
    } catch {
      return null;
    }
  }
}

export async function setSessionUser(user: User, loginAt = Date.now()): Promise<void> {
  const autoLogin = localStorage.getItem("savedAutoLogin") === "true";
  const record = { id: 'current', user, loginAt };
  try {
    if (autoLogin) {
      const db = await openAuthDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(AUTO_SESSION_STORE, 'readwrite');
        tx.objectStore(AUTO_SESSION_STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } else {
      // Clear IDB just in case
      try {
        const db = await openAuthDB();
        await new Promise<void>((resolve) => {
          const tx = db.transaction(AUTO_SESSION_STORE, 'readwrite');
          tx.objectStore(AUTO_SESSION_STORE).delete('current');
          tx.oncomplete = () => resolve();
        });
        db.close();
      } catch {}
    }
  } catch {}
  try {
    if (autoLogin) {
      localStorage.setItem(AUTO_LOGIN_KEY, JSON.stringify({ user, loginAt }));
      sessionStorage.removeItem(AUTO_LOGIN_KEY);
    } else {
      localStorage.removeItem(AUTO_LOGIN_KEY);
      sessionStorage.setItem(AUTO_LOGIN_KEY, JSON.stringify({ user, loginAt }));
    }
  } catch {}
}

export async function clearSessionUser(): Promise<void> {
  try {
    const db = await openAuthDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUTO_SESSION_STORE, 'readwrite');
      tx.objectStore(AUTO_SESSION_STORE).delete('current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
  try {
    localStorage.removeItem(AUTO_LOGIN_KEY);
    sessionStorage.removeItem(AUTO_LOGIN_KEY);
  } catch {}
}

// ----------------- TRANSACTIONS STORAGE -----------------

function openLedgerDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}


export async function updateTransactionInIndexedDB(item: Transaction): Promise<void> {
  const db = await openLedgerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.put({
      ...item,
      market: normalizeMarketName(item.market)
    });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function saveTransactionsToIndexedDB(data: Transaction[]): Promise<void> {
  const db = await openLedgerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.clear();
    data.forEach(item => {
      store.put({
        ...item,
        market: normalizeMarketName(item.market)
      });
    });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function loadTransactionsFromIndexedDB(): Promise<Transaction[]> {
  try {
    const db = await openLedgerDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).getAll();
      req.onsuccess = () => {
        db.close();
        resolve(req.result || []);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return [];
  }
}

export function loadCollections(): CollectionRecord[] {
  try {
    const saved = localStorage.getItem(COLLECTION_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveCollections(records: CollectionRecord[]): void {
  try {
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}
