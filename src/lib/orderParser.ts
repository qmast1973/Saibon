// Dongdaemun Market & Order Smart Parser Utility

export interface ParsedOrderItem {
  id: string;
  rawText: string;
  store: string;
  groupStore?: string;
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
  { canonical: '디자이너클럽', aliases: ['디자이너클럽', '디자이너', '디클', 'DC', 'DESIGNER', 'D'] },
  { canonical: '벨포스트', aliases: ['벨포스트', '벨포', '벨', 'BELPOST'] },
  { canonical: '누죤', aliases: ['누죤', '누존', '누', 'NUZZON', 'NUZON'] },
  { canonical: '테크노', aliases: ['테크노', '테크', '테', 'TECHNO'] },
  { canonical: '동평화', aliases: ['동평화', '동평', '동', 'DONGPYEONGHWA', 'DPH'] },
  { canonical: '남평화', aliases: ['남평화', '남평', '남', 'NAMPYEONGHWA', 'NPH'] },
  { canonical: '신평화', aliases: ['신평화', '신평', '신', 'SHINPYEONGHWA', 'SPH'] },
  { canonical: '제일평화', aliases: ['제일평화', '제평', '제', 'JEIL', 'JPH', 'J'] },
  { canonical: '유어스', aliases: ['유어스', 'UUS', 'DDP패션몰', 'DDP', 'DDP FASHION'] },
  { canonical: '스튜디오W', aliases: ['스튜디오W', '스튜디오더블유', '스튜디오', 'SW', 'STUDIO W'] },
  { canonical: '아트프라자', aliases: ['아트프라자', '아트', 'ART'] },
  { canonical: '광희패션몰', aliases: ['광희패션몰', '광희', '광'] },
  { canonical: '엘리시움', aliases: ['엘리시움', '혜양엘리시움', '엘리', 'ELYSIUM'] },
  { canonical: '맥스타일', aliases: ['맥스타일', '맥스', 'MAX'] },
  { canonical: '평화시장', aliases: ['평화시장', '평화', '평'] },
  { canonical: '통일상가', aliases: ['통일상가', '통일', '통'] },
  { canonical: '동대문종합시장', aliases: ['동대문종합시장', '동대문종합', '종합시장'] },
  { canonical: '신발상가', aliases: ['신발상가', '청계천신발상가', '동대문신발상가', '신발'] },
  { canonical: '미수금', aliases: ['미수금', '미수'] },
  { canonical: '입금', aliases: ['입금', '송금', '이체'] }
];

/**
 * 텍스트에서 건물명을 탐지하여 표준 명칭으로 변환
 */
export function matchMarketName(token: string, exactOnly: boolean = false): { canonical: string; matchedAlias: string } | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  // 괄호가 있는 경우 분리 후보군 생성 (예: "CPH(청평화)" -> "CPH(청평화)", "CPH", "청평화")
  const candidates: string[] = [];
  candidates.push(trimmed.toUpperCase());

  const parenMatch = trimmed.match(/^([^(]+)\(([^)]+)\)$/);
  if (parenMatch) {
    candidates.push(parenMatch[1].trim().toUpperCase());
    candidates.push(parenMatch[2].trim().toUpperCase());
  }
  const withoutParen = trimmed.replace(/\([^)]*\)/g, '').trim().toUpperCase();
  if (withoutParen && !candidates.includes(withoutParen)) {
    candidates.push(withoutParen);
  }

  // 1. 정확 일치 (Exact match) 우선 - 별칭 길이 내림차순
  for (const entry of MARKET_DICTIONARY) {
    const sortedAliases = [...entry.aliases].sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      const uAlias = alias.toUpperCase();
      for (const cand of candidates) {
        if (cand === uAlias) {
          return { canonical: entry.canonical, matchedAlias: alias };
        }
      }
    }
  }

  if (exactOnly) return null;

  // 2. 부분 일치: 단, 한 글자 약어('청', '신', '남' 등)는 일반 단어(요청, 신청 등) 오인 방지를 위해 기본적으로 부분 일치 금지!
  // 단, 영문 1글자(예: 'D')는 숫자나 한글 등 다른 문자와 붙어있을 때 단독으로 인식할 수 있도록 허용
  for (const entry of MARKET_DICTIONARY) {
    const sortedAliases = [...entry.aliases].sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      const uAlias = alias.toUpperCase();
      
      if (alias.length < 2) {
        // 영문 1글자(예: D)인 경우에만 부분 일치 허용 (맨 앞이거나 기호 뒤)
        if (/^[A-Za-z]$/.test(alias)) {
          for (const cand of candidates) {
            const regex = new RegExp(`(^|[^A-Za-z])${alias}(?![A-Za-z])`, 'i');
            if (regex.test(cand)) {
              return { canonical: entry.canonical, matchedAlias: alias };
            }
          }
        }
        continue;
      }

      for (const cand of candidates) {
        if (cand.includes(uAlias)) {
          return { canonical: entry.canonical, matchedAlias: alias };
        }
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
  const bPattern = /(?:지하\s*(\d+)|지\s*(\d+)|B\s*(\d+)|b\s*(\d+))(?:(?:\s*층|\s*F|\s*f)[\s\-\/\.호~]*|[\s\-\/\.호~]*)([가-힣A-Za-z0-9\s\-~]+?)(?:\s*호|$|\s+(?=[가-힣A-Za-z]))/i;
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
  const standardPattern = /(\d+)(?:(?:\s*층|\s*F|\s*f)[\s\-\/\.호~]*|[\-\/\.])([가-힣A-Za-z0-9\s\-~]+?)(?:\s*호|$|\s+(?=[가-힣A-Za-z]))/;
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

  // 4. 동만 있는 경우 (예: C동, 가동, 에이동)
  const dongPattern = /([가-힣A-Za-z]+)\s*동(?:\s|$)/;
  const dongMatch = text.match(dongPattern);
  if (dongMatch) {
    return { floor: `${dongMatch[1]}동`, room: '', matchedText: dongMatch[0].trim() };
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
  
  // 텍스트 맨 아래에 상호(바이어명)가 적혀있는 포맷 감지 (Footer Store)
  let footerStoreName = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    const text = lines[i].trim();
    if (!text) continue;
    if (text.startsWith('===') || text.startsWith('---') || text.includes('http')) continue;
    
    // 하단 줄에 건물명이나 층/호수가 포함되어 있으면 주문 내역의 끝이므로 상호가 없는 것으로 간주
    if (matchMarketName(text) || parseFloorAndRoom(text)) {
      break; 
    }
    
    // 15자 이내의 짧은 텍스트이고 주문/샘플 등의 키워드가 아니면 하단 상호로 간주
    if (text.length > 0 && text.length <= 15 && !/주문|샘플|교환|미송|반품|신상/i.test(text)) {
      footerStoreName = text.replace(/^[\[★■▶◆\*●📍📌🏷️\s]+|[\]★■▶◆\*●\s]+$/g, '').trim();
    }
    break; // 제일 마지막 유의미한 줄 하나만 검사
  }

  let currentGroupStore = footerStoreName || defaultStoreName.trim();
  let isFirstLine = true;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    let rawLine = lines[lineIndex].trim();
    if (!rawLine) continue;

    // 템플릿 헤더나 가이드라인, 링크, 공지/알림톡 머릿글/바닥글 스킵
    if (
      rawLine.includes('상호/건물명/층/호수') || 
      rawLine.startsWith('===') || 
      rawLine.startsWith('---') ||
      rawLine.includes('http://') ||
      rawLine.includes('https://') ||
      /사입\s*요청서\s*도착/i.test(rawLine) ||
      /\d+개중\s*\d+번째\s*주문서/i.test(rawLine) ||
      /문의사항|카카오채널|연락\s*부탁드려요|고객센터|상세\s*주문서\s*확인/i.test(rawLine) ||
      /이형식도\s*되게|할수있어/i.test(rawLine)
    ) {
      continue;
    }

    // "XX으로부터 사입 요청서가 도착했습니다" 형태에서 소매 상호 추출
    const arrivalMatch = rawLine.match(/^([가-힣A-Za-z0-9_\s]{2,25})(?:으로|로)부터\s*사입\s*요청서/);
    if (arrivalMatch) {
      const cand = arrivalMatch[1].trim();
      if (!matchMarketName(cand)) {
        currentGroupStore = cand;
      }
      continue;
    }

    // 소매 상호 그룹 헤더 감지 (예: "📍소매명 : 애비뉴261", "● 소매 : 비바글램", "[비바글램]", "상호 : 비바글램")
    const storeHeaderMatch = rawLine.match(/^(?:[\[★■▶◆\*●📍📌🏷️🏢🏪\s]*)(?:소매명|소매상호|소매점|소매처|소매|상호명|상호|고객사|매장명)\s*[:：]?\s*([가-힣A-Za-z0-9_\s]{2,25})(?:[\]★■▶◆\*]|\s*$)/);
    if (storeHeaderMatch) {
      const candidate = storeHeaderMatch[1].trim();
      // 건물명이 아니라 상호인 경우에만 그룹 상호로 갱신
      if (!matchMarketName(candidate)) {
        currentGroupStore = candidate;
        continue;
      }
    }

    // 맨 첫 문장은 명시적 상호이거나 단순 상호명일 때만 상호로 처리 (알림 헤더나 시스템 문구 제외)
    if (isFirstLine) {
      isFirstLine = false;
      if (
        !rawLine.includes('/') && 
        !/도착|요청서|주문서|신상마켓|카카오|안내|공지|주문내용/i.test(rawLine)
      ) {
        const cleanStoreName = rawLine
          .replace(/^[\[★■▶◆\*●📍📌🏷️🏢🏪\s]+|[\]★■▶◆\*●\s]+$/g, '')
          .replace(/^(?:소매명|소매상호|소매점|소매처|소매|상호명|상호|고객사|매장명)\s*[:：]?\s*/, '')
          .trim();
        if (cleanStoreName && !matchMarketName(cleanStoreName)) {
          currentGroupStore = cleanStoreName;
          continue;
        }
      }
    }

    // 1. 주문내용 접두어 제거 (예: "📍주문내용 : 1. APM / 1층 28 ...")
    let cleanLine = rawLine.replace(/^(?:[\[★■▶◆\*●📍📌🏷️🏢🏪\s]*)(?:주문내용|주문상세|주문목록|주문서|주문)\s*[:：~-]?\s*/i, '').trim();

    // 2. 줄 번호 제거 (예: "1. ", "1) ", "① ")
    cleanLine = cleanLine.replace(/^(\d+[\.\)]|[①-⑳]|[\-\*\•])\s*/, '').trim();

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
            room = fr.room;
            store = parts[2] || '상호 미지정';
            remark = parts.slice(3).join(' / ');
          } else {
            // Market / Floor / Room / Store / Remark
            floor = parts[1] || '';
            room = parts[2] || '';
            store = parts[3] || '상호 미지정';
            remark = parts.slice(4).join(' / ');
          }
        } else {
          // Store / Market / Floor / Room / Remark
          store = parts[0] || '상호 미지정';
          const secondAsMarket = matchMarketName(parts[1] || '');
          market = secondAsMarket ? secondAsMarket.canonical : (parts[1] || '');
          
          const fr = parseFloorAndRoom(parts[2] || '');
          if (fr && fr.room) {
            floor = fr.floor;
            room = fr.room;
            remark = parts.slice(3).join(' / ');
          } else {
            floor = parts[2] || '';
            room = parts[3] || '';
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
          groupStore: currentGroupStore,
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

    let detectedStore = '';
    let detectedMarket = '';
    let detectedFloor = '';
    let detectedRoom = '';
    let detectedRemark = '';

    // 토큰 단위 분석
    const tokens = cleanLine.split(/\s+/);
    let remainingTokens = [...tokens];
    // 복합 건물명 탐색 (예: "APM" "플레이스" 2개 토큰) 우선 확인
    let marketFoundIndex = -1;
    for (let i = 0; i < remainingTokens.length - 1; i++) {
      const combo = `${remainingTokens[i]} ${remainingTokens[i + 1]}`;
      const match = matchMarketName(combo, true); // 복합 건물명은 완전 일치만 허용
      if (match) {
        detectedMarket = match.canonical;
        marketFoundIndex = i;
        remainingTokens.splice(i, 2);
        break;
      }
    }

    // 복합 명칭이 없으면 단일 단어에서 탐색
    if (!detectedMarket) {
      for (let i = 0; i < remainingTokens.length; i++) {
        const match = matchMarketName(remainingTokens[i]);
        if (match) {
          detectedMarket = match.canonical;
          marketFoundIndex = i;
          
          // 만약 띄어쓰기 없이 붙어있는 경우(예: 디오트4층G16), 건물명만 지우고 나머지는 남김
          const token = remainingTokens[i];
          const aliasRegex = new RegExp(match.matchedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          const replaced = token.replace(aliasRegex, ' ').trim();
          if (replaced) {
            const newPieces = replaced.split(/\s+/);
            remainingTokens.splice(i, 1, ...newPieces);
          } else {
            remainingTokens.splice(i, 1);
          }
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

    // A-2. 만약 A단계에서 건물명을 못 찾았다면, B단계에서 층/호수를 지운 나머지 텍스트로 다시 한 번 건물명(특히 1글자 영문 약어) 탐색
    if (!detectedMarket) {
      for (let i = 0; i < remainingTokens.length; i++) {
        const match = matchMarketName(remainingTokens[i]);
        if (match) {
          detectedMarket = match.canonical;
          const token = remainingTokens[i];
          const aliasRegex = new RegExp(match.matchedAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          const replaced = token.replace(aliasRegex, ' ').trim();
          if (replaced) {
            const newPieces = replaced.split(/\s+/);
            remainingTokens.splice(i, 1, ...newPieces);
          } else {
            remainingTokens.splice(i, 1);
          }
          break;
        }
      }
    }

    // C. 남은 토큰에서 상호 및 비고 분리
    if (remainingTokens.length > 0) {
      // 건물명과 층(동)이 명확히 있고(예: 신발상가 C동), 호수가 따로 없는 야외/특수 상가인 경우
      // 남은 텍스트 전체를 상호 대신 '비고'로 넣는 것이 자연스러울 수 있음
      if (detectedMarket === '신발상가' && detectedFloor.endsWith('동') && !detectedRoom) {
         detectedStore = '상호 미지정';
         detectedRemark = remainingTokens.join(' ');
      } else {
        // 항상 첫 번째 남은 단어를 도매 상호로 배정
        detectedStore = remainingTokens[0];
        remainingTokens.shift();
        // 나머지는 비고/주문내용으로 배정
        detectedRemark = remainingTokens.join(' ');
      }
    }

    if (!detectedStore) {
      detectedStore = '상호 미지정';
    }

    // 결과 판정
    const hasMarket = !!detectedMarket;
    const hasFloorOrRoom = !!detectedFloor || !!detectedRoom;
    const confidence = (hasMarket && hasFloorOrRoom) ? 'high' : hasMarket ? 'medium' : 'low';

    // 슬래시/쉼표 구분이 없는 일반 줄인 경우, 최소한 건물명이 있거나 층+호수가 명확해야 주문으로 인정
    // (단순 안내 문구, 질문, 잡담이 주문으로 둔갑하는 것 방지)
    if (detectedMarket || (detectedFloor && detectedRoom)) {
      results.push({
        id: `parsed_${Date.now()}_${lineIndex}_${Math.random().toString(36).substring(2, 6)}`,
        rawText: rawLine,
        store: detectedStore.trim(),
        groupStore: currentGroupStore,
        market: detectedMarket.trim(),
        floor: detectedFloor.trim(),
        room: detectedRoom.trim(),
        remark: detectedRemark.trim(),
        confidence
      });
    } else {
      // 파싱 실패한 줄 처리 (예: "주문건", "샘플건", 다음 줄로 넘어간 비고 등)
      if (results.length > 0) {
        const lastItem = results[results.length - 1];
        // 텍스트 최하단에 있는 상호명(푸터)과 동일한 텍스트면 무시
        if (rawLine === footerStoreName) continue;
        
        // 주문/샘플 관련 키워드가 있거나 길이가 짧은 부가 설명인 경우, 바로 윗 주문의 비고에 자연스럽게 병합
        if (rawLine.length < 25 || /주문|샘플|교환|미송|반품|신상/i.test(rawLine)) {
          lastItem.remark = lastItem.remark ? `${lastItem.remark} / ${rawLine}` : rawLine;
          lastItem.rawText += `\n${rawLine}`;
        }
      }
    }
  }

  return results;
}
