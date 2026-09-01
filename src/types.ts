export type UserRole = 'merchant' | 'local' | 'buyer' | 'admin';

export interface User {
  uid?: string; // Firebase Auth UID
  email?: string; // User email for Firebase Authentication
  username: string; // unique lowercase key in firebase `users/{username}`
  name: string;
  phone?: string;
  passwordHash?: string;
  role: UserRole;
  approved: boolean;
  isBuyerAdmin?: boolean; // NEW: true if buyer has admin privileges
  storeName?: string; // For merchant

  address?: string; // For merchant delivery address
  assignedRegion?: string; // For local manager (e.g. 합성동)
  allowedMarkets?: string[]; // For buyer (e.g. 디오트, APM, etc.)
  assignedMerchants?: string[]; // For local manager (usernames of merchants)
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  firebaseOrderId?: string;
  firebaseDate?: string;
  importedFromFirebase?: boolean;
  importedFromExcel?: boolean;
  excelRowNumber?: number;
  orderAt?: string | null;
  businessDate?: string;
  date: string; // YYYY-MM-DD
  merchantId?: string;
  merchantName?: string;
  merchantStoreName?: string;
  manager: string; // e.g. 강군, 인혁, 영복, 준우, 윤승호
  originalManager?: string;
  sourceManager?: string;
  actualManager?: string;
  localManager?: string;
  assignedManager?: string;
  claimedBy?: string;
  claimedAt?: string;
  importedManagerRole?: string;
  region: string; // e.g. 합성동
  store: string; // e.g. 초록밀크, 리썸
  market: string; // e.g. 남대, 디오트, APM, 더블유, 미수금, 입금
  floor: string; // e.g. 1, 2, 지1, 원
  room: string; // e.g. 16, 221
  expense: number; // 대납금 (천원 단위 또는 원 단위 정규화)
  income: number; // 입금액
  itemCount?: number; // 물건 갯수
  isReturn?: boolean;
  status?: string; // e.g. 미송, 반품, 교환, 찾기, 주고옴, 매입처리, 완료, etc.
  remark?: string; // 비고
  recordType?: 'order' | 'receivable';
  createdAt?: string;
}

export interface CollectionRecord {
  id: string;
  store: string;
  localManager?: string;
  date: string;
  amount: number;
  method?: string;
  note?: string;
  createdAt: string;
}

export interface CollectionGroupRule {
  id: string;
  storeName: string;
  groupName: string;
  matchType: 'exact' | 'prefix';
  effectiveFrom: string; // YYYY-MM-DD
  systemDefault?: boolean;
  createdAt?: string;
}
