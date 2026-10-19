import { GoogleGenAI } from "@google/genai";

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

export async function generateGeminiContent(
  prompt: string,
  options?: { model?: string }
): Promise<{ text: string; model: string }> {
  const model = options?.model || process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return {
    text: response.text ?? "",
    model,
  };
}
