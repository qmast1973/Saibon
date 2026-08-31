import fs from 'fs';
let code = fs.readFileSync('src/components/DataManagementModal.tsx', 'utf8');

code = code.replace(
`  onResetCollectionsOnly,
  onExcelImport,
  onExcelExport,
  onBackupDB,
  onRestoreDB: () => void;`,
`  onResetCollectionsOnly: () => void;`
);

fs.writeFileSync('src/components/DataManagementModal.tsx', code);
