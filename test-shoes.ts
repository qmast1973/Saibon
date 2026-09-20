import { parseSmartOrderText } from './src/lib/orderParser';

const input = `애비뉴261 

APM지하1층20
APM PLACE 8-07 
신발상가 C동 뒷건물 종로50번길 33 우측점포`;

console.log(JSON.stringify(parseSmartOrderText(input), null, 2));
