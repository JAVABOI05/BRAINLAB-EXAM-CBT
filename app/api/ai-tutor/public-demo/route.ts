import { NextRequest, NextResponse } from "next/server";

// Public Guest Rate Limiting & Cost Ceiling Controls
const MAX_QUESTION_LENGTH = 250;
const MAX_GUEST_DAILY_PER_IP = 2;
const MAX_GLOBAL_DAILY_CEILING = 300;

// In-memory daily counter stores (cleared when day resets)
interface GuestRateLimitRecord {
  count: number;
  dateKey: string;
}

const ipUsageStore = new Map<string, GuestRateLimitRecord>();
let globalDailyCount = {
  count: 0,
  dateKey: new Date().toISOString().slice(0, 10),
};

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkAndIncrementRateLimit(ip: string): { allowed: boolean; reason?: string; remaining?: number } {
  const today = getTodayKey();

  // Reset global count if day rotated
  if (globalDailyCount.dateKey !== today) {
    globalDailyCount = { count: 0, dateKey: today };
    ipUsageStore.clear();
  }

  // Check global ceiling
  if (globalDailyCount.count >= MAX_GLOBAL_DAILY_CEILING) {
    return {
      allowed: false,
      reason: "The public guest demo has reached its daily safety capacity (300 questions). Please create a free account or sign in to continue asking questions.",
    };
  }

  // Check IP rate limit
  const record = ipUsageStore.get(ip);
  if (record && record.dateKey === today) {
    if (record.count >= MAX_GUEST_DAILY_PER_IP) {
      return {
        allowed: false,
        reason: "You have reached the guest limit of 2 questions per 24 hours. Sign in or create a free student account for regular academic access.",
        remaining: 0,
      };
    }
    record.count += 1;
    globalDailyCount.count += 1;
    return { allowed: true, remaining: MAX_GUEST_DAILY_PER_IP - record.count };
  } else {
    ipUsageStore.set(ip, { count: 1, dateKey: today });
    globalDailyCount.count += 1;
    return { allowed: true, remaining: MAX_GUEST_DAILY_PER_IP - 1 };
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return NextResponse.json({ error: "Please enter a valid question or problem." }, { status: 400 });
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        { error: `Questions in the guest demo are capped at ${MAX_QUESTION_LENGTH} characters. Your question is ${question.length} characters.` },
        { status: 400 }
      );
    }

    // Rate limit check
    const rateCheck = checkAndIncrementRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason }, { status: 429 });
    }

    // Server-side secret key check
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const systemPrompt = `You are BrainLab AI Tutor in a public demonstration sandbox.
Follow these strict pedagogical rules:
1. Socratic Teaching: Guide the student step-by-step with guiding questions or hints rather than giving raw homework answers directly.
2. Safety & Integrity: Refuse non-academic questions, active examination cheating requests, or unsafe real-world instructions.
3. Conciseness: Keep your response clear, structured, and under 150 words.
4. Accuracy: Do not hallucinate formulas or historical dates. If unsure, advise the student to verify with their recommended textbook.`;

    if (groqKey) {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        const text = data.choices?.[0]?.message?.content || "";
        return NextResponse.json({
          answer: text,
          remaining: rateCheck.remaining,
          model: "llama-3.3-70b-versatile",
        });
      }
    }

    if (geminiKey) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nStudent Question: ${question}` }],
              },
            ],
          }),
        }
      );

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return NextResponse.json({
          answer: text,
          remaining: rateCheck.remaining,
          model: "gemini-2.5-flash",
        });
      }
    }

    // Honest deterministic fallback if neither API key is active or configured in this environment
    return NextResponse.json({
      answer: `[BrainLab Socratic Guide]\nTo solve: "${question}"\n\n1. Identify your known variables and the specific concept being tested.\n2. State the fundamental theorem or formula that connects them.\n3. Substitute step-by-step and verify your dimensional units.\n\n(Tip: In your full student portal account, AI Tutor provides step-by-step interactive derivation and diagram analysis.)`,
      remaining: rateCheck.remaining,
      mode: "pedagogical_heuristic",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: "Unable to process demonstration request: " + message }, { status: 500 });
  }
}
