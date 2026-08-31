import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
`    const unsubOrders = syncFirebaseOrders((firebaseOrders) => {
      const isWiped = localStorage.getItem('SAIPON_DATA_INITIALIZED') === 'true';
      if (firebaseOrders.length > 0) {
        setCleanTransactions(firebaseOrders);
        saveTransactionsToIndexedDB(firebaseOrders);
      } else if (isWiped) {
        setTransactions([]);
        saveTransactionsToIndexedDB([]);
      }
    });`,
`    const unsubOrders = syncFirebaseOrders((firebaseOrders) => {
      setCleanTransactions(firebaseOrders);
      saveTransactionsToIndexedDB(firebaseOrders);
    });`
);
fs.writeFileSync('src/App.tsx', code);
