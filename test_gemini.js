import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function run() {
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: "Hello"
    });
    console.log(res.text);
  } catch(e) {
    console.error(e.message);
  }
}
run();
