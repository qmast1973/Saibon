import fs from 'fs';

// 1. Navbar.tsx
let navbar = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
navbar = navbar.replace(/onExcelImport: \(file: File\) => void;\n\s+onExcelExport: \(\) => void;\n\s+onResetDefaultData: \(\) => void;/g, 'onOpenDataManagement: () => void;');
navbar = navbar.replace(/onExcelImport,\n\s+onExcelExport,\n\s+onResetDefaultData,/g, 'onOpenDataManagement,');
navbar = navbar.replace(/<label className="cursor-pointer bg-emerald-600[\s\S]*?<\/button>\n\s+<\/button>/, ''); 
// We will replace the whole admin block carefully
let adminBlockRegex = /{isAdmin && \([\s\S]*?<\/button>\n\s+<\/>\n\s+\)}/;
navbar = navbar.replace(adminBlockRegex, `{isAdmin && (
            <button
              type="button"
              onClick={onOpenDataManagement}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
            >
              <Database className="w-3.5 h-3.5" />
              <span>데이터 관리</span>
            </button>
          )}`);
fs.writeFileSync('src/components/Navbar.tsx', navbar);

// 2. CollectionScreen.tsx
let col = fs.readFileSync('src/components/CollectionScreen.tsx', 'utf8');
col = col.replace(/onBackupDB: \(\) => void;\n\s+onRestoreDB: \(file: File\) => void;\n/, '');
col = col.replace(/onBackupDB,\n\s+onRestoreDB,\n/, '');
col = col.replace(/<button\n\s+type="button"\n\s+onClick={onBackupDB}[\s\S]*?<\/label>/, '');
fs.writeFileSync('src/components/CollectionScreen.tsx', col);

// 3. Rename DataResetModal to DataManagementModal
fs.renameSync('src/components/DataResetModal.tsx', 'src/components/DataManagementModal.tsx');

// 4. Update DataManagementModal.tsx
let modal = fs.readFileSync('src/components/DataManagementModal.tsx', 'utf8');
modal = modal.replace(/export const DataResetModal: React.FC<DataResetModalProps> = \(/, 'export const DataManagementModal: React.FC<DataManagementModalProps> = (');
modal = modal.replace(/interface DataResetModalProps/, 'interface DataManagementModalProps');
modal = modal.replace(/onClose: \(\) => void;/, `onClose: () => void;\n  onExcelImport: (file: File) => void;\n  onExcelExport: () => void;\n  onBackupDB: () => void;\n  onRestoreDB: (file: File) => void;`);
modal = modal.replace(/onClose,\n}/, 'onClose,\n  onExcelImport,\n  onExcelExport,\n  onBackupDB,\n  onRestoreDB\n}');
modal = modal.replace(/import { Trash2, AlertTriangle, CheckCircle2, X, Database, Loader2, Layers } from 'lucide-react';/, `import { Trash2, AlertTriangle, CheckCircle2, X, Database, Loader2, Layers, FileSpreadsheet, Download, Upload } from 'lucide-react';`);

// Insert new options at the top of the content
let newOptions = `
          {/* Excel & DB Options */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <label className="cursor-pointer bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition group">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-emerald-200">엑셀 업로드</span>
              <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={(e) => { if(e.target.files?.[0]) { onExcelImport(e.target.files[0]); onClose(); } e.target.value = ''; }} />
            </label>
            <button type="button" onClick={() => { onExcelExport(); onClose(); }} className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition group">
              <Download className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-emerald-200">엑셀 내보내기</span>
            </button>
            <button type="button" onClick={() => { onBackupDB(); onClose(); }} className="bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition group">
              <Download className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-indigo-200">DB 백업</span>
            </button>
            <label className="cursor-pointer bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition group">
              <Upload className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-indigo-200">DB 복원</span>
              <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => { if(e.target.files?.[0]) { onRestoreDB(e.target.files[0]); onClose(); } e.target.value = ''; }} />
            </label>
          </div>
`;
modal = modal.replace(/{statusMessage && \(/, newOptions + '\n          {statusMessage && (');
fs.writeFileSync('src/components/DataManagementModal.tsx', modal);

// 5. App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/import { DataResetModal } from '\.\/components\/DataResetModal';/, "import { DataManagementModal } from './components/DataManagementModal';");
app = app.replace(/showDataResetModal/g, 'showDataManagementModal');
app = app.replace(/setShowDataResetModal/g, 'setShowDataManagementModal');
app = app.replace(/<DataResetModal/g, '<DataManagementModal');
app = app.replace(/<\/DataResetModal>/g, '</DataManagementModal>');
app = app.replace(/onExcelImport={handleExcelImport}\n\s+onExcelExport={handleExcelExport}\n\s+onResetDefaultData={\(\) => setShowDataManagementModal\(true\)}/, 'onOpenDataManagement={() => setShowDataManagementModal(true)}');
app = app.replace(/onBackupDB={handleBackupDB}\n\s+onRestoreDB={handleRestoreDB}\n/, '');

// Add new props to DataManagementModal in App.tsx
let dmProps = `onExcelImport={handleExcelImport}
          onExcelExport={handleExcelExport}
          onBackupDB={handleBackupDB}
          onRestoreDB={handleRestoreDB}`;
app = app.replace(/onResetComplete={\(\) => {/g, dmProps + '\n          onResetComplete={() => {');

fs.writeFileSync('src/App.tsx', app);

