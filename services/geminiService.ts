import { GoogleGenAI } from "@google/genai";
import { GameState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateCorporateSpin = async (gameState: GameState, eventType: string): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    let context = `
      Current Stock Price: $${gameState.score.toFixed(2)}
      Core Temp: ${gameState.temp.toFixed(0)}C
      Audit Risk: ${gameState.auditRisk.toFixed(0)}%
      Offshore Accounts: $${gameState.offshore.toFixed(0)}
    `;

    let prompt = "";
    if (eventType === 'meltdown') {
      prompt = `You are the PR spokesperson for Enron during a nuclear meltdown. Write a single short, darkly humorous, corporate-speak sentence denying responsibility or spinning this as a "thermal restructuring opportunity". Max 15 words.`;
    } else if (eventType === 'audit') {
      prompt = `You are a nervous Enron executive. The SEC is auditing. Write a single short panicked whisper or command to shred documents. Max 10 words.`;
    } else if (eventType === 'profit') {
      prompt = `You are Jeff Skilling. Stock is up. Write a generic arrogant corporate aphorism about how smart we are. Max 12 words.`;
    } else {
      prompt = `Write a short, cryptic corporate news ticker headline for Enron Energy Services. It should sound ominous but professional. Context: ${context}. Max 10 words.`;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Communications Link Severed.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Systems Offline. Data Unavailable.";
  }
};
