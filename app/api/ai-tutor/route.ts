import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { executeSmartAICompletion } from "@/app/lib/aiRouter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_BODY_BYTES = 8_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 8;

// Best-effort process-local protection against burst hammering.
const requestWindows = new Map<string, { startedAt: number; count: number }>();

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === request.nextUrl.origin);
}

function allowRequest(userId: string) {
  const now = Date.now();
  const existing = requestWindows.get(userId);
  if (!existing || now - existing.startedAt >= RATE_WINDOW_MS) {
    requestWindows.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (existing.count >= RATE_LIMIT) return false;
  existing.count += 1;

  if (requestWindows.size > 5_000) {
    for (const [key, value] of requestWindows) {
      if (now - value.startedAt >= RATE_WINDOW_MS) requestWindows.delete(key);
    }
  }
  return true;
}

async function askGroq(message: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("groq_unconfigured");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content:
            "You are BrainLab Academy's patient learning tutor. Teach step by step, use clear language appropriate for secondary and early tertiary learners, explain reasoning rather than only giving answers, and ask a short checking question when useful. If a question concerns an active exam or requests cheating, refuse assistance with the live assessment and offer concept-level study help. Do not claim access to the learner's exam history or personal records. Do not ask for passwords, API keys, or sensitive personal information.",
        },
        { role: "user", content: message },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("groq_unavailable");
  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("choices" in data) ||
    !Array.isArray(data.choices)
  ) {
    throw new Error("groq_invalid_response");
  }
  const first = data.choices[0] as { message?: { content?: unknown } } | undefined;
  const answer = first?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) throw new Error("groq_empty_response");
  return answer.trim();
}

async function askGemini(message: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("gemini_unconfigured");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
  );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: "You are BrainLab Academy's patient learning tutor. Teach step by step, use clear language appropriate for secondary and early tertiary learners, explain reasoning rather than only giving answers, and ask a short checking question when useful. If a question concerns an active exam or requests cheating, refuse assistance with the live assessment and offer concept-level study help. Do not claim access to the learner's exam history or personal records. Do not ask for passwords, API keys, or sensitive personal information.",
          },
        ],
      },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("gemini_unavailable");
  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("candidates" in data) ||
    !Array.isArray(data.candidates)
  ) {
    throw new Error("gemini_invalid_response");
  }
  const candidate = data.candidates[0] as
    | { content?: { parts?: Array<{ text?: unknown }> } }
    | undefined;
  const answer = candidate?.content?.parts
    ?.map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
  if (!answer) throw new Error("gemini_empty_response");
  return answer;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return jsonError("Request denied.", 403);

  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  const accessToken = match?.[1]?.trim() || "";
  if (!accessToken || accessToken.length > 8192) {
    return jsonError("Please sign in to use the AI Tutor.", 401);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey)
    return jsonError("Authentication is temporarily unavailable.", 503);

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !authData.user) return jsonError("Please sign in to use the AI Tutor.", 401);

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return jsonError("Your question is too long.", 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return jsonError("Please send a valid question.", 400);
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof body.message !== "string"
  ) {
    return jsonError("Please enter a question.", 400);
  }

  const message = body.message.trim();
  if (!message) return jsonError("Please enter a question.", 400);
  if (message.length > MAX_MESSAGE_LENGTH)
    return jsonError("Keep your question under 2,000 characters.", 413);
  if (!allowRequest(authData.user.id))
    return jsonError(
      "You've reached the short-term Tutor limit. Please wait a minute and try again.",
      429
    );

  // ============================================================================
  // Quota & Entitlement Enforcement
  // ============================================================================
  let isUnlimited = false;
  let quotaLimit = 10;
  let currentUsage = 0;

  try {
    const { data: sub } = await authClient
      .from("user_subscriptions")
      .select("plan_id, status, current_period_end, subscription_plans:plan_id(feature_entitlements)")
      .eq("user_id", authData.user.id)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .maybeSingle();

    const planEntitlements = (sub?.subscription_plans as { feature_entitlements?: Record<string, unknown> })
      ?.feature_entitlements;

    // Administrators have universal unlimited AI Tutor access without paywalls
    let isAdmin = false;
    try {
      const { resolveAdminRole } = await import("@/app/lib/supabaseServer");
      const adminRole = await resolveAdminRole(authData.user.id);
      if (adminRole) isAdmin = true;
    } catch {
      // ignore
    }

    isUnlimited = isAdmin || planEntitlements?.ai_unlimited === true;
    const monthlyQuota = Number(planEntitlements?.ai_monthly_quota || 0);

    if (isUnlimited) {
      quotaLimit = 999999;
    } else if (monthlyQuota > 0) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await authClient
        .from("ai_generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authData.user.id)
        .gte("created_at", thirtyDaysAgo);
      currentUsage = count ?? 0;
      quotaLimit = monthlyQuota;
    } else {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { count } = await authClient
        .from("ai_generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", authData.user.id)
        .gte("created_at", todayStart.toISOString());
      currentUsage = count ?? 0;
      quotaLimit = 10;
    }

    if (!isUnlimited && currentUsage >= quotaLimit) {
      return jsonError(
        monthlyQuota > 0
          ? `You have reached your monthly AI Tutor quota (${monthlyQuota} questions). Upgrade your plan or check back next billing cycle.`
          : "You have reached your daily AI Tutor limit (10 free questions/day). Upgrade to Premium or Plus for higher quotas.",
        429
      );
    }
  } catch {
    // If quota check fails due to transient connection, proceed safely
  }

  // ============================================================================
  // Execution with Dual-Provider Fallback
  // ============================================================================
  let answer: string;
  let provider = "BrainLab AI Tutor";
  let modelUsed = "BrainLab AI Tutor";

  try {
    const smartRes = await executeSmartAICompletion({
      userMessage: message,
      context: { mode: "chat" },
      userId: authData.user.id,
    });
    answer = smartRes.text;
    modelUsed = smartRes.modelIdentifier;
    provider = smartRes.provider || "BrainLab AI Tutor";
  } catch (err) {
    console.error("[ai-tutor] Smart execution failed, trying direct providers:", err);
    try {
      answer = await askGroq(message);
      provider = "groq";
      modelUsed = "groq-direct";
    } catch {
      try {
        answer = await askGemini(message);
        provider = "gemini";
        modelUsed = "gemini-direct";
      } catch {
        return jsonError("The AI Tutor could not respond right now. Please try again shortly.", 502);
      }
    }
  }

  if (!answer) return jsonError("No answer generated.", 502);

  // ============================================================================
  // Persist Audit Record to ai_generations
  // ============================================================================
  try {
    await authClient.from("ai_generations").insert({
      user_id: authData.user.id,
      prompt: message,
      response: answer,
      model: modelUsed,
      metadata: {
        provider,
        quota_limit: quotaLimit,
        used: currentUsage + 1,
      },
    });
  } catch {
    // Logging failure should not disrupt the learner's response
  }

  return NextResponse.json(
    {
      answer,
      provider,
      quota: {
        is_unlimited: isUnlimited,
        limit: quotaLimit,
        used: currentUsage + 1,
        remaining: isUnlimited ? 999999 : Math.max(0, quotaLimit - (currentUsage + 1)),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
