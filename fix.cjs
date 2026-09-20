const fs = require('fs');
const path = require('path');
const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
for (const f of files) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/<button([^>]*)className="([^"]*)"([^>]*)>\s*\[닫기\]\s*<\/button>/g, (match, p1, p2, p3) => {
    let newClass = p2;
    if (!newClass.includes('ml-auto')) {
      newClass += ' ml-auto shrink-0';
    }
    return `<button${p1}className="${newClass}"${p3}>\n            [닫기]\n          </button>`;
  });
  fs.writeFileSync(p, content);
}
console.log("Done");
