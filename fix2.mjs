import fs from 'fs';
let code = fs.readFileSync('src/components/DataManagementModal.tsx', 'utf8');

code = code.replace(
`    try {
      saveCollections([]);
      onResetCollectionsOnly,
  onExcelImport,
  onExcelExport,
  onBackupDB,
  onRestoreDB();
      setStatusMessage({`,
`    try {
      saveCollections([]);
      onResetCollectionsOnly();
      setStatusMessage({`
);

code = code.replace(
`        const date = t.firebaseDate || t.date;
        const fbId = t.firebaseOrderId;
        if (date && fbId) {
          await deleteOrderFromFirebase(date, fbId);
          deletedCount++;
        }`,
`        if (t.firebaseDate && t.firebaseOrderId) {
          await deleteOrderFromFirebase(t);
          deletedCount++;
        }`
);

fs.writeFileSync('src/components/DataManagementModal.tsx', code);

let navbar = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
if (!navbar.includes('Database')) {
  navbar = navbar.replace(/import { Calculator, FileSpreadsheet, Download, Trash2, Calendar, Table, HandCoins, UserCheck, Store, LogOut, Users } from 'lucide-react';/,
  "import { Calculator, FileSpreadsheet, Download, Trash2, Calendar, Table, HandCoins, UserCheck, Store, LogOut, Users, Database } from 'lucide-react';");
  fs.writeFileSync('src/components/Navbar.tsx', navbar);
}

