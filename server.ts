import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for parsing orders
  app.post("/api/parse-orders", async (req, res) => {
    try {
      const { text } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server." });
      }

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text input is required." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: `Parse the following wholesale buying request text and extract the orders as a list.
Text:
"""
${text}
"""

Each order usually contains: market name, floor, room/store number, store name, and any notes/amounts.
Set the status as '미완료' (uncompleted) and record type as '대납' if it mentions payment, or parse accordingly.
Make sure to parse market, floor, room, store precisely.`,
        config: {
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
        }
      });

      const parsedText = response.text?.trim() || "[]";
      let orders = [];
      try {
        orders = JSON.parse(parsedText);
      } catch (e) {
        orders = [];
      }

      res.json({ orders });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to parse orders" });
    }
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
