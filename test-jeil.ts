import { parseSmartOrderText } from './src/lib/orderParser';

console.log(JSON.stringify(parseSmartOrderText('제평 3층 15호 상호명'), null, 2));
console.log(JSON.stringify(parseSmartOrderText('제일평화 3층 15호 상호명'), null, 2));
console.log(JSON.stringify(parseSmartOrderText('J 3층 15호 상호명'), null, 2));
console.log(JSON.stringify(parseSmartOrderText('J지하1층 15호 상호명'), null, 2));
