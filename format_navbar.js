const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// The main flex container: add flex-wrap if not present
content = content.replace(
  /className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex justify-between gap-2 items-start"/,
  'className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex justify-between gap-2 items-start flex-wrap"'
);

// We want to replace the whole Right Area with a clean version.
// Let's first extract everything from {/* Right Area */} to </header>
