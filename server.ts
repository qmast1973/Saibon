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
    // Check for store header like [초코송이마켓] or 상호: 초코송이
    const storeHeader = line.match(/^\[([^\]]+)\]|^상호\s*[:：]\s*(.+)$/);
    if (storeHeader) {
      currentStore = (storeHeader[1] || storeHeader[2] || '').trim();
      continue;
    }

    // Slash format: store / market / floor / room / remark
    if (line.includes('/')) {
      const parts = line.split('/').map(p => p.trim());
      if (parts.length >= 3) {
        results.push({
          store: parts[0] || currentStore || '상호 미지정',
          market: parts[1] || '',
          floor: parts[2] || '',
          room: parts[3] || '',
          remark: parts.slice(4).join(' ') || ''
        });
        continue;
      }
    }

    // Keyword detection
    let matchedMarket = '';
    for (const km of knownMarkets) {
      if (line.includes(km)) {
        matchedMarket = km;
        break;
      }
    }

    const floorMatch = line.match(/(-?\d+층|지하\s*\d+층|B\d+층?)/i);
    let working = line;
    if (matchedMarket) working = working.replace(matchedMarket, ' ');
    if (floorMatch) working = working.replace(floorMatch[0], ' ');

    const roomMatch = working.match(/([가-힣A-Za-z0-9\s-]{1,10}호|[가-힣]\s*동\s*\d+호?)/);
    if (roomMatch) working = working.replace(roomMatch[0], ' ');
    
    if (matchedMarket || floorMatch || roomMatch) {
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

Each order usually contains: market name, floor, room/store number, store name, and any notes/amounts.
Set the status as '미완료' (uncompleted) and record type as '대납' if it mentions payment, or parse accordingly.
Make sure to parse market, floor, room, store precisely.`;

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
