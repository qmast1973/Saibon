const fs = require('fs');

const files = [
  'src/components/AiOrderImportModal.tsx',
  'src/components/BoardScreen.tsx',
  'src/components/GroupRulesManagerModal.tsx',
  'src/components/DataManagementModal.tsx',
  'src/components/CollectionList.tsx',
  'src/components/CollectionScreen.tsx'
];

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/(className="[^"]*cursor-pointer[^"]*)(")([^>]*>\s*\[닫기\])/g, '$1 ml-auto shrink-0$2$3');
  fs.writeFileSync(f, content);
}
console.log('Done');
