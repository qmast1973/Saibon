const alias = 'D';
const regex = new RegExp(`(^|[^A-Za-z])${alias}(?![A-Za-z])`, 'i');

console.log(regex.test('D지하1층')); // true
console.log(regex.test('DDP')); // false
console.log(regex.test('STUDIO D')); // true
console.log(regex.test('STUDIOD')); // false
console.log(regex.test('3층 D-12')); // true (Wait, is 3층 D-12 a market? D-12 is a room. But we don't want D to match here if D is just a room.)
