import fs from 'fs';
let code = fs.readFileSync('src/components/ExcelImportWizard.tsx', 'utf8');

if (!code.includes('isSaving')) {
  code = code.replace(
    'const [managerRoleMapping, setManagerRoleMapping] = useState<Record<string, UserRole | \'other\'>>({});',
    'const [managerRoleMapping, setManagerRoleMapping] = useState<Record<string, UserRole | \'other\'>>({});\n  const [isSaving, setIsSaving] = useState(false);'
  );
  
  code = code.replace(
    '  const handleNextManager = () => {',
    '  const handleNextManager = async () => {\n    if (isSaving) return;'
  );

  code = code.replace(
    'finalize(activeRowsForImport, managerRoleMapping);',
    'setIsSaving(true);\n      try {\n        await finalize(activeRowsForImport, managerRoleMapping);\n      } catch (err) {\n        console.error(err);\n        alert("저장 중 오류가 발생했습니다.");\n      } finally {\n        setIsSaving(false);\n      }'
  );

  // also update finalize to be async
  code = code.replace(
    'const finalize = (rows: any[], mapping: Record<string, UserRole | \'other\'>) => {',
    'const finalize = async (rows: any[], mapping: Record<string, UserRole | \'other\'>) => {'
  );
  code = code.replace(
    'onImportFinalized(finalTransactions);',
    'await onImportFinalized(finalTransactions);'
  );

  // Update button text to show loading
  code = code.replace(
    "{managerIndex + 1 >= managers.length ? '가져오기 완료' : '확인하고 다음'} <ArrowRight className=\"w-3.5 h-3.5\" />",
    "{isSaving ? '저장 중...' : (managerIndex + 1 >= managers.length ? '가져오기 완료' : '확인하고 다음')} {!isSaving && <ArrowRight className=\"w-3.5 h-3.5\" />}"
  );
  code = code.replace(
    '<button\n                type="button"\n                onClick={handleNextManager}',
    '<button\n                type="button"\n                disabled={isSaving}\n                onClick={handleNextManager}'
  );
}

fs.writeFileSync('src/components/ExcelImportWizard.tsx', code);
