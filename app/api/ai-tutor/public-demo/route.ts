import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_QUESTION_LENGTH = 250;
const MAX_GUEST_DAILY_PER_IP = 2;
const MAX_GLOBAL_DAILY_CEILING = 300;

interface IpUsage {
  count: number;
  dateKey: string;
}

// In-memory process-local rate limiters for guest demo
const ipTracker = new Map<string, IpUsage>();
let globalTracker = { count: 0, dateKey: "" };

function getUtcDateKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown-guest";
}

async function askGroqDemo(message: string): Promise<string> {
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
      temperature: 0.3,
      max_tokens: 450,
      messages: [
        {
          role: "system",
          content:
            "You are BrainLab Academy's Socratic learning tutor providing a short, clear public preview. Teach step by step in concise language suitable for Nigerian secondary school and UTME candidates (JAMB/WAEC). Explain the foundational reasoning clearly. Refuse non-academic questions, active examination cheating requests, or hazardous real-world instructions. Remind the learner to verify calculations against official marking schemes. Keep your response under 150 words.",
        },
        { role: "user", content: message },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("groq_error");
  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== "string" || !answer.trim()) throw new Error("groq_empty");
  return answer.trim();
}

async function askGeminiDemo(message: string): Promise<string> {
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
            text: "You are BrainLab Academy's Socratic learning tutor providing a short, clear public preview. Teach step by step in concise language suitable for Nigerian secondary school and UTME candidates (JAMB/WAEC). Explain the foundational reasoning clearly. Refuse non-academic questions, active examination cheating requests, or hazardous real-world instructions. Remind the learner to verify calculations against official marking schemes. Keep your response under 150 words.",
          },
        ],
      },
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 450 },
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("gemini_error");
  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const answer = candidate?.content?.parts
    ?.map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
  if (!answer) throw new Error("gemini_empty");
  return answer;
}

export async function POST(req: NextRequest) {
  try {
    const today = getUtcDateKey();

    // Check & Reset Global Daily Ceiling
    if (globalTracker.dateKey !== today) {
      globalTracker = { count: 0, dateKey: today };
    }
    if (globalTracker.count >= MAX_GLOBAL_DAILY_CEILING) {
      return NextResponse.json(
        {
          ok: false,
          error: "Daily public demonstration ceiling reached (300 queries). Please sign in to your student account for your guaranteed daily free quota.",
          quotaReached: true,
        },
        { status: 429 }
      );
    }

    // Check & Reset IP Guest Limit
    const clientIp = getClientIp(req);
    const existing = ipTracker.get(clientIp);
    const currentIpUsage: IpUsage = existing && existing.dateKey === today ? existing : { count: 0, dateKey: today };

    if (currentIpUsage.count >= MAX_GUEST_DAILY_PER_IP) {
      return NextResponse.json(
        {
          ok: false,
          error: "You have used your 2 free guest demo questions for today. Sign in or register a free student account for 10 daily questions.",
          quotaReached: true,
        },
        { status: 429 }
      );
    }

    // Parse Body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON request body." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || !("question" in body) || typeof body.question !== "string") {
      return NextResponse.json({ ok: false, error: "Please provide a valid question string." }, { status: 400 });
    }

    const question = body.question.trim();
    if (!question) {
      return NextResponse.json({ ok: false, error: "Please enter a question to ask the AI Tutor." }, { status: 400 });
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: `Guest demo questions are limited to ${MAX_QUESTION_LENGTH} characters. Your question is ${question.length} characters.`,
        },
        { status: 400 }
      );
    }

    // Increment Usage Counters before execution
    currentIpUsage.count += 1;
    ipTracker.set(clientIp, currentIpUsage);
    globalTracker.count += 1;

    // Prune stale IP tracker records if Map gets large
    if (ipTracker.size > 2000) {
      for (const [key, val] of ipTracker) {
        if (val.dateKey !== today) ipTracker.delete(key);
      }
    }

    // Dual-Provider Execution
    let answer = "";
    try {
      answer = await askGroqDemo(question);
    } catch {
      // Fallback to Gemini
      try {
        answer = await askGeminiDemo(question);
      } catch {
        return NextResponse.json(
          {
            ok: false,
            error: "The AI Tutor engine is momentarily busy. Please try one of our verified curated sample questions below or check back shortly.",
          },
          { status: 503 }
        );
      }
    }

    const remainingGuestQueries = Math.max(0, MAX_GUEST_DAILY_PER_IP - currentIpUsage.count);

    return NextResponse.json({
      ok: true,
      answer,
      remainingGuestQueries,
      quotaNotice: `Guest queries remaining today: ${remainingGuestQueries}/${MAX_GUEST_DAILY_PER_IP}. Free registered accounts receive 10 queries/day.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error processing public demo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
