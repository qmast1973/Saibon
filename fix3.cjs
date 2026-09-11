const fs = require('fs');
const glob = require('glob');
const files = require('fs').readdirSync('src/components').filter(f => f.endsWith('.tsx')).map(f => 'src/components/' + f);
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/(ml-auto shrink-0 )+ml-auto shrink-0/g, 'ml-auto shrink-0');
  content = content.replace(/cursor-pointer ml-auto shrink-0 ml-auto shrink-0/g, 'cursor-pointer ml-auto shrink-0');
  fs.writeFileSync(f, content);
}
console.log('Cleaned');
