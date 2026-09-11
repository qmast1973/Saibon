const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Replace left area button (Data Management)
content = content.replace(/\{\/\* Data Management Button \(Moved here\) \*\/\}.*?<\/button>\s*\n\s*\}/s, '');

// Replace right area buttons
content = content.replace(/\{onOpenGroupRules && \(\s*<button[\s\S]*?대표거래처 관리<\/span>\s*<\/button>\s*\)\}/s, '');
content = content.replace(/\{hasAdminAccess && \(\s*<button[^>]*?onClick=\{onOpenAdminManagement\}[\s\S]*?회원관리<\/span>\s*<\/button>\s*\)\}/s, '');

// Insert Settings Button
const settingsButton = `
            {(hasAdminAccess || onOpenGroupRules) && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="bg-gray-700 hover:bg-gray-600 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-300" />
                <span>설정</span>
              </button>
            )}
`;

content = content.replace(/(<HandCoins className="w-3 h-3 sm:w-3.5 sm:h-3.5" \/>\s*<span>수금관리<\/span>\s*<\/button>\s*\)\})/, '$1' + settingsButton);

// Insert SettingsModal
const settingsModal = `
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onOpenDataManagement={onOpenDataManagement}
          onOpenGroupRules={onOpenGroupRules}
          onOpenAdminManagement={onOpenAdminManagement}
          hasAdminAccess={hasAdminAccess}
        />
      )}
`;

content = content.replace(/(<\/header>)/, settingsModal + '$1');

fs.writeFileSync('src/components/Navbar.tsx', content);
console.log('Navbar updated');
