import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/<\/Suspense>/g, '');
code = code.replace(/    <\/div>\n  \);\n}/, '      </Suspense>\n    </div>\n  );\n}');
fs.writeFileSync('src/App.tsx', code);
