import { CollectionGroupRule, Transaction } from '../types';

/**
 * Normalizes store name by removing all whitespace and lowercasing.
 */
export const normalizeStoreName = (name: string): string => {
  return String(name || '').replace(/\s+/g, '').toLowerCase();
};

/**
 * Extracts Korean initials (초성) from a given string.
 */
export const getKoreanInitials = (value: string): string => {
  const choseong = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  return Array.from(String(value || '')).map(char => {
    const code = char.charCodeAt(0) - 44032;
    return code >= 0 && code < 11172 ? choseong[Math.floor(code / 588)] : char;
  }).join('');
};

/**
 * Given a store name, returns its representative store name (groupName) based on collectionGroupRules.
 * If the store is already a representative store or no rule matches, returns the original store name.
 */
export const getCollectionBillingStore = (
  store: string,
  rules: CollectionGroupRule[] = []
): string => {
  const rawName = String(store || '').trim();
  if (!rawName) return rawName;

  const cleanName = normalizeStoreName(rawName);

  // 1. Check if store is already a representative store name
  const isDirectGroup = (rules || []).find(
    r => r && r.groupName && normalizeStoreName(r.groupName) === cleanName
  );
  if (isDirectGroup) {
    return isDirectGroup.groupName.trim();
  }

  // 2. Find matching rules
  const matched = (rules || [])
    .filter(rule => {
      if (!rule || !rule.storeName || !rule.groupName) return false;
      const cleanRuleStore = normalizeStoreName(rule.storeName);
      const cleanRuleGroup = normalizeStoreName(rule.groupName);

      if (cleanName === cleanRuleGroup) return true;

      if (rule.matchType === 'prefix') {
        return cleanName.startsWith(cleanRuleStore) || cleanRuleStore.startsWith(cleanName);
      }

      // Exact match (whitespace & case insensitive)
      if (cleanName === cleanRuleStore) return true;

      // Fallback: order name contains rule store or vice versa (e.g. "호치상남점" matches "호치상남")
      return cleanName.includes(cleanRuleStore) || cleanRuleStore.includes(cleanName);
    })
    .sort((a, b) => {
      const aExact = normalizeStoreName(a.storeName) === cleanName;
      const bExact = normalizeStoreName(b.storeName) === cleanName;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return String(b.effectiveFrom || '').localeCompare(String(a.effectiveFrom || ''));
    });

  return matched.length > 0 ? String(matched[0].groupName || rawName).trim() : rawName;
};

/**
 * Returns all subordinate store names for a given representative group name,
 * including the group name itself.
 */
export const getGroupSubordinateStores = (
  groupName: string,
  rules: CollectionGroupRule[] = []
): string[] => {
  const cleanGroup = normalizeStoreName(groupName);
  const stores = new Set<string>();
  stores.add(groupName.trim());

  (rules || []).forEach(r => {
    if (!r || !r.groupName || !r.storeName) return;
    if (normalizeStoreName(r.groupName) === cleanGroup) {
      stores.add(r.storeName.trim());
    }
  });

  return Array.from(stores);
};

/**
 * Checks if a transaction matches a search query with full group-awareness.
 * 
 * - If the query matches a representative store (e.g., "호치키스"),
 *   ALL orders belonging to "호치키스" AND its subordinate stores ("호치", "호치겔러리" 등) MATCH.
 * - If the query matches a subordinate store name (e.g., "호치"), it matches.
 * - Standard order properties (상가, 층, 호, 비고, 담당자 등) are also matched.
 * - Supports Korean initials (초성 검색: "ㅎㅊㅋㅅ" -> "호치키스") and whitespace insensitivity.
 */
export const matchesTransactionWithGroup = (
  t: Transaction,
  query: string,
  rules: CollectionGroupRule[] = []
): boolean => {
  const rawQ = String(query || '').trim();
  if (!rawQ) return true;

  const cleanQ = normalizeStoreName(rawQ);
  const qInitials = getKoreanInitials(rawQ).replace(/\s+/g, '').toLowerCase();

  const store = String(t.store || (t as any)._store || '').trim();
  const cleanStore = normalizeStoreName(store);
  const storeInitials = getKoreanInitials(store).replace(/\s+/g, '').toLowerCase();

  // 1. Direct Store Name match
  if (
    cleanStore.includes(cleanQ) ||
    cleanQ.includes(cleanStore) ||
    storeInitials.includes(qInitials) ||
    store.toLowerCase().includes(rawQ.toLowerCase())
  ) {
    return true;
  }

  // 2. Representative Store (Billing Store) match
  const billingStore = (t as any)._billingStore || getCollectionBillingStore(store, rules);
  const cleanBillingStore = normalizeStoreName(billingStore);
  const billingStoreInitials = getKoreanInitials(billingStore).replace(/\s+/g, '').toLowerCase();

  if (
    cleanBillingStore.includes(cleanQ) ||
    cleanQ.includes(cleanBillingStore) ||
    billingStoreInitials.includes(qInitials) ||
    billingStore.toLowerCase().includes(rawQ.toLowerCase())
  ) {
    return true;
  }

  // 3. Did user search for a group name or keyword matching any representative group?
  // If the query matches a representative groupName, any transaction mapped to that group matches!
  const matchedRules = (rules || []).filter(r => {
    if (!r || !r.groupName) return false;
    const rGroupClean = normalizeStoreName(r.groupName);
    const rGroupInitials = getKoreanInitials(r.groupName).replace(/\s+/g, '').toLowerCase();
    return (
      rGroupClean.includes(cleanQ) ||
      cleanQ.includes(rGroupClean) ||
      rGroupInitials.includes(qInitials) ||
      r.groupName.toLowerCase().includes(rawQ.toLowerCase())
    );
  });

  if (matchedRules.length > 0) {
    const belongsToMatchedGroup = matchedRules.some(r => {
      const targetGroupClean = normalizeStoreName(r.groupName);
      const targetStoreClean = normalizeStoreName(r.storeName);
      return (
        cleanBillingStore === targetGroupClean ||
        cleanStore === targetGroupClean ||
        cleanStore === targetStoreClean ||
        cleanStore.includes(targetStoreClean) ||
        targetStoreClean.includes(cleanStore) ||
        (r.matchType === 'prefix' && (cleanStore.startsWith(targetStoreClean) || targetStoreClean.startsWith(cleanStore)))
      );
    });
    if (belongsToMatchedGroup) return true;
  }

  // 4. Also check if the query matches any subordinate store belonging to this transaction's representative group
  if (cleanBillingStore) {
    const subStores = getSubStoresForRepresentative(billingStore, rules);
    const matchesAnySub = subStores.some(sub => {
      const cleanSub = normalizeStoreName(sub);
      const subInitials = getKoreanInitials(sub).replace(/\s+/g, '').toLowerCase();
      return cleanSub.includes(cleanQ) || cleanQ.includes(cleanSub) || subInitials.includes(qInitials);
    });
    if (matchesAnySub) return true;
  }

  // 5. Other transaction fields match (초성 및 공백 무시 지원)
  const combined = `${t.room || ''} ${t.floor || ''} ${t.manager || ''} ${t.localManager || ''} ${t.actualManager || ''} ${t.assignedManager || ''} ${t.market || ''} ${t.region || ''} ${t.status || ''} ${t.remark || ''} ${t.processingRemark || ''}`.toLowerCase();
  
  if (combined.includes(rawQ.toLowerCase())) return true;
  if (combined.replace(/\s+/g, '').includes(cleanQ)) return true;
  if (qInitials && getKoreanInitials(combined).replace(/\s+/g, '').includes(qInitials)) return true;

  return false;
};

/**
 * 리스트 내 종속거래처 클릭 시 정렬(Grouping/Sorting)
 * 
 * - 1순위: 동일한 대표거래처로 묶인 데이터들을 최상단으로 그룹화.
 * - 2순위: 그 안에서 동일한 개별 상호명끼리 모이도록 오름차순(가나다순) 정렬 처리.
 * - 나머지 데이터들: 대표거래처별 가나다순 -> 개별 상호명 가나다순으로 정렬.
 */
export const sortTransactionsBySubStoreClick = (
  transactions: Transaction[],
  clickedStore: string | null,
  rules: CollectionGroupRule[] = []
): Transaction[] => {
  if (!clickedStore || !clickedStore.trim()) {
    return transactions;
  }

  const targetRepresentative = normalizeStoreName(getCollectionBillingStore(clickedStore, rules));

  return [...transactions].sort((a, b) => {
    const aStore = String(a.store || (a as any)._store || '').trim();
    const bStore = String(b.store || (b as any)._store || '').trim();

    const aRep = normalizeStoreName((a as any)._billingStore || getCollectionBillingStore(aStore, rules));
    const bRep = normalizeStoreName((b as any)._billingStore || getCollectionBillingStore(bStore, rules));

    const aMatchesRep = aRep === targetRepresentative;
    const bMatchesRep = bRep === targetRepresentative;

    // 1순위: 동일한 대표거래처로 묶인 데이터들을 최상단으로 그룹화
    if (aMatchesRep && !bMatchesRep) return -1;
    if (!aMatchesRep && bMatchesRep) return 1;

    // 2순위: 그 안에서 동일한 개별 상호명끼리 모이도록 오름차순(가나다순) 정렬 처리
    const storeCompare = aStore.localeCompare(bStore, 'ko');
    if (storeCompare !== 0) return storeCompare;

    // 3순위: 날짜/시간 역순
    const aDate = String(a.date || a.businessDate || '');
    const bDate = String(b.date || b.businessDate || '');
    return bDate.localeCompare(aDate);
  });
};

/**
 * Returns strictly subordinate store names (excluding groupName itself) for a representative group.
 */
export const getSubStoresForRepresentative = (
  groupName: string,
  rules: CollectionGroupRule[] = []
): string[] => {
  const cleanGroup = normalizeStoreName(groupName);
  const subStores = new Set<string>();

  (rules || []).forEach(r => {
    if (!r || !r.groupName || !r.storeName) return;
    if (normalizeStoreName(r.groupName) === cleanGroup) {
      const cleanSub = normalizeStoreName(r.storeName);
      if (cleanSub !== cleanGroup) {
        subStores.add(r.storeName.trim());
      }
    }
  });

  return Array.from(subStores);
};

export interface GroupSearchSuggestion {
  type: 'group' | 'subordinate' | 'general';
  name: string;
  representativeName: string;
  subStores: string[];
}

/**
 * Generates search suggestions for search inputs based on collectionGroupRules and known stores.
 */
export const getGroupSearchSuggestions = (
  query: string,
  rules: CollectionGroupRule[] = [],
  knownStores: string[] = []
): GroupSearchSuggestion[] => {
  const rawQ = String(query || '').trim();
  if (!rawQ) return [];

  const cleanQ = normalizeStoreName(rawQ);
  const qInitials = getKoreanInitials(rawQ).replace(/\s+/g, '').toLowerCase();

  const results: GroupSearchSuggestion[] = [];
  const added = new Set<string>();

  // 1. Check representative groups
  const allGroupNames = Array.from(new Set(
    (rules || []).map(r => (r.groupName || '').trim()).filter(Boolean)
  ));

  allGroupNames.forEach(groupName => {
    const cleanG = normalizeStoreName(groupName);
    const gInitials = getKoreanInitials(groupName).replace(/\s+/g, '').toLowerCase();
    const subStores = getSubStoresForRepresentative(groupName, rules);

    const matchesGroup = cleanG.includes(cleanQ) || 
      gInitials.includes(qInitials) || 
      groupName.toLowerCase().includes(rawQ.toLowerCase());

    const matchedSub = subStores.find(sub => {
      const cleanSub = normalizeStoreName(sub);
      const subInitials = getKoreanInitials(sub).replace(/\s+/g, '').toLowerCase();
      return cleanSub.includes(cleanQ) || subInitials.includes(qInitials) || sub.toLowerCase().includes(rawQ.toLowerCase());
    });

    if (matchesGroup || matchedSub) {
      const key = `group:${groupName}`;
      if (!added.has(key)) {
        added.add(key);
        results.push({
          type: 'group',
          name: groupName,
          representativeName: groupName,
          subStores
        });
      }
    }
  });

  // 2. Check subordinate stores
  (rules || []).forEach(r => {
    if (!r || !r.storeName || !r.groupName) return;
    const storeName = r.storeName.trim();
    const groupName = r.groupName.trim();
    if (normalizeStoreName(storeName) === normalizeStoreName(groupName)) return;

    const cleanS = normalizeStoreName(storeName);
    const sInitials = getKoreanInitials(storeName).replace(/\s+/g, '').toLowerCase();

    if (cleanS.includes(cleanQ) || sInitials.includes(qInitials) || storeName.toLowerCase().includes(rawQ.toLowerCase())) {
      const key = `sub:${storeName}`;
      if (!added.has(key)) {
        added.add(key);
        results.push({
          type: 'subordinate',
          name: storeName,
          representativeName: groupName,
          subStores: [storeName]
        });
      }
    }
  });

  // 3. Known stores matching
  knownStores.forEach(store => {
    const s = store.trim();
    if (!s) return;
    const cleanS = normalizeStoreName(s);
    const sInitials = getKoreanInitials(s).replace(/\s+/g, '').toLowerCase();

    if (cleanS.includes(cleanQ) || sInitials.includes(qInitials) || s.toLowerCase().includes(rawQ.toLowerCase())) {
      const rep = getCollectionBillingStore(s, rules);
      const subStores = rep !== s ? getSubStoresForRepresentative(rep, rules) : [];
      const key = `store:${s}`;
      if (!added.has(key) && !added.has(`group:${s}`) && !added.has(`sub:${s}`)) {
        added.add(key);
        results.push({
          type: rep !== s ? 'subordinate' : 'general',
          name: s,
          representativeName: rep,
          subStores
        });
      }
    }
  });

  return results.slice(0, 10);
};

/**
 * Sorts StoreGroup items when a specific subordinate store is clicked.
 * - 1st priority: The group belonging to the same representative store comes to the top.
 * - 2nd priority: Alphabetical order by store name.
 */
export const sortStoreGroupsBySubStoreClick = <T extends { store: string }>(
  groups: T[],
  clickedStore: string | null,
  rules: CollectionGroupRule[] = []
): T[] => {
  if (!clickedStore || !clickedStore.trim()) {
    return groups;
  }

  const targetRepresentative = normalizeStoreName(getCollectionBillingStore(clickedStore, rules));

  return [...groups].sort((a, b) => {
    const aStore = String(a.store || '').trim();
    const bStore = String(b.store || '').trim();

    const aRep = normalizeStoreName(getCollectionBillingStore(aStore, rules));
    const bRep = normalizeStoreName(getCollectionBillingStore(bStore, rules));

    const aMatches = aRep === targetRepresentative || normalizeStoreName(aStore) === targetRepresentative;
    const bMatches = bRep === targetRepresentative || normalizeStoreName(bStore) === targetRepresentative;

    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;

    return aStore.localeCompare(bStore, 'ko');
  });
};
