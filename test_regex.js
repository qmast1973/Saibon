const str = "● 소매 : 비바글램";
const match = str.match(/^(?:\[|★|■|▶|◆|\*|●?\s*소매\s*[:：]?\s*|상호\s*[:：]?\s*)([가-힣A-Za-z0-9_\s]{2,20})(?:\]|★|■|▶|◆|\*)?$/);
console.log(match);
