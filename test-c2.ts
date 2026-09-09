import { parseSmartOrderText } from './src/lib/orderParser';

const lines = parseSmartOrderText('신발상가 C동 뒷건물 종로50번길 33 우측점포');
console.log(lines);
