import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
`export async function factoryResetDatabase(): Promise<void> {
  try {
    // 실사용 준비를 위해 전체 데이터 초기화 (유저 제외)
    await remove(ref(rtdb, 'orders'));
    await remove(ref(rtdb, 'collectionGroupRules'));
    // 기타 필요한 노드 추가 삭제 가능
  } catch (error) {
    console.error('Factory reset failed:', error);
    throw error;
  }
}`,
`export async function factoryResetDatabase(): Promise<void> {
  try {
    const ordersRef = ref(rtdb, 'orders');
    const snapshot = await get(ordersRef);
    if (snapshot.exists()) {
      const updates: Record<string, null> = {};
      snapshot.forEach(daySnap => {
        updates[daySnap.key] = null;
      });
      await update(ordersRef, updates);
    } else {
      await remove(ordersRef);
    }
    
    const rulesRef = ref(rtdb, 'collectionGroupRules');
    const rSnapshot = await get(rulesRef);
    if (rSnapshot.exists()) {
      const rUpdates: Record<string, null> = {};
      rSnapshot.forEach(rSnap => {
        rUpdates[rSnap.key] = null;
      });
      await update(rulesRef, rUpdates);
    } else {
      await remove(rulesRef);
    }
  } catch (error) {
    console.error('Factory reset failed:', error);
    throw error;
  }
}`
);

fs.writeFileSync('src/lib/firebase.ts', code);
