const fs = require('fs');

let appTs = fs.readFileSync('src/App.tsx', 'utf8');

const MARKETS = [
  'APM', 'APM 럭스', 'APM 플레이스', '팀204', '디자이너', '누죤', '골든상가', '샤넬 마네킹', '대일 마네킹', '에소르', '누누', '유어스', '벨포스트', '퀸즈', '광희', '제일평화', '맥스타일', '신평화', '남평화', '동평화', '아트', '더블유 스튜디오', '해양', '동원', '테크노', '청평화', '신발상가', '디오트', '픽대지', '상상', '자판', '===== 남대문 =====', '세로나', '포키', '원', '시티', '페인트', '부르뎅', '마마', '웅이', '화이트', '탑', '크레용', '키즈', '팀엔드'
];

appTs = appTs.replace(/setFetchedMarkets<string\[\]>\(\[.*?\]\)/s, "setFetchedMarkets<string[]>([\n    '" + MARKETS.join("', '") + "'\n  ])");

// Remove .sort from allMarkets definition
// Original: const allMarkets: string[] = useMemo(() => ([...new Set([...fetchedMarkets])].filter(m => Boolean(m) && !['미수금', '결산', '회식비', '식대', '식비', '경비', '입금'].includes(m.trim())) as string[]).sort((a, b) => a.localeCompare(b, 'ko')), [fetchedMarkets]);
appTs = appTs.replace(/\.sort\(\(a, b\) => a\.localeCompare\(b, 'ko'\)\)/, "");

fs.writeFileSync('src/App.tsx', appTs);
