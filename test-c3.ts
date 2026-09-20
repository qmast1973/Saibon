import { matchMarketName, parseFloorAndRoom } from './src/lib/orderParser';

const tokens = '신발상가 C동 뒷건물 종로50번길 33 우측점포'.split(/\s+/);
console.log('tokens:', tokens);

let remainingTokens = [...tokens];
let detectedMarket = '';

for (let i = 0; i < remainingTokens.length - 1; i++) {
  const combo = `${remainingTokens[i]} ${remainingTokens[i + 1]}`;
  const match = matchMarketName(combo);
  if (match) {
    detectedMarket = match.canonical;
    remainingTokens.splice(i, 2);
    break;
  }
}

if (!detectedMarket) {
  for (let i = 0; i < remainingTokens.length; i++) {
    const match = matchMarketName(remainingTokens[i]);
    if (match) {
      detectedMarket = match.canonical;
      const token = remainingTokens[i];
      const aliasRegex = new RegExp(match.matchedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const replaced = token.replace(aliasRegex, ' ').trim();
      if (replaced) {
        remainingTokens.splice(i, 1, ...replaced.split(/\s+/));
      } else {
        remainingTokens.splice(i, 1);
      }
      break;
    }
  }
}

console.log('after market:', remainingTokens);

const restText = remainingTokens.join(' ');
const frResult = parseFloorAndRoom(restText);
if (frResult) {
    const cleanedRest = restText.replace(frResult.matchedText, ' ').trim();
    remainingTokens = cleanedRest.split(/\s+/).filter(Boolean);
}

console.log('after fr:', remainingTokens);
