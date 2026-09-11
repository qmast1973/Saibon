const fs = require('fs');
const glob = require('glob');

const files = fs.readdirSync('src/components').filter(f => f.endsWith('Modal.tsx'));

files.forEach(file => {
  let path = 'src/components/' + file;
  let content = fs.readFileSync(path, 'utf8');
  
  if (content.includes('document.body.style.overflow')) return;
  
  if (!content.includes('useEffect')) {
    content = content.replace("import React", "import React, { useEffect }");
    // Also handle import { ReactNode } from 'react'
    content = content.replace("import { useState }", "import { useState, useEffect }");
  }

  // Find component declaration
  const regex = /(?:export const|export default function|const) \w+[:\s\S]*?=>\s*\{/;
  const match = content.match(regex);
  if (match) {
    const hookStr = `
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
`;
    content = content.replace(match[0], match[0] + hookStr);
    
    // Add overscroll-contain to overflow-y-auto divs
    content = content.replace(/className="([^"]*overflow-y-auto[^"]*)"/g, (m, c) => {
      if (!c.includes('overscroll-contain')) {
        return `className="${c} overscroll-contain"`;
      }
      return m;
    });

    fs.writeFileSync(path, content);
    console.log(`Updated ${path}`);
  }
});
