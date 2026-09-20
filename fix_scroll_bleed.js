const fs = require('fs');

function addScrollLock(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('document.body.style.overflow')) return;
  
  if (!content.includes('useEffect')) {
    content = content.replace("import React", "import React, { useEffect }");
  }

  // Very naive insertion - just looking for the component declaration
  const componentMatch = content.match(/(?:export const|const) (\w+)[\s\S]*?=>\s*\{/);
  if (componentMatch) {
    const hookStr = `
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
`;
    content = content.replace(componentMatch[0], componentMatch[0] + hookStr);
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}

// We'll just update SettingsModal for now, plus any others if user wants.
