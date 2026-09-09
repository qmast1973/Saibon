const fs = require('fs');

// Patch CollectionScreen.tsx
let cCode = fs.readFileSync('src/components/CollectionScreen.tsx', 'utf8');

// The block to replace starts with: {/* Table Content */}
// and ends with: </table>\n            </div>\n          )}\n        </div>
let startIdx = cCode.indexOf('{/* Table Content */}');
let endIdx = cCode.indexOf('</div>\n          )}\n        </div>', startIdx);
if (endIdx > -1) {
  endIdx += '</div>\n          )}\n        </div>'.length;
}

if (startIdx > -1 && endIdx > -1) {
  const replacement = `        {/* Table Content */}
        {!dateFilter ? (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center text-gray-500 text-xs">
            <HandCoins className="w-8 h-8 text-gray-700 mx-auto mb-2 opacity-60" />
            기준 날짜를 먼저 선택해주세요.
          </div>
        ) : (
          <CollectionList 
            groups={groups} 
            allTransactions={filteredRows}
            mode="collection" 
            theme="dark" 
            onToggleComplete={handleToggleComplete}
            onAddCollection={handleOpenEntry}
            onEditDeposit={(t) => { setEditTxInfo(t); setEditAmount(String(t._income)); }}
            onDeleteDeposit={(id) => setDeleteConfirmId(id)}
          />
        )}`;
  cCode = cCode.substring(0, startIdx) + replacement + cCode.substring(endIdx);
}

// Now remove the showOrderListModal block at the end of the file
const modalStart = cCode.indexOf('{showOrderListModal && (() => {');
if (modalStart > -1) {
  const modalEnd = cCode.lastIndexOf('</>');
  if (modalEnd > -1) {
    cCode = cCode.substring(0, modalStart) + cCode.substring(modalEnd);
  }
}

if (!cCode.includes('CollectionList')) {
  cCode = cCode.replace("import { Transaction, User, CollectionGroupRule } from '../types';", 
    "import { Transaction, User, CollectionGroupRule } from '../types';\nimport { CollectionList } from './CollectionList';");
}

fs.writeFileSync('src/components/CollectionScreen.tsx', cCode, 'utf8');
