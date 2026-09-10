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
 *   ALL orders belonging to "호치키스" AND its subordinate stores ("호치상남", "호치창동" 등) MATCH.
 * - If the query matches a subordinate store name (e.g., "호치상남"), it matches.
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

  const store = String(t.store || '').trim();
  const cleanStore = normalizeStoreName(store);
  const storeInitials = getKoreanInitials(store).replace(/\s+/g, '').toLowerCase();

  // 1. Direct Store Name match
  if (
    cleanStore.includes(cleanQ) ||
    storeInitials.includes(qInitials) ||
    store.toLowerCase().includes(rawQ.toLowerCase())
  ) {
    return true;
  }

  // 2. Representative Store (Billing Store) match
  const billingStore = getCollectionBillingStore(store, rules);
  const cleanBillingStore = normalizeStoreName(billingStore);
  const billingStoreInitials = getKoreanInitials(billingStore).replace(/\s+/g, '').toLowerCase();

  if (
    cleanBillingStore.includes(cleanQ) ||
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

  // 4. Other transaction fields match (초성 및 공백 무시 지원)
  const combined = `${t.room || ''} ${t.floor || ''} ${t.manager || ''} ${t.localManager || ''} ${t.actualManager || ''} ${t.assignedManager || ''} ${t.market || ''} ${t.region || ''} ${t.status || ''} ${t.remark || ''} ${t.processingRemark || ''}`.toLowerCase();
  
  if (combined.includes(rawQ.toLowerCase())) return true;
  if (combined.replace(/\s+/g, '').includes(cleanQ)) return true;
  if (qInitials && getKoreanInitials(combined).replace(/\s+/g, '').includes(qInitials)) return true;

  return false;
};
