const MARKETS = [
  'APM', 'APM 럭스', 'APM 플레이스', '팀204', '디자이너', '누죤', '골든상가', '샤넬 마네킹', '대일 마네킹', '에소르', '누누', '유어스', '벨포스트', '퀸즈', '광희', '제일평화', '맥스타일', '신평화', '남평화', '동평화', '아트', '더블유 스튜디오', '해양', '동원', '테크노', '청평화', '신발상가', '디오트', '픽대지', '상상', '자판', '남대', '세로나', '포키', '원', '시티', '페인트', '부르뎅', '마마', '웅이', '화이트', '탑', '크레용', '키즈', '팀엔드'
];

function getChosung(str) {
  const cho = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  let result = '';
  for(let i=0; i<str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if(code > -1 && code < 11172) result += cho[Math.floor(code / 588)];
    else result += str.charAt(i);
  }
  return result;
}

function resolveMarketName(input) {
  if (!input) return '';
  const raw = input.trim().replace(/\s+/g, '').toLowerCase();
  if (!raw) return '';
  
  // 1. Exact match (ignoring spaces/case)
  for (const m of MARKETS) {
    if (m.replace(/\s+/g, '').toLowerCase() === raw) return m;
  }
  
  // 2. Chosung match
  for (const m of MARKETS) {
    const chosung = getChosung(m).replace(/\s+/g, '').toLowerCase();
    if (chosung === raw) return m;
  }
  
  // 3. Partial Chosung or Partial match (prefix)
  for (const m of MARKETS) {
    const chosung = getChosung(m).replace(/\s+/g, '').toLowerCase();
    const cleanM = m.replace(/\s+/g, '').toLowerCase();
    if (chosung.startsWith(raw) || cleanM.startsWith(raw)) return m;
  }

  // default fallback
  return input.trim().replace(/\s+/g, ' ').replace(/[A-Za-z]+/g, m => m.toUpperCase());
}
console.log(resolveMarketName('ㄷㅇㅌ'));
console.log(resolveMarketName('apm'));
console.log(resolveMarketName('팀'));
