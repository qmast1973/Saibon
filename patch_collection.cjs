const fs = require('fs');
let file = fs.readFileSync('src/components/CollectionScreen.tsx', 'utf8');

file = file.replace(/<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">/g, '<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">');
file = file.replace(/className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm"/g, 'className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm"');
file = file.replace(/className="text-\[11px\] text-slate-500 font-semibold"/g, 'className="text-[10px] text-slate-500 font-semibold"');
file = file.replace(/className="font-bold text-lg sm:text-xl (.*?) mt-1 font-mono"/g, 'className="font-bold text-sm sm:text-base $1 mt-0.5 font-mono"');

fs.writeFileSync('src/components/CollectionScreen.tsx', file);
