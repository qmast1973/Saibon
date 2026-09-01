const fs = require('fs');
let file = fs.readFileSync('src/components/BuyerWorkdayScreen.tsx', 'utf8');

file = file.replace(/rounded-lg p-2 border/g, 'rounded-lg p-1 border');
file = file.replace(/className="text-\[11px\]/g, 'className="text-[10px]');
file = file.replace(/className="text-base sm:text-lg font-black (.*?)"/g, 'className="text-sm sm:text-base font-black $1"');
file = file.replace(/<span className="text-xs font-normal/g, '<span className="text-[10px] font-normal');

fs.writeFileSync('src/components/BuyerWorkdayScreen.tsx', file);
