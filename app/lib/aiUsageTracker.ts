import { getSupabaseServerClient } from "./supabaseServer";
import { getAIPlatformConfig } from "./platformConfig";

export interface LogAIGenerationParams {
  userId?: string | null;
  prompt: string;
  response: string;
  model: string;
  provider: "gemini" | "groq";
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelUsageSummary {
  modelId: string;
  modelName: string;
  provider: "gemini" | "groq";
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

export interface AIMonitoringPayload {
  timestamp: string;
  activeProvider: "gemini" | "groq";
  configuredGeminiModel: string;
  configuredGroqModel: string;
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
async function probeGroq(model: string, groqKey: string): Promise<{
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
        model,
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
async function probeGemini(model: string, geminiKey: string): Promise<{
  status: "operational" | "warning" | "error";
  statusMessage?: string;
  latencyMs: number | null;
  headers: Record<string, string>;
}> {
  const start = Date.now();
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${geminiKey}`;
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

/**
 * Aggregates complete AI usage, quotas, reset times, and live gateway telemetry.
 */
export async function getAIMonitoringData(options?: { probeLive?: boolean }): Promise<AIMonitoringPayload> {
  const probeLive = options?.probeLive ?? true;
  const config = await getAIPlatformConfig();
  const utcReset = calculateUtcMidnightReset();
  const minuteReset = 60 - new Date().getUTCSeconds();

  const groqKey = process.env.GROQ_API_KEY || process.env.GROQAPIKEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY || "";

  const activeProvider = config.provider;
  const configuredGeminiModel = config.gemini_model || process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  const configuredGroqModel = config.groq_model || process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

  // Database Queries
  const supabase = getSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all recent rows (up to 1,500) for metrics calculation
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

  // Live Gateway Probing (runs in parallel)
  let groqProbe: Awaited<ReturnType<typeof probeGroq>> | null = null;
  let geminiProbe: Awaited<ReturnType<typeof probeGemini>> | null = null;
  let availableGroqModels: string[] = [];

  if (probeLive) {
    const [groqRes, geminiRes, groqList] = await Promise.all([
      groqKey ? probeGroq(configuredGroqModel, groqKey) : null,
      geminiKey ? probeGemini(configuredGeminiModel, geminiKey) : null,
      groqKey ? fetchGroqModels(groqKey) : Promise.resolve([]),
    ]);
    groqProbe = groqRes;
    geminiProbe = geminiRes;
    availableGroqModels = groqList;
  }

  // Model 1: Primary Gemini Model
  const geminiTodayRequests = modelStatsMap[configuredGeminiModel]?.todayCount || 0;
  const geminiLimitRequests = 1500; // Google AI Studio Free Tier RPD
  const geminiRemainingRequests = Math.max(0, geminiLimitRequests - geminiTodayRequests);
  const geminiPercentUsed = Math.min(100, Math.round((geminiTodayRequests / geminiLimitRequests) * 100));

  const geminiSummary: ModelUsageSummary = {
    modelId: configuredGeminiModel,
    modelName: `Google Gemini (${configuredGeminiModel})`,
    provider: "gemini",
    status: !geminiKey
      ? "unconfigured"
      : geminiProbe
      ? geminiProbe.status
      : "operational",
    statusMessage: !geminiKey ? "GEMINI_API_KEY is not configured" : geminiProbe?.statusMessage,
    latencyMs: geminiProbe?.latencyMs ?? null,
    requestsToday: geminiTodayRequests,
    requestsLast7Days: modelStatsMap[configuredGeminiModel]?.sevenDayCount || 0,
    requestsLast30Days: modelStatsMap[configuredGeminiModel]?.thirtyDayCount || 0,
    estimatedTokensToday: modelStatsMap[configuredGeminiModel]?.todayTokens || 0,
    quotaLimitRequests: geminiLimitRequests,
    quotaRemainingRequests: geminiRemainingRequests,
    quotaLimitTokens: 1_000_000, // 1M TPM
    quotaRemainingTokens: Math.max(0, 1_000_000 - (modelStatsMap[configuredGeminiModel]?.todayTokens || 0)),
    quotaRequestsPercentUsed: geminiPercentUsed,
    quotaTokensPercentUsed: Math.min(100, Math.round(((modelStatsMap[configuredGeminiModel]?.todayTokens || 0) / 1_000_000) * 100)),
    resetTimeDailyUtc: utcReset.iso,
    resetTimeDailyCountdownSeconds: utcReset.secondsRemaining,
    resetTimeDailyFormatted: utcReset.formatted,
    resetTimeMinuteCountdownSeconds: minuteReset,
    providerReportedResetRequests: null,
    providerReportedResetTokens: null,
    rawHeaders: geminiProbe?.headers || {},
    notes: "Google AI Studio enforces 1,500 RPD (Requests Per Day) and 15 RPM. Daily quotas reset at 00:00:00 UTC.",
  };

  // Model 2: Primary Groq Model
  const groqTodayRequests = modelStatsMap[configuredGroqModel]?.todayCount || 0;
  const groqLimitRequests = groqProbe?.limitRequests ?? 1000;
  const groqRemainingRequests = groqProbe?.remainingRequests ?? Math.max(0, groqLimitRequests - groqTodayRequests);
  const groqLimitTokens = groqProbe?.limitTokens ?? 8000;
  const groqRemainingTokens = groqProbe?.remainingTokens ?? 8000;
  const groqPercentUsed = Math.min(
    100,
    groqProbe?.remainingRequests !== null && groqProbe?.remainingRequests !== undefined
      ? Math.round(((groqLimitRequests - groqRemainingRequests) / groqLimitRequests) * 100)
      : Math.round((groqTodayRequests / groqLimitRequests) * 100)
  );
  const groqTokensPercentUsed = Math.min(
    100,
    Math.round(((groqLimitTokens - groqRemainingTokens) / groqLimitTokens) * 100)
  );

  const groqSummary: ModelUsageSummary = {
    modelId: configuredGroqModel,
    modelName: `Groq LPU (${configuredGroqModel})`,
    provider: "groq",
    status: !groqKey
      ? "unconfigured"
      : groqProbe
      ? groqProbe.status
      : "operational",
    statusMessage: !groqKey ? "GROQ_API_KEY is not configured" : groqProbe?.statusMessage,
    latencyMs: groqProbe?.latencyMs ?? null,
    requestsToday: groqTodayRequests,
    requestsLast7Days: modelStatsMap[configuredGroqModel]?.sevenDayCount || 0,
    requestsLast30Days: modelStatsMap[configuredGroqModel]?.thirtyDayCount || 0,
    estimatedTokensToday: modelStatsMap[configuredGroqModel]?.todayTokens || 0,
    quotaLimitRequests: groqLimitRequests,
    quotaRemainingRequests: groqRemainingRequests,
    quotaLimitTokens: groqLimitTokens,
    quotaRemainingTokens: groqRemainingTokens,
    quotaRequestsPercentUsed: groqPercentUsed,
    quotaTokensPercentUsed: groqTokensPercentUsed,
    resetTimeDailyUtc: utcReset.iso,
    resetTimeDailyCountdownSeconds: groqProbe?.resetRequests ? (parseDurationToSeconds(groqProbe.resetRequests) ?? utcReset.secondsRemaining) : utcReset.secondsRemaining,
    resetTimeDailyFormatted: groqProbe?.resetRequests || utcReset.formatted,
    resetTimeMinuteCountdownSeconds: minuteReset,
    providerReportedResetRequests: groqProbe?.resetRequests || null,
    providerReportedResetTokens: groqProbe?.resetTokens || null,
    rawHeaders: groqProbe?.headers || {},
    notes: "Groq returns dynamic x-ratelimit headers with exact remaining requests, token limits, and rolling reset counters.",
  };

  // Build model fleet list
  const models: ModelUsageSummary[] = [
    activeProvider === "gemini" ? geminiSummary : groqSummary,
    activeProvider === "gemini" ? groqSummary : geminiSummary,
  ];

  // Also include any other models from DB that had activity
  for (const [key, stats] of Object.entries(modelStatsMap)) {
    if (key !== configuredGeminiModel && key !== configuredGroqModel && stats.thirtyDayCount > 0) {
      const isGemini = key.toLowerCase().includes("gemini");
      models.push({
        modelId: key,
        modelName: isGemini ? `Google Gemini (${key})` : `Groq / Open Model (${key})`,
        provider: isGemini ? "gemini" : "groq",
        status: "operational",
        statusMessage: "Historical model in fleet",
        latencyMs: null,
        requestsToday: stats.todayCount,
        requestsLast7Days: stats.sevenDayCount,
        requestsLast30Days: stats.thirtyDayCount,
        estimatedTokensToday: stats.todayTokens,
        quotaLimitRequests: isGemini ? 1500 : 1000,
        quotaRemainingRequests: Math.max(0, (isGemini ? 1500 : 1000) - stats.todayCount),
        quotaLimitTokens: isGemini ? 1_000_000 : 8000,
        quotaRemainingTokens: null,
        quotaRequestsPercentUsed: Math.min(100, Math.round((stats.todayCount / (isGemini ? 1500 : 1000)) * 100)),
        quotaTokensPercentUsed: 0,
        resetTimeDailyUtc: utcReset.iso,
        resetTimeDailyCountdownSeconds: utcReset.secondsRemaining,
        resetTimeDailyFormatted: utcReset.formatted,
        resetTimeMinuteCountdownSeconds: minuteReset,
        providerReportedResetRequests: null,
        providerReportedResetTokens: null,
        rawHeaders: {},
        notes: "Historical model with recent records in database.",
      });
    }
  }

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

  const cacheSavingsPercent = totalRequestsToday > 0 ? Math.round((cacheHitsToday / (totalRequestsToday + cacheHitsToday)) * 100) : 0;

  return {
    timestamp: new Date().toISOString(),
    activeProvider,
    configuredGeminiModel,
    configuredGroqModel,
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
