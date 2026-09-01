const fs = require('fs');
let file = fs.readFileSync('src/components/OrderEntryModal.tsx', 'utf8');

file = file.replace(/const \[expense, setExpense\] = [^\n]*\n/g, '');
file = file.replace(/const \[income, setIncome\] = [^\n]*\n/g, '');
file = file.replace(/const \[status, setStatus\] = [^\n]*\n/g, '');
file = file.replace(/const \[manager, setManager\] = [^\n]*\n/g, '');
file = file.replace(/const \[region, setRegion\] = [^\n]*\n/g, '');

file = file.replace(/manager: isBuyer \? \(editingTransaction\.manager \|\| manager\) : manager,/g, 'manager: editingTransaction?.manager || "",');
file = file.replace(/region: region \|\| editingTransaction\.region \|\| '합성동',/g, 'region: editingTransaction?.region || "",');
file = file.replace(/expense: Number\(expense\) \|\| 0,/g, 'expense: editingTransaction?.expense || 0,');
file = file.replace(/income: Number\(income\) \|\| 0,/g, 'income: editingTransaction?.income || 0,');
file = file.replace(/status: status\.trim\(\),/g, 'status: editingTransaction?.status || "",');

file = file.replace(/manager: manager\.trim\(\),/g, 'manager: "",');
file = file.replace(/region: region\.trim\(\) \|\| '합성동',/g, 'region: "",');

// Also remove the JSX blocks:
// 1. Manager and Region block
const managerRegionRegex = /\{\/\* If not merchant: allow assigning manager\/region \*\/\}\s*\{\!isMerchant && \(\s*<div className="grid grid-cols-2 gap-3">[\s\S]*?<\/div>\s*\)\}/;
file = file.replace(managerRegionRegex, '');

// 2. Financial & Status block
const financialRegex = /\{\/\* Financial & Status for Admins \/ Buyers \*\/\}\s*\{\!isMerchant && \(\s*<div className="grid grid-cols-3 gap-2.5 pt-1">[\s\S]*?<\/div>\s*\)\}/;
file = file.replace(financialRegex, '');

fs.writeFileSync('src/components/OrderEntryModal.tsx', file);
