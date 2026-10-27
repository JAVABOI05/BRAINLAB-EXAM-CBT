import {
  getAIPlatformConfig,
  type AIModelDefinition,
  type AIPlatformConfig,
  type AIProvider,
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
  provider: AIProvider;
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
 * Resolves API key for a given provider from environment variables or stored platform config.
 */
export function resolveProviderApiKey(provider: AIProvider, config?: AIPlatformConfig | null): string {
  switch (provider) {
    case "openai":
      return (
        process.env.OPENAI_API_KEY ||
        process.env.OPENAIAPIKEY ||
        config?.provider_keys?.openai ||
        ""
      );
    case "anthropic":
      return (
        process.env.ANTHROPIC_API_KEY ||
        process.env.ANTHROPICAPIKEY ||
        process.env.CLAUDE_API_KEY ||
        config?.provider_keys?.anthropic ||
        ""
      );
    case "gemini":
      return (
        process.env.GEMINI_API_KEY ||
        process.env.GEMINIAPIKEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        config?.provider_keys?.gemini ||
        ""
      );
    case "groq":
      return (
        process.env.GROQ_API_KEY ||
        process.env.GROQAPIKEY ||
        config?.provider_keys?.groq ||
        ""
      );
    case "openrouter":
      return (
        process.env.OPENROUTER_API_KEY ||
        process.env.OPENROUTERAPIKEY ||
        config?.provider_keys?.openrouter ||
        ""
      );
    default:
      return "";
  }
}

/**
 * Returns an ordered array of candidate models based on configured routing strategy,
 * model strengths, server API key availability, and failover priorities.
 */
export async function getOrderedCandidateModels(
  context?: AIRequestContext
): Promise<{ candidates: AIModelDefinition[]; strategy: string }> {
  const config = await getAIPlatformConfig();
  const strategy = config.routing_strategy || "auto_strength";

  // Filter pool to enabled models that have active credentials available
  const pool = (config.model_pool || []).filter((model) => {
    if (!model.enabled) return false;
    const key = resolveProviderApiKey(model.provider, config);
    return Boolean(key);
  });

  if (pool.length === 0) {
    // Emergency fallbacks from environment
    const emergency: AIModelDefinition[] = [];
    const geminiKey = resolveProviderApiKey("gemini", config);
    const groqKey = resolveProviderApiKey("groq", config);
    const openaiKey = resolveProviderApiKey("openai", config);
    const anthropicKey = resolveProviderApiKey("anthropic", config);

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
    if (openaiKey) {
      emergency.push({
        id: "emergency-openai",
        name: "OpenAI GPT-4o Mini (Emergency)",
        provider: "openai",
        modelIdentifier: "gpt-4o-mini",
        strength: "general",
        priority: 3,
        enabled: true,
        maxTokens: 350,
        dailyQuotaLimit: 5000,
        addedAt: new Date().toISOString(),
      });
    }
    if (anthropicKey) {
      emergency.push({
        id: "emergency-anthropic",
        name: "Anthropic Claude 3.5 Sonnet (Emergency)",
        provider: "anthropic",
        modelIdentifier: "claude-3-5-sonnet-20241022",
        strength: "reasoning_stem",
        priority: 4,
        enabled: true,
        maxTokens: 350,
        dailyQuotaLimit: 5000,
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
      if (model.modelIdentifier.includes("opus") || model.modelIdentifier.includes("o1") || model.modelIdentifier.includes("gemini")) {
        score += 25; // Claude Opus, OpenAI o1, Gemini excel in deep proofs and formulas
      }
    } else if (isFastMode) {
      if (model.strength === "speed_drill") score += 60;
      if (model.provider === "groq" || model.modelIdentifier.includes("mini") || model.modelIdentifier.includes("haiku")) {
        score += 30; // Groq, Haiku, GPT-4o-mini excel in sub-300ms speed
      }
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
 * Direct call to OpenAI API (Supports GPT-4o, GPT-4o-mini, o1, o3-mini)
 */
async function callOpenAIAPI(
  model: AIModelDefinition,
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens?: number
): Promise<string> {
  const isReasoning =
    model.modelIdentifier.startsWith("o1") ||
    model.modelIdentifier.startsWith("o3") ||
    model.modelIdentifier.includes("reasoning");

  const body: Record<string, unknown> = {
    model: model.modelIdentifier,
    messages: [
      { role: isReasoning ? "user" : "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  };

  if (isReasoning) {
    body.max_completion_tokens = maxTokens || model.maxTokens || 800;
  } else {
    body.temperature = 0.3;
    body.max_tokens = maxTokens || model.maxTokens || 350;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI.");
  return content;
}

/**
 * Direct call to Anthropic Claude API (Supports Claude 3 Opus, 3.5 Sonnet, 3.7 Sonnet, Haiku)
 */
async function callAnthropicAPI(
  model: AIModelDefinition,
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens?: number
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model.modelIdentifier,
      max_tokens: maxTokens || model.maxTokens || 450,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic Claude HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text?.trim();
  if (!content) throw new Error("Empty response from Anthropic Claude.");
  return content;
}

/**
 * Direct call to OpenRouter API (Access to 200+ models under single key)
 */
async function callOpenRouterAPI(
  model: AIModelDefinition,
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  maxTokens?: number
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://brainlabacademy.com.ng",
      "X-Title": "BrainLab Academy AI Tutor",
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
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenRouter.");
  return content;
}

/**
 * Executes an AI completion using intelligent automatic shuffling and failover.
 * Supports Google Gemini, Groq, OpenAI, Anthropic Claude, and OpenRouter seamlessly.
 */
export async function executeSmartAICompletion(params: {
  userMessage: string;
  systemPrompt?: string;
  context?: AIRequestContext;
  userId?: string | null;
  maxTokens?: number;
}): Promise<ModelExecutionResult> {
  const config = await getAIPlatformConfig();
  const systemPrompt =
    params.systemPrompt ||
    config.system_prompt_tone ||
    "You are BrainLab Academy's AI Tutor. Provide clear, direct, and concise explanations under 180 words without markdown hashes (#) or asterisks (*).";

  const { candidates, strategy } = await getOrderedCandidateModels(params.context);

  if (candidates.length === 0) {
    throw new Error(
      "No active AI providers or models are configured with valid API keys. Configure credentials in the Admin Portal."
    );
  }

  let lastError: Error | null = null;
  let attempts = 0;

  for (const model of candidates) {
    attempts += 1;
    const apiKey = resolveProviderApiKey(model.provider, config);
    if (!apiKey) continue;

    const start = Date.now();
    try {
      let text = "";
      switch (model.provider) {
        case "groq":
          text = await callGroqAPI(model, systemPrompt, params.userMessage, apiKey, params.maxTokens);
          break;
        case "gemini":
          text = await callGeminiAPI(model, systemPrompt, params.userMessage, apiKey, params.maxTokens);
          break;
        case "openai":
          text = await callOpenAIAPI(model, systemPrompt, params.userMessage, apiKey, params.maxTokens);
          break;
        case "anthropic":
          text = await callAnthropicAPI(model, systemPrompt, params.userMessage, apiKey, params.maxTokens);
          break;
        case "openrouter":
          text = await callOpenRouterAPI(model, systemPrompt, params.userMessage, apiKey, params.maxTokens);
          break;
        default:
          throw new Error(`Unsupported provider: ${model.provider}`);
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

  throw new Error(
    `All available AI models in the pool were unreachable. Last error: ${lastError?.message || "unknown"}`
  );
}
