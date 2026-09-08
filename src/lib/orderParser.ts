// Dongdaemun Market & Order Smart Parser Utility

export interface ParsedOrderItem {
  id: string;
  rawText: string;
  store: string;
  market: string;
  floor: string;
  room: string;
  remark: string;
  expense?: number;
  income?: number;
  confidence: 'high' | 'medium' | 'low';
}

// 동대문 상가 표준 명칭 및 별칭(줄임말/은어) 매핑 사전
export const MARKET_DICTIONARY: { canonical: string; aliases: string[] }[] = [
  { canonical: '디오트', aliases: ['디오트', '디오', '디', 'THEOT', 'THE OT', 'DEOT'] },
  { canonical: 'APM플레이스', aliases: ['APM플레이스', 'APM 플레이스', '에이피엠플레이스', '에플', '에이플', '플레이스', 'APM PLACE', 'APM P', 'APMP', '플스'] },
  { canonical: 'APM', aliases: ['APM', '에이피엠', '에펨', 'APM LUXE', '럭스', 'APM럭스'] },
  { canonical: '청평화', aliases: ['청평화', '청평', '청', 'CPH', 'CHEONGPYEONGHWA'] },
  { canonical: '퀸즈스퀘어', aliases: ['퀸즈스퀘어', '퀸즈', '퀸', 'QUEENS', 'QUEENSSQUARE'] },
  { canonical: '디자이너클럽', aliases: ['디자이너클럽', '디자이너', '디클', 'DC', 'DESIGNER'] },
  { canonical: '벨포스트', aliases: ['벨포스트', '벨포', '벨', 'BELPOST'] },
  { canonical: '누죤', aliases: ['누죤', '누존', '누', 'NUZZON', 'NUZON'] },
  { canonical: '테크노', aliases: ['테크노', '테크', '테', 'TECHNO'] },
  { canonical: '동평화', aliases: ['동평화', '동평', '동', 'DONGPYEONGHWA', 'DPH'] },
  { canonical: '남평화', aliases: ['남평화', '남평', '남', 'NAMPYEONGHWA', 'NPH'] },
  { canonical: '신평화', aliases: ['신평화', '신평', '신', 'SHINPYEONGHWA', 'SPH'] },
  { canonical: '제일평화', aliases: ['제일평화', '제평', '제', 'JEIL', 'JPH'] },
  { canonical: 'DDP패션몰', aliases: ['DDP패션몰', 'DDP', '유어스', 'UUS', 'DDP FASHION'] },
  { canonical: '스튜디오W', aliases: ['스튜디오W', '스튜디오더블유', '스튜디오', 'SW', 'STUDIO W'] },
  { canonical: '아트프라자', aliases: ['아트프라자', '아트', 'ART'] },
  { canonical: '광희패션몰', aliases: ['광희패션몰', '광희', '광'] },
  { canonical: '엘리시움', aliases: ['엘리시움', '혜양엘리시움', '엘리', 'ELYSIUM'] },
  { canonical: '맥스타일', aliases: ['맥스타일', '맥스', 'MAX'] },
  { canonical: '평화시장', aliases: ['평화시장', '평화', '평'] },
  { canonical: '통일상가', aliases: ['통일상가', '통일', '통'] },
  { canonical: '동대문종합시장', aliases: ['동대문종합시장', '동대문종합', '종합시장'] },
  { canonical: '미수금', aliases: ['미수금', '미수'] },
  { canonical: '입금', aliases: ['입금', '송금', '이체'] }
];

/**
 * 텍스트에서 건물명을 탐지하여 표준 명칭으로 변환
 */
export function matchMarketName(token: string): { canonical: string; matchedAlias: string } | null {
  // 괄호 안의 내용 제거 (예: "CPH(청평화)" -> "CPH")
  const clean = token.replace(/\([^)]*\)/g, '').trim().toUpperCase();
  const rawClean = token.trim().toUpperCase(); // 원래 문자열(괄호 포함) 대문자
  if (!clean && !rawClean) return null;

  // 1. 긴 별칭부터 우선 검사 (예: 'APM플레이스'가 'APM'보다 먼저 매칭되도록)
  for (const entry of MARKET_DICTIONARY) {
    const sortedAliases = [...entry.aliases].sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      const uAlias = alias.toUpperCase();
      // 정확히 일치하거나, 괄호를 제거한 텍스트가 일치하는 경우
      if (clean === uAlias || rawClean === uAlias || clean.includes(uAlias)) {
        return { canonical: entry.canonical, matchedAlias: alias };
      }
    }
  }

  return null;
}

/**
 * 층/호수 패턴 분석
 * 예: 3-12, 3/12, 3층 12호, B1 5호, 지하1층 7호, 7F 45, 3층 C-12, B2-15호
 */
export function parseFloorAndRoom(text: string): { floor: string; room: string; matchedText: string } | null {
  // 1. 지하 / B층 패턴 (예: B1-12, B1 12호, 지하1층 5호, 지1 5, B2-45)
  const bPattern = /(?:지하\s*(\d+)|지\s*(\d+)|B\s*(\d+)|b\s*(\d+))(?:\s*층|\s*F)?[\s\-\/\.호]+([가-힣A-Za-z0-9\s\-]+?)(?:\s*호|$|\s+(?=[가-힣A-Za-z]))/i;
  const bMatch = text.match(bPattern);
  if (bMatch && (bMatch[1] || bMatch[2] || bMatch[3] || bMatch[4])) {
    const floorNum = bMatch[1] || bMatch[2] || bMatch[3] || bMatch[4];
    const floor = `지하${floorNum}층`;
    let room = bMatch[5] ? bMatch[5].trim() : '';
    if (room && !room.endsWith('호') && /^\d+$/.test(room)) {
      room = `${room}호`;
    }
    return { floor, room, matchedText: bMatch[0] };
  }

  // 2. 일반 지상층 + 호수 패턴 (예: 3-12, 3/12, 3.12, 3층 12호, 3F 12호, 4층 가동 15호, 3층 C열 12호)
  const standardPattern = /(\d+)(?:\s*층|\s*F|\s*f)?[\s\-\/\.호]+([가-힣A-Za-z0-9\s\-]+?)(?:\s*호|$|\s+(?=[가-힣A-Za-z]))/;
  const stdMatch = text.match(standardPattern);
  if (stdMatch) {
    const floor = `${stdMatch[1]}층`;
    let room = stdMatch[2].trim();
    if (room && !room.endsWith('호') && /^\d+$/.test(room)) {
      room = `${room}호`;
    }
    return { floor, room, matchedText: stdMatch[0] };
  }

  // 3. 단순 층만 있는 경우 (예: 3층, 4F, B1층)
  const onlyFloorPattern = /(\d+)\s*(?:층|F|f)/i;
  const flMatch = text.match(onlyFloorPattern);
  if (flMatch) {
    return { floor: `${flMatch[1]}층`, room: '', matchedText: flMatch[0] };
  }

  return null;
}

/**
 * 카카오톡 / 문자 / 엑셀 복사 텍스트를 실전 동대문 스타일로 자동 분석
 */
export function parseSmartOrderText(
  inputText: string,
  defaultStoreName: string = ''
): ParsedOrderItem[] {
  if (!inputText || !inputText.trim()) return [];

  const lines = inputText.split('\n');
  const results: ParsedOrderItem[] = [];
  let currentGroupStore = defaultStoreName.trim();
  let isFirstLine = true;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    let rawLine = lines[lineIndex].trim();
    if (!rawLine) continue;

    // 템플릿 헤더나 가이드라인, 링크 스킵
    if (
      rawLine.includes('상호/건물명/층/호수') || 
      rawLine.startsWith('===') || 
      rawLine.startsWith('---') ||
      rawLine.includes('http://') ||
      rawLine.includes('https://')
    ) {
      continue;
    }

    // 맨 첫 문장은 무조건 상호로 처리 (슬래시 분할형 등 명백한 예외 제외)
    if (isFirstLine) {
      isFirstLine = false;
      if (!rawLine.includes('/')) {
        // [상호] 같은 대괄호나 특수기호를 제거하고 상호로 취급
        const cleanStoreName = rawLine.replace(/^[\[★■▶◆\*●\s]+|[\]★■▶◆\*●\s]+$/g, '').replace(/^(?:소매|상호)\s*[:：]?\s*/, '').trim();
        currentGroupStore = cleanStoreName;
        continue;
      }
    }

    // 소매 상호 그룹 헤더 감지 (두번째 줄 이후에 또 명시적으로 [상호] 형태로 입력할 경우를 위해 유지)
    const storeHeaderMatch = rawLine.match(/^(?:\[|★|■|▶|◆|\*|●?\s*소매\s*[:：]?\s*|상호\s*[:：]?\s*)([가-힣A-Za-z0-9_\s]{2,20})(?:\]|★|■|▶|◆|\*)?$/);
    if (storeHeaderMatch) {
      const candidate = storeHeaderMatch[1].trim();
      // 건물명이 아니라 상호인 경우에만 그룹 상호로 갱신
      if (!matchMarketName(candidate)) {
        currentGroupStore = candidate;
        continue;
      }
    }

    // 1. 줄 번호 제거 (예: "1. ", "1) ", "① ")
    let cleanLine = rawLine.replace(/^(\d+[\.\)]|[①-⑳]|[\-\*\•])\s*/, '').trim();

    // 2. 슬래시(/)나 쉼표(,)로 명확히 분리된 형식인 경우 우선 처리
    if (cleanLine.includes('/') || (cleanLine.includes(',') && cleanLine.split(',').length >= 3)) {
      const delimiter = cleanLine.includes('/') ? '/' : ',';
      const parts = cleanLine.split(delimiter).map(p => p.trim());
      if (parts.length >= 2) {
        let store = '';
        let market = '';
        let floor = '';
        let room = '';
        let remark = '';

        // 첫 번째 토큰이 건물명인지 상호인지 판별
        const firstAsMarket = matchMarketName(parts[0]);
        if (firstAsMarket) {
          market = firstAsMarket.canonical;
          
          // parts[1]이 층/호수를 모두 포함하는지 확인 (예: "2층 18")
          const fr = parseFloorAndRoom(parts[1] || '');
          if (fr && fr.room) {
            floor = fr.floor;
            const wholesaleStore = parts[2] || '';
            room = fr.room + (wholesaleStore ? ` (${wholesaleStore})` : '');
            store = currentGroupStore || '상호 미지정';
            remark = parts.slice(3).join(' / ');
          } else {
            // Market / Floor / Room / Store / Remark
            floor = parts[1] || '';
            const wholesaleStore = parts[3] || '';
            room = (parts[2] || '') + (wholesaleStore ? ` (${wholesaleStore})` : '');
            store = currentGroupStore || '상호 미지정';
            remark = parts.slice(4).join(' / ');
          }
        } else {
          // Store / Market / Floor / Room / Remark
          const wholesaleStore = parts[0] || '';
          store = currentGroupStore || '상호 미지정';
          const secondAsMarket = matchMarketName(parts[1] || '');
          market = secondAsMarket ? secondAsMarket.canonical : (parts[1] || '');
          
          const fr = parseFloorAndRoom(parts[2] || '');
          if (fr && fr.room) {
            floor = fr.floor;
            room = fr.room + (wholesaleStore ? ` (${wholesaleStore})` : '');
            remark = parts.slice(3).join(' / ');
          } else {
            floor = parts[2] || '';
            room = (parts[3] || '') + (wholesaleStore ? ` (${wholesaleStore})` : '');
            remark = parts.slice(4).join(' / ');
          }
        }

        // 층/호수 보정 (예: floor에 "3-12"가 들어온 경우)
        if (floor && !room) {
          const fr2 = parseFloorAndRoom(floor);
          if (fr2 && fr2.room) {
            floor = fr2.floor;
            room = fr2.room;
          }
        }

        results.push({
          id: `parsed_${Date.now()}_${lineIndex}_${Math.random().toString(36).substring(2, 6)}`,
          rawText: rawLine,
          store: store.trim(),
          market: market.trim(),
          floor: floor.trim(),
          room: room.trim(),
          remark: remark.trim(),
          confidence: 'high'
        });
        continue;
      }
    }

    // 3. 자연어 카톡 문장 지능형 파싱 (슬래시 없는 경우)
    // 예: "디오트 3층 12호 초록밀크 바지 2장 (샘플)"
    // 예: "초록밀크 디 3-12 청바지 픽업요망"
    // 예: "APM 7F 45 아워룸 단가 15000"
    // 예: "청 B1-5 리썸"

    let detectedStore = currentGroupStore || '';
    let detectedMarket = '';
    let detectedFloor = '';
    let detectedRoom = '';
    let detectedRemark = '';

    // 토큰 단위 분석
    const tokens = cleanLine.split(/\s+/);
    let remainingTokens = [...tokens];

    // A. 건물명 찾기
    let marketFoundIndex = -1;
    for (let i = 0; i < remainingTokens.length; i++) {
      const match = matchMarketName(remainingTokens[i]);
      if (match) {
        detectedMarket = match.canonical;
        marketFoundIndex = i;
        remainingTokens.splice(i, 1);
        break;
      }
    }

    // 복합 건물명 탐색 (예: "APM" "플레이스" 2개 토큰)
    if (!detectedMarket) {
      for (let i = 0; i < remainingTokens.length - 1; i++) {
        const combo = `${remainingTokens[i]} ${remainingTokens[i + 1]}`;
        const match = matchMarketName(combo);
        if (match) {
          detectedMarket = match.canonical;
          marketFoundIndex = i;
          remainingTokens.splice(i, 2);
          break;
        }
      }
    }

    // B. 층 / 호수 패턴 추출 (남은 문장에서)
    const restText = remainingTokens.join(' ');
    const frResult = parseFloorAndRoom(restText);
    
    if (frResult) {
      detectedFloor = frResult.floor;
      detectedRoom = frResult.room;

      // 층/호수에 매칭된 단어들을 남은 텍스트에서 제거
      const cleanedRest = restText.replace(frResult.matchedText, ' ').trim();
      remainingTokens = cleanedRest.split(/\s+/).filter(Boolean);
    }

    // C. 남은 토큰에서 상호 및 비고 분리
    if (remainingTokens.length > 0) {
      if (!detectedStore) {
        // 첫 번째 남은 단어를 상호로 배정
        detectedStore = remainingTokens[0];
        remainingTokens.shift();
      }
      // 나머지는 비고/주문내용으로 배정
      detectedRemark = remainingTokens.join(' ');
    }

    if (!detectedStore) {
      detectedStore = defaultStoreName || '상호 미지정';
    }

    // 결과 판정
    const hasMarket = !!detectedMarket;
    const hasFloorOrRoom = !!detectedFloor || !!detectedRoom;
    const confidence = (hasMarket && hasFloorOrRoom) ? 'high' : hasMarket ? 'medium' : 'low';

    // 최소한 건물명이나 층/호수 또는 내용이 있는 경우에만 등록
    if (detectedMarket || detectedFloor || detectedRoom || detectedRemark) {
      results.push({
        id: `parsed_${Date.now()}_${lineIndex}_${Math.random().toString(36).substring(2, 6)}`,
        rawText: rawLine,
        store: detectedStore.trim(),
        market: detectedMarket.trim(),
        floor: detectedFloor.trim(),
        room: detectedRoom.trim(),
        remark: detectedRemark.trim(),
        confidence
      });
    }
  }

  return results;
}
