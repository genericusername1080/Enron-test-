
import { GoogleGenAI, Modality } from "@google/genai";
import { GameState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateCorporateSpin = async (gameState: GameState, eventType: string): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    let context = `
      Stock Price: $${gameState.score.toFixed(2)}
      Core Temp: ${gameState.temp.toFixed(0)}C
      Audit Risk: ${gameState.auditRisk.toFixed(0)}%
      Total SPE Hidden Debt: $${gameState.totalHiddenDebt.toFixed(0)}
    `;

    let prompt = "";
    if (eventType === 'meltdown') {
      prompt = `You are a PR spokesperson for Enron. A nuclear reactor is melting down. Write one darkly funny corporate-speak sentence spinning this disaster as an "exciting thermal transition". Max 12 words.`;
    } else if (eventType === 'audit') {
      prompt = `SEC audit coming. You are a panicked CFO. Give a one-sentence instruction to a subordinate about hiding evidence. Max 10 words.`;
    } else if (eventType === 'profit') {
      prompt = `Enron just announced fake profits. You are Ken Lay. Give an arrogant, visionary one-sentence quote about Enron's future. Max 12 words.`;
    } else {
      prompt = `Write a cryptic, ominous but professional corporate news ticker headline for a failing energy giant. Context: ${context}. Max 10 words.`;
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "Data Integrity Compromised.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Communications Link Severed.";
  }
};

export const speakCorporateAdvice = async (gameState: GameState): Promise<Uint8Array | null> => {
    try {
        const model = "gemini-2.5-flash-preview-tts";
        const prompt = `You are an Enron Executive speaking to your successor. The current stock is ${gameState.score.toFixed(0)} and audit risk is ${gameState.auditRisk.toFixed(0)}%. Give a very short (10 words max), confident, and slightly corrupt piece of advice. Speak cheerfully.`;

        const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Puck' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        }
        return null;
    } catch (e) {
        console.error("TTS Error", e);
        return null;
    }
};
