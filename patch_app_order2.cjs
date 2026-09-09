const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "stores={stores}\n          allMarkets={allMarkets}\n          onClose={() => {",
  "stores={stores}\n          allMarkets={currentUser?.role === 'buyer' && !currentUser.isBuyerAdmin ? (currentUser.allowedMarkets || []) : allMarkets}\n          onClose={() => {"
);

fs.writeFileSync('src/App.tsx', code, 'utf8');
