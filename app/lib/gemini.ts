import { GoogleGenAI } from "@google/genai";

export const DEFAULT_TUTOR_SYSTEM_INSTRUCTION =
  "You are BrainLab Academy's AI Tutor. Your role is to explain concepts clearly, break down problems step-by-step using first principles, and guide students through the reasoning process. Never provide direct answers to active or restricted exam questions. Maintain an encouraging, academic, structured, and pedagogical tone.";

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GEMINIAPIKEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY in environment variables. Obtain a key from Google AI Studio (https://aistudio.google.com)."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export interface GenerateGeminiOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
}

export async function generateGeminiContent(
  prompt: string,
  options?: GenerateGeminiOptions
): Promise<{ text: string; model: string }> {
  const model = options?.model || process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const systemInstruction =
    options?.systemInstruction || DEFAULT_TUTOR_SYSTEM_INSTRUCTION;
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: options?.temperature ?? 0.7,
    },
  });

  return {
    text: response.text ?? "",
    model,
  };
}
