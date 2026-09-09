const fs = require('fs');
let code = fs.readFileSync('src/components/BuyerWorkdayStatsScreen.tsx', 'utf8');
if (!code.includes('import { CollectionList }')) {
  code = code.replace("import { Transaction, User } from '../types';", 
    "import { Transaction, User } from '../types';\nimport { CollectionList } from './CollectionList';");
  fs.writeFileSync('src/components/BuyerWorkdayStatsScreen.tsx', code, 'utf8');
}
