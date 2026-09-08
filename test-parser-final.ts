import { parseSmartOrderText } from './src/lib/orderParser';

console.log(JSON.stringify(parseSmartOrderText('D지하1층15호 레귤러'), null, 2));
console.log(JSON.stringify(parseSmartOrderText('D 3층 15호 레귤러'), null, 2));
console.log(JSON.stringify(parseSmartOrderText('DDP지하1층15호 레귤러'), null, 2));
console.log(JSON.stringify(parseSmartOrderText('DDP 3층 15호 레귤러'), null, 2));
