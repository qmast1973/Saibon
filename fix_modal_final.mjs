import fs from 'fs';
let code = fs.readFileSync('src/components/DataManagementModal.tsx', 'utf8');

code = code.replace(
`      // 1. Mark initialized in localStorage so default data won't auto-reload
      localStorage.setItem('SAIPON_DATA_INITIALIZED', 'true');

      // 2. Clear local storage & indexedDB immediately for fast UI response
      await saveTransactionsToIndexedDB([]);
      saveCollections([]);

      // 3. Callback to clear App.tsx state
      onResetComplete();

      // 4. Firebase RTDB orders & rules reset (can take up to 3 seconds if not provisioned)
      await factoryResetDatabase();`,
`      // 1. Firebase RTDB orders & rules reset
      await factoryResetDatabase();

      // 2. Mark initialized in localStorage so default data won't auto-reload
      localStorage.setItem('SAIPON_DATA_INITIALIZED', 'true');

      // 3. Clear local storage & indexedDB
      await saveTransactionsToIndexedDB([]);
      saveCollections([]);

      // 4. Callback to clear App.tsx state
      onResetComplete();`
);

fs.writeFileSync('src/components/DataManagementModal.tsx', code);
