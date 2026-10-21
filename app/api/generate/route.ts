import { NextRequest, NextResponse } from "next/server";
import { generateGeminiContent } from "@/app/lib/gemini";
import { getUserFromRequest, saveAIGeneration } from "@/app/lib/supabaseServer";
import { getCachedExplanation, setCachedExplanation } from "@/app/lib/explanationCache";

export const dynamic = "force-dynamic";

// Simple in-memory sliding window rate limiter
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitBucket>();

// Fast in-memory cache for repeated study prompts and tutor queries
interface PromptCacheItem {
  response: string;
  model: string;
  cachedAt: number;
}
const promptMemoryCache = new Map<string, PromptCacheItem>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const bucket = rateLimitMap.get(identifier);

  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetInSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") || "anonymous-client";
}

export async function POST(request: NextRequest) {
  try {
    // 1. Identify client and authenticated user
    const clientIp = getClientIp(request);
    const user = await getUserFromRequest(request);

    // 2. Enforce Rate Limiting (30 req/min for authenticated, 10 req/min for guests)
    const rateLimitKey = user ? `user:${user.id}` : `ip:${clientIp}`;
    const limit = user ? 30 : 10;
    const { allowed, remaining, resetInSec } = checkRateLimit(rateLimitKey, limit);

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please wait a moment before sending another request.",
          retryAfterSeconds: resetInSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(resetInSec),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // 3. Parse and validate JSON body
    let body: {
      prompt?: unknown;
      model?: unknown;
      systemInstruction?: unknown;
      metadata?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body. Please provide a JSON object with a 'prompt' property." },
        { status: 400 }
      );
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return NextResponse.json(
        { error: "The 'prompt' field is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    if (prompt.length > 3000) {
      return NextResponse.json(
        { error: "Input prompt is too long. Please limit your prompt to 3,000 characters." },
        { status: 400 }
      );
    }

    const metadataObj =
      typeof body.metadata === "object" && body.metadata !== null
        ? (body.metadata as Record<string, unknown>)
        : {};
    const questionId = metadataObj.question_id ? String(metadataObj.question_id) : null;

    // Check shared cache if requesting a standard correction explanation
    if (questionId && metadataObj.source === "corrections_page") {
      const cached = await getCachedExplanation(questionId).catch(() => null);
      if (cached) {
        return NextResponse.json({
          success: true,
          prompt,
          response: cached.explanation,
          model: cached.model,
          cached: true,
          user_id: user?.id ?? null,
        });
      }
    }

    const requestedModel =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : undefined;

    const customSystemInstruction =
      typeof body.systemInstruction === "string" && body.systemInstruction.trim()
        ? body.systemInstruction.trim()
        : undefined;

    // Check fast in-memory prompt cache for sub-millisecond response on repeated queries
    const cacheFingerprint = `${requestedModel || "default"}:${prompt.toLowerCase().replace(/\s+/g, " ").trim()}`;
    const memCached = promptMemoryCache.get(cacheFingerprint);
    if (memCached && Date.now() - memCached.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(
        {
          success: true,
          prompt,
          response: memCached.response,
          model: memCached.model,
          user_id: user?.id ?? null,
          cached: true,
        },
        {
          status: 200,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-BrainLab-FastCache": "hit",
          },
        }
      );
    }

    // 4. Call Gemini via Google AI Studio
    const { text, model } = await generateGeminiContent(prompt, {
      model: requestedModel,
      systemInstruction: customSystemInstruction,
      maxOutputTokens: 350,
    });

    // Save to fast in-memory prompt cache
    if (text) {
      if (promptMemoryCache.size > 800) {
        const oldest = promptMemoryCache.keys().next().value;
        if (oldest) promptMemoryCache.delete(oldest);
      }
      promptMemoryCache.set(cacheFingerprint, {
        response: text,
        model,
        cachedAt: Date.now(),
      });
    }

    // 5. Save prompt, response, and user attribution to Supabase asynchronously without blocking client
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

    void saveAIGeneration(
      {
        user_id: user?.id ?? null,
        prompt,
        response: text,
        model,
        metadata:
          typeof body.metadata === "object" && body.metadata !== null
            ? (body.metadata as Record<string, unknown>)
            : { clientIp },
      },
      bearerToken
    ).catch((saveErr) => {
      console.warn("[app/api/generate] Background Supabase save warning:", saveErr);
    });

    // If generated for a specific question on corrections, cache for all learners
    if (questionId && metadataObj.source === "corrections_page") {
      void setCachedExplanation({
        questionId,
        subject: String(metadataObj.subject || "General"),
        questionText: prompt,
        options: {},
        correctAnswer: "",
        explanation: text,
        model,
      }).catch((cacheErr) => {
        console.warn("[app/api/generate] Failed to save shared cache:", cacheErr);
      });
    }

    // 6. Return response immediately
    return NextResponse.json(
      {
        success: true,
        prompt,
        response: text,
        model,
        user_id: user?.id ?? null,
        cached: false,
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("[app/api/generate] Generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const prompt = searchParams.get("prompt")?.trim();

  if (!prompt) {
    return NextResponse.json({
      status: "ready",
      message:
        "BrainLab AI Generation API is online. Send a POST request with { \"prompt\": \"your text\" } or GET with ?prompt=...",
    });
  }

  if (prompt.length > 500) {
    return NextResponse.json(
      { error: "Input prompt is too long. Please limit your prompt to 500 characters." },
      { status: 400 }
    );
  }

  try {
    const clientIp = getClientIp(request);
    const user = await getUserFromRequest(request);
    const limit = user ? 30 : 10;
    const rateLimitKey = user ? `user:${user.id}` : `ip:${clientIp}`;
    const { allowed, remaining, resetInSec } = checkRateLimit(rateLimitKey, limit);

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded. Please wait a moment before trying again.",
          retryAfterSeconds: resetInSec,
        },
        { status: 429, headers: { "Retry-After": String(resetInSec) } }
      );
    }

    const { text, model } = await generateGeminiContent(prompt);

    let dbData: unknown = null;
    let savedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await saveAIGeneration({
        user_id: user?.id ?? null,
        prompt,
        response: text,
        model,
        metadata: { clientIp },
      });

      if (error) {
        supabaseError = error.message;
      } else {
        dbData = data;
        savedToSupabase = true;
      }
    } catch (saveErr) {
      supabaseError = saveErr instanceof Error ? saveErr.message : String(saveErr);
    }

    return NextResponse.json(
      {
        success: true,
        prompt,
        response: text,
        model,
        user_id: user?.id ?? null,
        savedToSupabase,
        data: dbData,
        supabaseError,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
