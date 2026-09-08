import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Helper to parse orders locally when API quota/rate is exceeded
function fallbackParseOrders(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results: Array<{ market: string; floor: string; room: string; store: string; remark: string }> = [];
  let currentStore = '';

  const knownMarkets = [
    'APM플레이스', 'APM 럭스', 'APM', '디오트', '청평화', '퀸즈스퀘어', '디자이너클럽',
    '벨포스트', '누죤', '테크노', '동평화', '남평화', '신평화', '제일평화', 'DDP패션몰',
    '유어스', '스튜디오W', '아트프라자', '광희패션몰', '엘리시움', '맥스타일', '평화시장',
    '통일상가', '동대문종합시장', '미수금', '입금'
  ];

  for (const line of lines) {
    // 템플릿 안내문, 시스템 알림, 링크, 고객센터 바닥글 스킵
    if (
      line.includes('상호/건물명/층/호수') || 
      line.startsWith('===') || 
      line.startsWith('---') ||
      line.includes('http://') ||
      line.includes('https://') ||
      /사입\s*요청서\s*도착/i.test(line) ||
      /\d+개중\s*\d+번째\s*주문서/i.test(line) ||
      /문의사항|카카오채널|연락\s*부탁드려요|고객센터|상세\s*주문서\s*확인/i.test(line) ||
      /이형식도\s*되게|할수있어/i.test(line)
    ) {
      continue;
    }

    // "XX으로부터 사입 요청서가 도착했습니다" 형태에서 소매 상호 추출
    const arrivalMatch = line.match(/^([가-힣A-Za-z0-9_\s]{2,25})(?:으로|로)부터\s*사입\s*요청서/);
    if (arrivalMatch) {
      currentStore = arrivalMatch[1].trim();
      continue;
    }

    // 소매 상호 헤더 (예: 📍소매명 : 애비뉴261, ● 소매 : 비바글램, [비바글램], 상호: 비바글램)
    const storeHeader = line.match(/^(?:[\[★■▶◆\*●📍📌🏷️🏢🏪\s]*)(?:소매명|소매상호|소매점|소매처|소매|상호명|상호|고객사|매장명)\s*[:：]?\s*([가-힣A-Za-z0-9_\s]{2,25})(?:[\]★■▶◆\*]|\s*$)/);
    if (storeHeader) {
      currentStore = storeHeader[1].trim();
      continue;
    }

    // 주문내용 머릿말 및 줄 번호 정제
    let cleanLine = line.replace(/^(?:[\[★■▶◆\*●📍📌🏷️🏢🏪\s]*)(?:주문내용|주문상세|주문목록|주문서|주문)\s*[:：]?\s*/i, '').trim();
    cleanLine = cleanLine.replace(/^(\d+[\.\)]|[①-⑳]|[\-\*\•])\s*/, '').trim();

    // Slash format
    if (cleanLine.includes('/')) {
      const parts = cleanLine.split('/').map(p => p.trim());
      if (parts.length >= 3) {
        // Format B: 1. APM / 2층 18 / 바이보미 / 대납 (Market / Floor Room / Store / Remark)
        if (parts[1].includes('층') || parts[1].match(/^[B\d]/i)) {
           let marketStr = parts[0].replace(/^\d+\.\s*/, '').trim();
           // e.g., "CPH(청평화)" -> "청평화"
           const parenM = marketStr.match(/^([^(]+)\(([^)]+)\)$/);
           if (parenM) {
             marketStr = parenM[2].trim();
           }
           
           const floorMatch = parts[1].match(/^([^층\s]+층|지하\s*\d+층|B\d+층?)\s*(.*)/i);
           const floor = floorMatch ? floorMatch[1] : parts[1].split(' ')[0];
           let room = floorMatch ? floorMatch[2] : parts[1].split(' ').slice(1).join(' ');
           if (room && !room.endsWith('호') && /^\d+$/.test(room)) {
             room = `${room}호`;
           }
           
           const wholesaleStore = parts[2] || '';
           const remark = parts.slice(3).join(' ') || '';
           
           results.push({
               store: currentStore || '상호 미지정',
               market: marketStr,
               floor: floor.trim(),
               room: room.trim() + (wholesaleStore ? ` (${wholesaleStore})` : ''),
               remark: remark
           });
           continue;
        } else {
          // Format A: Store / Market / Floor / Room / Remark
          const wholesaleStore = parts[0] || '';
          let room = parts[3] || '';
          if (room && !room.endsWith('호') && /^\d+$/.test(room)) {
            room = `${room}호`;
          }
          results.push({
            store: currentStore || '상호 미지정',
            market: parts[1] || '',
            floor: parts[2] || '',
            room: room + (wholesaleStore ? ` (${wholesaleStore})` : ''),
            remark: parts.slice(4).join(' ') || ''
          });
          continue;
        }
      }
    }

    // Keyword detection
    let matchedMarket = '';
    for (const km of knownMarkets) {
      if (cleanLine.includes(km)) {
        matchedMarket = km;
        break;
      }
    }

    const floorMatch = cleanLine.match(/(-?\d+층|지하\s*\d+층|B\d+층?)/i);
    let working = cleanLine;
    if (matchedMarket) working = working.replace(matchedMarket, ' ');
    if (floorMatch) working = working.replace(floorMatch[0], ' ');

    const roomMatch = working.match(/([가-힣A-Za-z0-9\s-]{1,10}호|[가-힣]\s*동\s*\d+호?)/);
    if (roomMatch) working = working.replace(roomMatch[0], ' ');
    
    // 단순 안내문구나 잡담이 아닌 건물명이 있거나 층/호수가 명확한 경우에만 주문으로 등록
    if (matchedMarket || (floorMatch && roomMatch)) {
      results.push({
        store: currentStore || '상호 미지정',
        market: matchedMarket || '건물 미지정',
        floor: floorMatch ? floorMatch[0] : '',
        room: roomMatch ? roomMatch[0].trim() : '',
        remark: working.replace(/\s+/g, ' ').trim()
      });
    }
  }

  return results;
}

// Sleep helper for backoff
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route for parsing orders with Rate-Limit protection & Multi-tier fallback
  app.post("/api/parse-orders", async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "Text input is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // If API key is missing, seamlessly use fallback parser
    if (!apiKey) {
      const orders = fallbackParseOrders(text);
      return res.json({ 
        orders, 
        fallback: true, 
        message: "Parsed via rule-based engine (GEMINI_API_KEY not configured)." 
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `Parse the following wholesale buying request text and extract the orders as a list.
Text:
"""
${text}
"""

The text may include:
- Sinsang Market requests (신상마켓 사입 요청서):
  e.g.,
  "📍소매명 : 애비뉴261" or "애비뉴261으로부터 사입 요청서가 도착했습니다." -> The retail store (소매상호) is "애비뉴261".
  "📍주문내용 : 1. APM / 1층 28 / 레이크(LAKE) / 대납"
  "2. CPH(청평화) / 지하1층 라23 / 제이런 (J-run, Jrun) / 대납"
  "3. 제일평화 / 5층 124 / 플라스틱 / 대납"
- Retail store names (소매상호) marked with "● 소매 : ...", "📍소매명 : ...", "[상호]", etc.
- Ignore all notification headers (e.g., "📩 신상마켓 사입 요청서 도착", "1개중 1번째 주문서입니다.") and contact footers (e.g., "☎️ 관련해서 문의사항...").
- Ignore user conversational queries or notes at the end (e.g., "이형식도 되게 할수있어?").
- A common order format is: "[Index]. [Market] / [Floor] [Room] / [Wholesale Store] / [Remark]" (e.g., "1. APM / 2층 18 / 바이보미 / 대납", "1. APM / 1층 28 / 레이크(LAKE) / 대납").
- Another format: "[Wholesale Store] / [Market] / [Floor] / [Room] / [Remark]".

IMPORTANT RULES FOR "store" and "room" FIELDS:
- The "store" field MUST contain the RETAIL STORE name (소매상호, e.g., "애비뉴261", "비바글램"). If it is not explicitly declared, use "상호 미지정".
- The "room" field MUST contain the room number PLUS the WHOLESALE STORE name (도매상호) in parenthesis if available. E.g., "28호 (레이크(LAKE))", "라23 (제이런 (J-run, Jrun))", "18호 (바이보미)".
- Set the status as '미완료' (uncompleted) and record type as '대납' if it mentions payment, or parse accordingly.
Make sure to parse market, floor, room precisely.`;

    const schemaConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            market: { type: Type.STRING, description: "Market/building name e.g., APM, 평화시장" },
            floor: { type: Type.STRING, description: "Floor e.g., 7층, 1층" },
            room: { type: Type.STRING, description: "Room/Store number e.g., 45, 가동 나열 7" },
            store: { type: Type.STRING, description: "Store name e.g., 아워룸, 한일상회" },
            remark: { type: Type.STRING, description: "Any special note or payment info, e.g., 대납" },
          },
          required: ["market", "floor", "room", "store"]
        }
      }
    };

    // Multi-tier model fallback list to handle Rate Exceeded (429) gracefully
    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

    for (let mIndex = 0; mIndex < modelsToTry.length; mIndex++) {
      const modelName = modelsToTry[mIndex];
      let attempts = 0;
      const maxAttempts = 2; // 2 attempts per model with backoff

      while (attempts < maxAttempts) {
        attempts++;
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: schemaConfig
          });

          const parsedText = response.text?.trim() || "[]";
          let orders = [];
          try {
            orders = JSON.parse(parsedText);
          } catch {
            orders = [];
          }

          if (!Array.isArray(orders) || orders.length === 0) {
            // If model returned empty, try fallback parse
            orders = fallbackParseOrders(text);
          }

          return res.json({ orders, modelUsed: modelName });
        } catch (error: any) {
          const errStr = String(error?.message || error || '');
          const isRateLimit = errStr.includes('429') || 
                              errStr.toLowerCase().includes('rate exceeded') || 
                              errStr.toLowerCase().includes('quota') || 
                              errStr.toLowerCase().includes('resource_exhausted');

          console.warn(`[Gemini API] Model ${modelName} attempt ${attempts} failed:`, errStr);

          if (isRateLimit && attempts < maxAttempts) {
            // Wait 1.5s before retrying
            await delay(1500);
            continue;
          }

          // If rate limited or quota exceeded, break inner loop and try next model
          break;
        }
      }
    }

    // If all models hit rate limits or failed, safely fallback to regex parser
    console.log("[Gemini API] Quota or rate exceeded across all models. Falling back to local parser.");
    const fallbackOrders = fallbackParseOrders(text);
    return res.json({ 
      orders: fallbackOrders, 
      fallback: true, 
      message: "Rate exceeded on AI model. Successfully parsed using local fallback engine." 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
