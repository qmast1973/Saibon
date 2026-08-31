import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
`export async function factoryResetDatabase(): Promise<void> {
  const timeoutMs = 3000;
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("RTDB Timeout")), timeoutMs));
  
  try {
    const doReset = async () => {
      const ordersRef = ref(rtdb, 'orders');
      const snapshot = await get(ordersRef);
      if (snapshot.exists()) {
        const deletePromises = [];
        snapshot.forEach(daySnap => {
          deletePromises.push(remove(child(ordersRef, daySnap.key)));
        });
        await Promise.all(deletePromises);
      } else {
        try { await remove(ordersRef); } catch(e) {}
      }
      
      const rulesRef = ref(rtdb, 'collectionGroupRules');
      const rSnapshot = await get(rulesRef);
      if (rSnapshot.exists()) {
        const deletePromises = [];
        rSnapshot.forEach(rSnap => {
          deletePromises.push(remove(child(rulesRef, rSnap.key)));
        });
        await Promise.all(deletePromises);
      } else {
        try { await remove(rulesRef); } catch(e) {}
      }
    };
    
    await Promise.race([doReset(), timeoutPromise]);
  } catch (error) {
    console.warn('Firebase RTDB reset timed out or failed (likely not provisioned). Continuing with local reset.', error);
    // Do not throw so local DB reset can proceed
  }
}`,
`export async function factoryResetDatabase(): Promise<void> {
  try {
    await remove(ref(rtdb, 'orders'));
    await remove(ref(rtdb, 'collectionGroupRules'));
  } catch (error) {
    console.error('Factory reset failed:', error);
    throw error;
  }
}`
);

fs.writeFileSync('src/lib/firebase.ts', code);
