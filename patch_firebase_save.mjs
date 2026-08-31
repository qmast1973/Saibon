import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

// Patch saveOrderToFirebase
code = code.replace(
  /  if \(previousDate !== date && t\.firebaseOrderId\) \{\n    await remove\(ref\(rtdb, \`orders\/\$\{previousDate\}\/\$\{firebaseId\}\`\)\);\n  \}\n  await set\(ref\(rtdb, \`orders\/\$\{date\}\/\$\{firebaseId\}\`\), payload\);\n  return firebaseId;\n\}/,
  `  try {
    const operations = [];
    if (previousDate !== date && t.firebaseOrderId) {
      operations.push(remove(ref(rtdb, \`orders/\${previousDate}/\${firebaseId}\`)));
    }
    operations.push(set(ref(rtdb, \`orders/\${date}/\${firebaseId}\`), payload));
    
    await Promise.race([
      Promise.all(operations),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB Timeout')), 1500))
    ]);
  } catch(e) {
    console.warn('Order save timeout or offline. Handled in background:', e);
  }
  return firebaseId;
}`
);

// Patch deleteOrderFromFirebase
code = code.replace(
  /  await remove\(ref\(rtdb, \`orders\/\$\{t\.firebaseDate\}\/\$\{t\.firebaseOrderId\}\`\)\);\n\}/,
  `  try {
    await Promise.race([
      remove(ref(rtdb, \`orders/\${t.firebaseDate}/\${t.firebaseOrderId}\`)),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB Timeout')), 1500))
    ]);
  } catch(e) {
    console.warn('Order delete timeout or offline. Handled in background:', e);
  }
}`
);

// Patch saveBulkOrdersToFirebase
code = code.replace(
  /    if \(Object\.keys\(updates\)\.length > 0\) \{\n      await update\(ref\(rtdb\), updates\);\n    \}/,
  `    if (Object.keys(updates).length > 0) {
      await Promise.race([
        update(ref(rtdb), updates),
        new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB Timeout')), 2000))
      ]);
    }`
);

// Patch saveGroupRulesToFirebase
code = code.replace(
  /  await set\(rulesRef, rules\);\n\}/,
  `  try {
    await Promise.race([
      set(rulesRef, rules),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB Timeout')), 1500))
    ]);
  } catch(e) {
    console.warn('saveGroupRulesToFirebase timeout:', e);
  }
}`
);

fs.writeFileSync('src/lib/firebase.ts', code);
