const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/*.tsx');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find <button ...> [닫기] </button> and add ml-auto shrink-0 to its className
  content = content.replace(/<button([^>]*)className="([^"]*)"([^>]*)>\s*\[닫기\]\s*<\/button>/g, (match, p1, p2, p3) => {
    let newClass = p2;
    if (!newClass.includes('ml-auto')) {
      newClass += ' ml-auto shrink-0';
    }
    return `<button${p1}className="${newClass}"${p3}>\n            [닫기]\n          </button>`;
  });
  
  fs.writeFileSync(file, content);
}
console.log('Done');
