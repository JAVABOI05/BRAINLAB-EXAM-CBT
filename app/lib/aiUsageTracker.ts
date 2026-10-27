import { getSupabaseServerClient } from "./supabaseServer";
import {
  getAIPlatformConfig,
  DEFAULT_MODEL_POOL,
  type AIModelDefinition,
  type AIRoutingStrategy,
  type AIModelStrength,
  type AIProvider,
} from "./platformConfig";
import { resolveProviderApiKey } from "./aiRouter";

export interface LogAIGenerationParams {
  userId?: string | null;
  prompt: string;
  response: string;
  model: string;
  provider: AIProvider;
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelUsageSummary {
  modelId: string;
  modelName: string;
  provider: AIProvider;
  strength?: AIModelStrength;
  priority?: number;
  enabled?: boolean;
  status: "operational" | "warning" | "error" | "unconfigured";
  statusMessage?: string;
  latencyMs: number | null;
  requestsToday: number;
  requestsLast7Days: number;
  requestsLast30Days: number;
  estimatedTokensToday: number;
  quotaLimitRequests: number | null;
  quotaRemainingRequests: number | null;
  quotaLimitTokens: number | null;
  quotaRemainingTokens: number | null;
  quotaRequestsPercentUsed: number;
  quotaTokensPercentUsed: number;
  resetTimeDailyUtc: string;
  resetTimeDailyCountdownSeconds: number;
  resetTimeDailyFormatted: string;
  resetTimeMinuteCountdownSeconds: number;
  providerReportedResetRequests: string | null;
  providerReportedResetTokens: string | null;
  rawHeaders: Record<string, string>;
  notes: string;
}

export interface ProviderKeyInfo {
  configured: boolean;
  keySource: "env" | "portal" | "none";
  maskedKey: string;
}

export interface AIMonitoringPayload {
  timestamp: string;
  activeProvider: AIProvider;
  configuredGeminiModel: string;
  configuredGroqModel: string;
  routingStrategy: AIRoutingStrategy;
  pinnedModelId?: string;
  modelPool: AIModelDefinition[];
  providerKeys: Record<AIProvider, ProviderKeyInfo>;
  summary: {
    totalRequestsToday: number;
    totalTokensToday: number;
    cacheHitsToday: number;
    cacheSavingsPercent: number;
    activeStudentsToday: number;
  };
  models: ModelUsageSummary[];
  learnerQuotas: {
    dailyFreeQuota: number;
    monthlyPremiumQuota: number;
    maxOutputTokens: number;
    studentsAtLimitCount: number;
  };
  recentGenerations: Array<{
    id: string;
    model: string;
    provider: string;
    promptSnippet: string;
    responseSnippet: string;
    createdAt: string;
    tokens: number;
    userId: string | null;
    isCache: boolean;
  }>;
  availableGroqModels: string[];
}

/**
 * Parses time strings like "1m26.4s", "105ms", "2h15m", "15s" into seconds.
 */
export function parseDurationToSeconds(durationStr: string | null | undefined): number | null {
  if (!durationStr || typeof durationStr !== "string") return null;
  let totalMs = 0;
  const hMatch = durationStr.match(/(\d+)h/);
  const mMatch = durationStr.match(/([\d.]+)m(?!s)/);
  const sMatch = durationStr.match(/([\d.]+)s/);
  const msMatch = durationStr.match(/([\d.]+)ms/);

  if (hMatch) totalMs += parseInt(hMatch[1], 10) * 3_600_000;
  if (mMatch) totalMs += parseFloat(mMatch[1]) * 60_000;
  if (sMatch) totalMs += parseFloat(sMatch[1]) * 1_000;
  if (msMatch) totalMs += parseFloat(msMatch[1]);

  return totalMs > 0 ? Math.round(totalMs / 1000) : 0;
}

/**
 * Calculates countdown details to next Midnight UTC (00:00:00 UTC).
 */
export function calculateUtcMidnightReset(): {
  iso: string;
  secondsRemaining: number;
  formatted: string;
} {
  const now = new Date();
  const nextReset = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
  const secondsRemaining = Math.max(0, Math.floor((nextReset.getTime() - now.getTime()) / 1000));

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const formatted = `${hours}h ${minutes}m ${seconds}s`;
  return {
    iso: nextReset.toISOString(),
    secondsRemaining,
    formatted,
  };
}

/**
 * Logs an AI Generation execution to public.ai_generations asynchronously
 * without delaying client responses.
 */
export async function recordAIGeneration(params: LogAIGenerationParams): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const estPromptTokens = params.promptTokens ?? Math.ceil(params.prompt.length / 4);
    const estCompletionTokens = params.completionTokens ?? Math.ceil(params.response.length / 4);
    const totalTokens = params.totalTokens ?? (estPromptTokens + estCompletionTokens);

    await supabase.from("ai_generations").insert({
      user_id: params.userId || null,
      prompt: params.prompt.slice(0, 4000),
      response: params.response.slice(0, 8000),
      model: params.model,
      metadata: {
        provider: params.provider,
        latency_ms: params.latencyMs ?? null,
        prompt_tokens: estPromptTokens,
        completion_tokens: estCompletionTokens,
        total_tokens: totalTokens,
        logged_at: new Date().toISOString(),
        ...(params.metadata || {}),
      },
    });
  } catch (err) {
    // Non-blocking catch
    console.warn("[aiUsageTracker] Failed to record AI generation log:", err);
  }
}

/**
 * Performs a live gateway probe for Groq models to extract active rate-limit headers.
 */
async function probeGroq(modelIdentifier: string, groqKey: string): Promise<{
  status: "operational" | "warning" | "error";
  statusMessage?: string;
  latencyMs: number | null;
  headers: Record<string, string>;
  limitRequests: number | null;
  remainingRequests: number | null;
  resetRequests: string | null;
  limitTokens: number | null;
  remainingTokens: number | null;
  resetTokens: string | null;
}> {
  const start = Date.now();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelIdentifier,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const latencyMs = Date.now() - start;
    const headers: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower.includes("ratelimit") || lower.includes("retry")) {
        headers[lower] = val;
      }
    });

    if (res.status === 429) {
      return {
        status: "warning",
        statusMessage: "Throttled: 429 Rate Limit reached.",
        latencyMs,
        headers,
        limitRequests: headers["x-ratelimit-limit-requests"] ? Number(headers["x-ratelimit-limit-requests"]) : null,
        remainingRequests: 0,
        resetRequests: headers["x-ratelimit-reset-requests"] || headers["retry-after"] || null,
        limitTokens: headers["x-ratelimit-limit-tokens"] ? Number(headers["x-ratelimit-limit-tokens"]) : null,
        remainingTokens: 0,
        resetTokens: headers["x-ratelimit-reset-tokens"] || null,
      };
    }

    if (!res.ok) {
      const errText = await res.text();
      return {
        status: "error",
        statusMessage: `Groq probe failed HTTP ${res.status}: ${errText.slice(0, 140)}`,
        latencyMs,
        headers,
        limitRequests: null,
        remainingRequests: null,
        resetRequests: null,
        limitTokens: null,
        remainingTokens: null,
        resetTokens: null,
      };
    }

    return {
      status: "operational",
      statusMessage: "Operational · 200 OK",
      latencyMs,
      headers,
      limitRequests: headers["x-ratelimit-limit-requests"] ? Number(headers["x-ratelimit-limit-requests"]) : 1000,
      remainingRequests: headers["x-ratelimit-remaining-requests"] ? Number(headers["x-ratelimit-remaining-requests"]) : null,
      resetRequests: headers["x-ratelimit-reset-requests"] || null,
      limitTokens: headers["x-ratelimit-limit-tokens"] ? Number(headers["x-ratelimit-limit-tokens"]) : 8000,
      remainingTokens: headers["x-ratelimit-remaining-tokens"] ? Number(headers["x-ratelimit-remaining-tokens"]) : null,
      resetTokens: headers["x-ratelimit-reset-tokens"] || null,
    };
  } catch (err) {
    return {
      status: "error",
      statusMessage: err instanceof Error ? err.message : "Connection timeout or probe failure.",
      latencyMs: Date.now() - start,
      headers: {},
      limitRequests: null,
      remainingRequests: null,
      resetRequests: null,
      limitTokens: null,
      remainingTokens: null,
      resetTokens: null,
    };
  }
}

/**
 * Performs a live gateway probe for Google Gemini model to test status and latency.
 */
async function probeGemini(modelIdentifier: string, geminiKey: string): Promise<{
  status: "operational" | "warning" | "error";
  statusMessage?: string;
  latencyMs: number | null;
  headers: Record<string, string>;
}> {
  const start = Date.now();
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelIdentifier)}:generateContent?key=${geminiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const latencyMs = Date.now() - start;
    const headers: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower.includes("ratelimit") || lower.includes("quota") || lower.includes("retry")) {
        headers[lower] = val;
      }
    });

    if (res.status === 429) {
      return {
        status: "warning",
        statusMessage: "Throttled: 429 Daily or Minute Quota exceeded.",
        latencyMs,
        headers,
      };
    }

    if (!res.ok) {
      const errText = await res.text();
      return {
        status: "error",
        statusMessage: `Gemini probe failed HTTP ${res.status}: ${errText.slice(0, 140)}`,
        latencyMs,
        headers,
      };
    }

    return {
      status: "operational",
      statusMessage: "Operational · 200 OK",
      latencyMs,
      headers,
    };
  } catch (err) {
    return {
      status: "error",
      statusMessage: err instanceof Error ? err.message : "Connection failure or timeout.",
      latencyMs: Date.now() - start,
      headers: {},
    };
  }
}

/**
 * Performs a live gateway probe for OpenAI models (GPT-4o, o1, o3, etc.)
 */
async function probeOpenAI(modelIdentifier: string, openaiKey: string): Promise<{
  status: "operational" | "warning" | "error";
  statusMessage?: string;
  latencyMs: number | null;
  headers: Record<string, string>;
  limitRequests: number | null;
  remainingRequests: number | null;
  resetRequests: string | null;
  limitTokens: number | null;
  remainingTokens: number | null;
  resetTokens: string | null;
}> {
  const start = Date.now();
  try {
    const isReasoning = modelIdentifier.startsWith("o1") || modelIdentifier.startsWith("o3");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelIdentifier,
        messages: [{ role: "user", content: "ping" }],
        ...(isReasoning ? { max_completion_tokens: 10 } : { max_tokens: 1 }),
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const latencyMs = Date.now() - start;
    const headers: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower.includes("ratelimit") || lower.includes("retry")) headers[lower] = val;
    });

    if (res.status === 429) {
      return {
        status: "warning",
        statusMessage: "Throttled: OpenAI 429 Quota Exceeded.",
        latencyMs,
        headers,
        limitRequests: headers["x-ratelimit-limit-requests"] ? Number(headers["x-ratelimit-limit-requests"]) : null,
        remainingRequests: 0,
        resetRequests: headers["x-ratelimit-reset-requests"] || headers["retry-after"] || null,
        limitTokens: headers["x-ratelimit-limit-tokens"] ? Number(headers["x-ratelimit-limit-tokens"]) : null,
        remainingTokens: 0,
        resetTokens: headers["x-ratelimit-reset-tokens"] || null,
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        status: "error",
        statusMessage: `OpenAI error HTTP ${res.status}: ${errText.slice(0, 140)}`,
        latencyMs,
        headers,
        limitRequests: null,
        remainingRequests: null,
        resetRequests: null,
        limitTokens: null,
        remainingTokens: null,
        resetTokens: null,
      };
    }

    return {
      status: "operational",
      statusMessage: "Operational · 200 OK",
      latencyMs,
      headers,
      limitRequests: headers["x-ratelimit-limit-requests"] ? Number(headers["x-ratelimit-limit-requests"]) : 10000,
      remainingRequests: headers["x-ratelimit-remaining-requests"] ? Number(headers["x-ratelimit-remaining-requests"]) : null,
      resetRequests: headers["x-ratelimit-reset-requests"] || null,
      limitTokens: headers["x-ratelimit-limit-tokens"] ? Number(headers["x-ratelimit-limit-tokens"]) : 200000,
      remainingTokens: headers["x-ratelimit-remaining-tokens"] ? Number(headers["x-ratelimit-remaining-tokens"]) : null,
      resetTokens: headers["x-ratelimit-reset-tokens"] || null,
    };
  } catch (err) {
    return {
      status: "error",
      statusMessage: err instanceof Error ? err.message : "Connection failure or timeout.",
      latencyMs: Date.now() - start,
      headers: {},
      limitRequests: null,
      remainingRequests: null,
      resetRequests: null,
      limitTokens: null,
      remainingTokens: null,
      resetTokens: null,
    };
  }
}

/**
 * Performs a live gateway probe for Anthropic Claude models (Opus, Sonnet, Haiku)
 */
async function probeAnthropic(modelIdentifier: string, apiKey: string): Promise<{
  status: "operational" | "warning" | "error";
  statusMessage?: string;
  latencyMs: number | null;
  headers: Record<string, string>;
  limitRequests: number | null;
  remainingRequests: number | null;
  resetRequests: string | null;
  limitTokens: number | null;
  remainingTokens: number | null;
  resetTokens: string | null;
}> {
  const start = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelIdentifier,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    const latencyMs = Date.now() - start;
    const headers: Record<string, string> = {};
    res.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower.includes("ratelimit") || lower.includes("retry") || lower.includes("anthropic")) {
        headers[lower] = val;
      }
    });

    if (res.status === 429) {
      return {
        status: "warning",
        statusMessage: "Throttled: Anthropic 429 Rate Limit exceeded.",
        latencyMs,
        headers,
        limitRequests: headers["anthropic-ratelimit-requests-limit"] ? Number(headers["anthropic-ratelimit-requests-limit"]) : null,
        remainingRequests: 0,
        resetRequests: headers["anthropic-ratelimit-requests-reset"] || headers["retry-after"] || null,
        limitTokens: headers["anthropic-ratelimit-tokens-limit"] ? Number(headers["anthropic-ratelimit-tokens-limit"]) : null,
        remainingTokens: 0,
        resetTokens: headers["anthropic-ratelimit-tokens-reset"] || null,
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        status: "error",
        statusMessage: `Anthropic error HTTP ${res.status}: ${errText.slice(0, 140)}`,
        latencyMs,
        headers,
        limitRequests: null,
        remainingRequests: null,
        resetRequests: null,
        limitTokens: null,
        remainingTokens: null,
        resetTokens: null,
      };
    }

    return {
      status: "operational",
      statusMessage: "Operational · 200 OK",
      latencyMs,
      headers,
      limitRequests: headers["anthropic-ratelimit-requests-limit"] ? Number(headers["anthropic-ratelimit-requests-limit"]) : 5000,
      remainingRequests: headers["anthropic-ratelimit-requests-remaining"] ? Number(headers["anthropic-ratelimit-requests-remaining"]) : null,
      resetRequests: headers["anthropic-ratelimit-requests-reset"] || null,
      limitTokens: headers["anthropic-ratelimit-tokens-limit"] ? Number(headers["anthropic-ratelimit-tokens-limit"]) : 100000,
      remainingTokens: headers["anthropic-ratelimit-tokens-remaining"] ? Number(headers["anthropic-ratelimit-tokens-remaining"]) : null,
      resetTokens: headers["anthropic-ratelimit-tokens-reset"] || null,
    };
  } catch (err) {
    return {
      status: "error",
      statusMessage: err instanceof Error ? err.message : "Connection timeout.",
      latencyMs: Date.now() - start,
      headers: {},
      limitRequests: null,
      remainingRequests: null,
      resetRequests: null,
      limitTokens: null,
      remainingTokens: null,
      resetTokens: null,
    };
  }
}

/**
 * Fetches available models from Groq account.
 */
async function fetchGroqModels(groqKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${groqKey}` },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data?.data)) {
      return data.data.map((m: { id: string }) => m.id);
    }
    return [];
  } catch {
    return [];
  }
}

function maskKey(key?: string): string {
  if (!key || key.length < 8) return "";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

/**
 * Aggregates complete AI usage, quotas, reset times, model pool telemetry, and live gateway telemetry.
 */
export async function getAIMonitoringData(options?: { probeLive?: boolean }): Promise<AIMonitoringPayload> {
  const probeLive = options?.probeLive ?? true;
  const config = await getAIPlatformConfig();
  const utcReset = calculateUtcMidnightReset();
  const minuteReset = 60 - new Date().getUTCSeconds();

  const geminiKey = resolveProviderApiKey("gemini", config);
  const groqKey = resolveProviderApiKey("groq", config);
  const openaiKey = resolveProviderApiKey("openai", config);
  const anthropicKey = resolveProviderApiKey("anthropic", config);
  const openrouterKey = resolveProviderApiKey("openrouter", config);

  const providerKeys: Record<AIProvider, ProviderKeyInfo> = {
    gemini: {
      configured: Boolean(geminiKey),
      keySource: process.env.GEMINI_API_KEY ? "env" : config.provider_keys?.gemini ? "portal" : "none",
      maskedKey: maskKey(geminiKey),
    },
    groq: {
      configured: Boolean(groqKey),
      keySource: process.env.GROQ_API_KEY ? "env" : config.provider_keys?.groq ? "portal" : "none",
      maskedKey: maskKey(groqKey),
    },
    openai: {
      configured: Boolean(openaiKey),
      keySource: process.env.OPENAI_API_KEY ? "env" : config.provider_keys?.openai ? "portal" : "none",
      maskedKey: maskKey(openaiKey),
    },
    anthropic: {
      configured: Boolean(anthropicKey),
      keySource: process.env.ANTHROPIC_API_KEY ? "env" : config.provider_keys?.anthropic ? "portal" : "none",
      maskedKey: maskKey(anthropicKey),
    },
    openrouter: {
      configured: Boolean(openrouterKey),
      keySource: process.env.OPENROUTER_API_KEY ? "env" : config.provider_keys?.openrouter ? "portal" : "none",
      maskedKey: maskKey(openrouterKey),
    },
  };

  const activeProvider = config.provider || "gemini";
  const configuredGeminiModel = config.gemini_model || process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  const configuredGroqModel = config.groq_model || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
  const modelPool = config.model_pool || DEFAULT_MODEL_POOL;

  // Database Queries
  const supabase = getSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch recent rows for metrics calculation
  const { data: recentRows } = await supabase
    .from("ai_generations")
    .select("id, model, prompt, response, metadata, user_id, created_at")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);

  const rows = recentRows || [];

  // Metrics aggregation per model
  const modelStatsMap: Record<
    string,
    {
      todayCount: number;
      sevenDayCount: number;
      thirtyDayCount: number;
      todayTokens: number;
      activeUsers: Set<string>;
    }
  > = {};

  let totalRequestsToday = 0;
  let totalTokensToday = 0;
  let cacheHitsToday = 0;
  const activeStudentsTodaySet = new Set<string>();

  for (const row of rows) {
    const createdTime = new Date(row.created_at).getTime();
    const isToday = createdTime >= todayStart.getTime();
    const is7Days = createdTime >= sevenDaysAgo.getTime();
    const modelKey = row.model || "unknown";

    if (!modelStatsMap[modelKey]) {
      modelStatsMap[modelKey] = {
        todayCount: 0,
        sevenDayCount: 0,
        thirtyDayCount: 0,
        todayTokens: 0,
        activeUsers: new Set(),
      };
    }

    const meta = (row.metadata as Record<string, unknown>) || {};
    const tokens = Number(meta.total_tokens) || Math.ceil(((row.prompt?.length || 0) + (row.response?.length || 0)) / 4);

    if (row.user_id) {
      if (isToday) activeStudentsTodaySet.add(row.user_id);
      modelStatsMap[modelKey].activeUsers.add(row.user_id);
    }

    if (meta.cache_type === "standard_question_explanation" && isToday) {
      cacheHitsToday += 1;
    }

    modelStatsMap[modelKey].thirtyDayCount += 1;
    if (is7Days) modelStatsMap[modelKey].sevenDayCount += 1;
    if (isToday) {
      totalRequestsToday += 1;
      totalTokensToday += tokens;
      modelStatsMap[modelKey].todayCount += 1;
      modelStatsMap[modelKey].todayTokens += tokens;
    }
  }

  // Live Gateway Probes
  const probeCache: Record<string, { available?: boolean; latencyMs?: number; error?: string; models?: string[]; [key: string]: unknown }> = {};
  let availableGroqModels: string[] = [];

  if (probeLive) {
    const [groqList] = await Promise.all([
      groqKey ? fetchGroqModels(groqKey) : Promise.resolve([]),
      // Probe models in pool in parallel
      ...modelPool.map(async (m) => {
        const key = resolveProviderApiKey(m.provider, config);
        if (!key) return;

        if (m.provider === "groq") {
          probeCache[m.modelIdentifier] = await probeGroq(m.modelIdentifier, key);
        } else if (m.provider === "gemini") {
          probeCache[m.modelIdentifier] = await probeGemini(m.modelIdentifier, key);
        } else if (m.provider === "openai") {
          probeCache[m.modelIdentifier] = await probeOpenAI(m.modelIdentifier, key);
        } else if (m.provider === "anthropic") {
          probeCache[m.modelIdentifier] = await probeAnthropic(m.modelIdentifier, key);
        }
      }),
    ]);
    availableGroqModels = groqList;
  }

  // Build telemetry summary for each model defined in pool
  const models: ModelUsageSummary[] = modelPool.map((def) => {
    const stats = modelStatsMap[def.modelIdentifier] || {
      todayCount: 0,
      sevenDayCount: 0,
      thirtyDayCount: 0,
      todayTokens: 0,
      activeUsers: new Set(),
    };

    const hasKey = Boolean(resolveProviderApiKey(def.provider, config));
    const probe = probeCache[def.modelIdentifier];

    let limitRequests = def.dailyQuotaLimit || (def.provider === "gemini" ? 1500 : def.provider === "groq" ? 1000 : 10000);
    let remainingRequests = Math.max(0, limitRequests - stats.todayCount);
    let limitTokens = def.provider === "gemini" ? 1_000_000 : def.provider === "groq" ? 8000 : 200000;
    let remainingTokens = Math.max(0, limitTokens - stats.todayTokens);

    if (probe?.limitRequests) limitRequests = probe.limitRequests;
    if (probe?.remainingRequests !== null && probe?.remainingRequests !== undefined) {
      remainingRequests = probe.remainingRequests;
    }
    if (probe?.limitTokens) limitTokens = probe.limitTokens;
    if (probe?.remainingTokens !== null && probe?.remainingTokens !== undefined) {
      remainingTokens = probe.remainingTokens;
    }

    const requestsUsedPercent = Math.min(
      100,
      Math.round(((limitRequests - remainingRequests) / Math.max(1, limitRequests)) * 100)
    );
    const tokensUsedPercent = Math.min(
      100,
      Math.round(((limitTokens - remainingTokens) / Math.max(1, limitTokens)) * 100)
    );

    return {
      modelId: def.id,
      modelName: def.name,
      provider: def.provider,
      strength: def.strength,
      priority: def.priority,
      enabled: def.enabled,
      status: !hasKey
        ? "unconfigured"
        : probe
        ? probe.status
        : def.enabled
        ? "operational"
        : "warning",
      statusMessage: !hasKey
        ? `${def.provider.toUpperCase()} API key missing. Add key in Portal or Environment.`
        : probe?.statusMessage || (def.enabled ? "Active in Pool" : "Disabled by Admin"),
      latencyMs: probe?.latencyMs ?? null,
      requestsToday: stats.todayCount,
      requestsLast7Days: stats.sevenDayCount,
      requestsLast30Days: stats.thirtyDayCount,
      estimatedTokensToday: stats.todayTokens,
      quotaLimitRequests: limitRequests,
      quotaRemainingRequests: remainingRequests,
      quotaLimitTokens: limitTokens,
      quotaRemainingTokens: remainingTokens,
      quotaRequestsPercentUsed: requestsUsedPercent,
      quotaTokensPercentUsed: tokensUsedPercent,
      resetTimeDailyUtc: utcReset.iso,
      resetTimeDailyCountdownSeconds:
        probe?.resetRequests
          ? parseDurationToSeconds(probe.resetRequests) ?? utcReset.secondsRemaining
          : utcReset.secondsRemaining,
      resetTimeDailyFormatted: probe?.resetRequests || utcReset.formatted,
      resetTimeMinuteCountdownSeconds: minuteReset,
      providerReportedResetRequests: probe?.resetRequests || null,
      providerReportedResetTokens: probe?.resetTokens || null,
      rawHeaders: probe?.headers || {},
      notes: def.notes || "",
    };
  });

  // Format recent 25 generations
  const recentGenerations = rows.slice(0, 25).map((row) => {
    const meta = (row.metadata as Record<string, unknown>) || {};
    const tokens = Number(meta.total_tokens) || Math.ceil(((row.prompt?.length || 0) + (row.response?.length || 0)) / 4);
    const isCache = meta.cache_type === "standard_question_explanation";
    const provider = String(meta.provider || (row.model?.includes("gemini") ? "gemini" : "groq"));

    return {
      id: String(row.id),
      model: String(row.model),
      provider,
      promptSnippet: String(row.prompt || "").slice(0, 140),
      responseSnippet: String(row.response || "").slice(0, 160),
      createdAt: String(row.created_at),
      tokens,
      userId: row.user_id ? String(row.user_id) : null,
      isCache,
    };
  });

  const cacheSavingsPercent =
    totalRequestsToday > 0 ? Math.round((cacheHitsToday / (totalRequestsToday + cacheHitsToday)) * 100) : 0;

  return {
    timestamp: new Date().toISOString(),
    activeProvider,
    configuredGeminiModel,
    configuredGroqModel,
    routingStrategy: config.routing_strategy || "auto_strength",
    pinnedModelId: config.pinned_model_id,
    modelPool,
    providerKeys,
    summary: {
      totalRequestsToday,
      totalTokensToday,
      cacheHitsToday,
      cacheSavingsPercent,
      activeStudentsToday: activeStudentsTodaySet.size,
    },
    models,
    learnerQuotas: {
      dailyFreeQuota: config.daily_free_quota || 10,
      monthlyPremiumQuota: config.monthly_premium_quota || 500,
      maxOutputTokens: config.max_output_tokens || 350,
      studentsAtLimitCount: 0,
    },
    recentGenerations,
    availableGroqModels,
  };
}
