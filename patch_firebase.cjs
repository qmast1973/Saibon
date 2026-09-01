const fs = require('fs');

let file = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const MARKETS = [
  'APM', 'APM 럭스', 'APM 플레이스', '팀204', '디자이너', '누죤', '골든상가', '샤넬 마네킹', '대일 마네킹', '에소르', '누누', '유어스', '벨포스트', '퀸즈', '광희', '제일평화', '맥스타일', '신평화', '남평화', '동평화', '아트', '더블유 스튜디오', '해양', '동원', '테크노', '청평화', '신발상가', '디오트', '픽대지', '상상', '자판', '===== 남대문 =====', '세로나', '포키', '원', '시티', '페인트', '부르뎅', '마마', '웅이', '화이트', '탑', '크레용', '키즈', '팀엔드'
];

file = file.replace(/const _MARKETS_FOR_RESOLVE = \[[^\]]+\];/, "const _MARKETS_FOR_RESOLVE = [\n  '" + MARKETS.join("', '") + "'\n];");
file = file.replace(/return \['APM',[^\]]+\];/, "return ['" + MARKETS.join("', '") + "'];");

fs.writeFileSync('src/lib/firebase.ts', file);
