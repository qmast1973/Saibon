import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
`    const ordersRef = ref(rtdb, 'orders');
    const snapshot = await get(ordersRef);
    if (snapshot.exists()) {
      const updates: Record<string, null> = {};
      snapshot.forEach(daySnap => {
        updates[daySnap.key] = null;
      });
      await update(ordersRef, updates);
    } else {
      await remove(ordersRef);
    }`,
`    const ordersRef = ref(rtdb, 'orders');
    const snapshot = await get(ordersRef);
    if (snapshot.exists()) {
      const deletePromises = [];
      snapshot.forEach(daySnap => {
        deletePromises.push(remove(child(ordersRef, daySnap.key)));
      });
      await Promise.all(deletePromises);
    } else {
      try { await remove(ordersRef); } catch(e) {}
    }`
);

code = code.replace(
`    const rulesRef = ref(rtdb, 'collectionGroupRules');
    const rSnapshot = await get(rulesRef);
    if (rSnapshot.exists()) {
      const rUpdates: Record<string, null> = {};
      rSnapshot.forEach(rSnap => {
        rUpdates[rSnap.key] = null;
      });
      await update(rulesRef, rUpdates);
    } else {
      await remove(rulesRef);
    }`,
`    const rulesRef = ref(rtdb, 'collectionGroupRules');
    const rSnapshot = await get(rulesRef);
    if (rSnapshot.exists()) {
      const deletePromises = [];
      rSnapshot.forEach(rSnap => {
        deletePromises.push(remove(child(rulesRef, rSnap.key)));
      });
      await Promise.all(deletePromises);
    } else {
      try { await remove(rulesRef); } catch(e) {}
    }`
);

// We need to import `child` if it's not imported
if (!code.includes('child,')) {
  code = code.replace('import { ref, get, set, remove, update, onValue }', 'import { ref, get, set, remove, update, onValue, child }');
}

fs.writeFileSync('src/lib/firebase.ts', code);
