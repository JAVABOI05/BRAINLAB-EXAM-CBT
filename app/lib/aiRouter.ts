import {
  getAIPlatformConfig,
  type AIModelDefinition,
  type AIPlatformConfig,
} from "./platformConfig";
import { recordAIGeneration } from "./aiUsageTracker";

export interface AIRequestContext {
  subject?: string;
  mode?: "explain" | "why_wrong" | "chat" | "coach" | "drill" | "author";
  questionText?: string;
  forceModelId?: string;
}

export interface ModelExecutionResult {
  text: string;
  modelId: string;
  modelIdentifier: string;
  provider: "gemini" | "groq";
  shuffled: boolean;
  latencyMs: number;
}

const STEM_SUBJECTS = new Set([
  "mathematics",
  "maths",
  "further mathematics",
  "further maths",
  "physics",
  "chemistry",
  "biology",
  "technical drawing",
  "quantitative reasoning",
]);

/**
 * Returns an ordered array of candidate models based on configured routing strategy,
 * model strengths, server API key availability, and failover priorities.
 */
export async function getOrderedCandidateModels(
  context?: AIRequestContext
): Promise<{ candidates: AIModelDefinition[]; strategy: string }> {
  const config = await getAIPlatformConfig();
  const strategy = config.routing_strategy || "auto_strength";

  const groqKey = process.env.GROQ_API_KEY || process.env.GROQAPIKEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY;

  // Filter pool to enabled models that have active server credentials
  const pool = (config.model_pool || []).filter((model) => {
    if (!model.enabled) return false;
    if (model.provider === "gemini" && !geminiKey) return false;
    if (model.provider === "groq" && !groqKey) return false;
    return true;
  });

  if (pool.length === 0) {
    // Ultimate emergency fallbacks from environment
    const emergency: AIModelDefinition[] = [];
    if (geminiKey) {
      emergency.push({
        id: "emergency-gemini",
        name: "Google Gemini (Emergency)",
        provider: "gemini",
        modelIdentifier: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
        strength: "reasoning_stem",
        priority: 1,
        enabled: true,
        maxTokens: 350,
        dailyQuotaLimit: 1500,
        addedAt: new Date().toISOString(),
      });
    }
    if (groqKey) {
      emergency.push({
        id: "emergency-groq",
        name: "Groq LPU (Emergency)",
        provider: "groq",
        modelIdentifier: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
        strength: "speed_drill",
        priority: 2,
        enabled: true,
        maxTokens: 350,
        dailyQuotaLimit: 1000,
        addedAt: new Date().toISOString(),
      });
    }
    return { candidates: emergency, strategy: "emergency_fallback" };
  }

  // 1. Admin Pinned Strategy
  if (strategy === "admin_pinned" && config.pinned_model_id) {
    const pinned = pool.find((m) => m.id === config.pinned_model_id);
    if (pinned) {
      const rest = pool.filter((m) => m.id !== pinned.id).sort((a, b) => a.priority - b.priority);
      return { candidates: [pinned, ...rest], strategy: "admin_pinned" };
    }
  }

  // 2. Load Balance Strategy (Shuffles models with headroom)
  if (strategy === "load_balance") {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return { candidates: shuffled, strategy: "load_balance" };
  }

  // 3. Priority Failover Strategy
  if (strategy === "priority_failover") {
    const sorted = [...pool].sort((a, b) => a.priority - b.priority);
    return { candidates: sorted, strategy: "priority_failover" };
  }

  // 4. Auto Strength & Subject Routing Strategy (Default)
  const normSubject = (context?.subject || "").toLowerCase().trim();
  const isSTEM = STEM_SUBJECTS.has(normSubject);
  const isFastMode = context?.mode === "why_wrong" || context?.mode === "drill" || context?.mode === "chat";

  const scored = [...pool].map((model) => {
    let score = 100 - model.priority * 10;

    if (isSTEM) {
      if (model.strength === "reasoning_stem") score += 60;
      if (model.provider === "gemini") score += 20; // Gemini excels in formulas and multi-step derivations
    } else if (isFastMode) {
      if (model.strength === "speed_drill") score += 60;
      if (model.provider === "groq") score += 30; // Groq excels at sub-200ms latency
    } else {
      if (model.strength === "general") score += 40;
    }

    return { model, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return { candidates: scored.map((s) => s.model), strategy: "auto_strength" };
}

/**
 * Direct call to Groq API
 */
async function callGroqAPI(
  model: AIModelDefinition,
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens?: number
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model.modelIdentifier,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: maxTokens || model.maxTokens || 350,
    }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from Groq.");
  return content;
}

/**
 * Direct call to Google Gemini API
 */
async function callGeminiAPI(
  model: AIModelDefinition,
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens?: number
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model.modelIdentifier
  )}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: maxTokens || model.maxTokens || 350,
      },
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();

  if (!content) throw new Error("Empty response from Gemini.");
  return content;
}

/**
 * Executes an AI completion using intelligent automatic shuffling and failover.
 * Tries the best-matched model first, and transparently shuffles to the next healthy model
 * if 429 quota exhaustion or errors occur.
 */
export async function executeSmartAICompletion(params: {
  userMessage: string;
  systemPrompt?: string;
  context?: AIRequestContext;
  userId?: string | null;
  maxTokens?: number;
}): Promise<ModelExecutionResult> {
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQAPIKEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY || "";

  const config = await getAIPlatformConfig();
  const systemPrompt =
    params.systemPrompt ||
    config.system_prompt_tone ||
    "You are BrainLab Academy's AI Tutor. Provide clear, direct, and concise explanations under 180 words without markdown hashes (#) or asterisks (*).";

  const { candidates, strategy } = await getOrderedCandidateModels(params.context);

  if (candidates.length === 0) {
    throw new Error("No AI models are available or configured with server keys.");
  }

  let lastError: Error | null = null;
  let attempts = 0;

  for (const model of candidates) {
    attempts += 1;
    const start = Date.now();
    try {
      let text = "";
      if (model.provider === "groq") {
        text = await callGroqAPI(model, systemPrompt, params.userMessage, groqKey, params.maxTokens);
      } else {
        text = await callGeminiAPI(model, systemPrompt, params.userMessage, geminiKey, params.maxTokens);
      }

      const latencyMs = Date.now() - start;
      const wasShuffled = attempts > 1;

      // Clean markdown hashes and asterisks from response
      const cleaned = text.replace(/\s\*\s/g, " × ").replace(/[#*`]/g, "");

      // Record generation telemetry with true model internally for Super Admins
      void recordAIGeneration({
        userId: params.userId,
        prompt: params.userMessage,
        response: cleaned,
        model: model.modelIdentifier,
        provider: model.provider,
        latencyMs,
        metadata: {
          model_id: model.id,
          routing_strategy: strategy,
          was_shuffled: wasShuffled,
          attempt_number: attempts,
          subject: params.context?.subject,
        },
      });

      return {
        text: cleaned,
        modelId: model.id,
        modelIdentifier: model.modelIdentifier,
        provider: model.provider,
        shuffled: wasShuffled,
        latencyMs,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[aiRouter] Model ${model.name} (${model.modelIdentifier}) failed (attempt ${attempts}): ${lastError.message}. Shuffling to next candidate...`
      );
    }
  }

  throw new Error(`All AI models in the pool were unreachable. Last error: ${lastError?.message || "unknown"}`);
}
