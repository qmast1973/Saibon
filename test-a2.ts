import { matchMarketName, parseFloorAndRoom } from './src/lib/orderParser';

function parseLine(line) {
    let tokens = line.split(/\s+/);
    let remainingTokens = [...tokens];
    let detectedMarket = '';
    let detectedFloor = '';
    let detectedRoom = '';
    let detectedStore = '';

    for (let i = 0; i < remainingTokens.length; i++) {
      const match = matchMarketName(remainingTokens[i]);
      if (match) {
        detectedMarket = match.canonical;
        const token = remainingTokens[i];
        const aliasRegex = new RegExp(match.matchedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const replaced = token.replace(aliasRegex, ' ').trim();
        if (replaced) {
          const newPieces = replaced.split(/\s+/);
          remainingTokens.splice(i, 1, ...newPieces);
        } else {
          remainingTokens.splice(i, 1);
        }
        break;
      }
    }

    const restText = remainingTokens.join(' ');
    const frResult = parseFloorAndRoom(restText);
    
    if (frResult) {
      detectedFloor = frResult.floor;
      detectedRoom = frResult.room;
      const cleanedRest = restText.replace(frResult.matchedText, ' ').trim();
      remainingTokens = cleanedRest.split(/\s+/).filter(Boolean);
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
            const newPieces = replaced.split(/\s+/);
            remainingTokens.splice(i, 1, ...newPieces);
          } else {
            remainingTokens.splice(i, 1);
          }
          break;
        }
      }
    }
    
    return { market: detectedMarket, floor: detectedFloor, room: detectedRoom, store: remainingTokens.join(' ') };
}

console.log(parseLine("D지하1층 15호 레귤러"));
console.log(parseLine("DDP 3층 15호"));
console.log(parseLine("D 3층 15호"));
