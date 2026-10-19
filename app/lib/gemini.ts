import { GoogleGenAI } from "@google/genai";
import { cleanAIResponse, MAX_AI_OUTPUT_TOKENS } from "./cleanText";

export const DEFAULT_TUTOR_SYSTEM_INSTRUCTION =
  "You are BrainLab Academy's AI Tutor. Provide clear, direct, and concise pedagogical explanations under 180 words. Never output markdown hashtags (#) or asterisks (* or **). Never use asterisks for bold, italic, or bullet lists. Write in clean plain text only using simple numbered lists (1., 2.) or regular line breaks. Help students understand the core concept and avoid common mistakes without long essays.";

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
  maxOutputTokens?: number;
}

export async function generateGeminiContent(
  prompt: string,
  options?: GenerateGeminiOptions
): Promise<{ text: string; model: string }> {
  const model = options?.model || process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  const systemInstruction =
    options?.systemInstruction || DEFAULT_TUTOR_SYSTEM_INSTRUCTION;
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      temperature: options?.temperature ?? 0.4,
      maxOutputTokens: options?.maxOutputTokens ?? MAX_AI_OUTPUT_TOKENS,
    },
  });

  return {
    text: cleanAIResponse(response.text ?? ""),
    model,
  };
}
