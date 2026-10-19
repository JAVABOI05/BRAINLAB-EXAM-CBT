import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 24_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MS = 60_000;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function safeQuestion(value: unknown): string {
  if (!isRecord(value)) throw new Error("Question context is missing.");
  const subject = safeString(value.subject, 120);
  const text = safeString(value.text, 2_000);
  const options = isRecord(value.options)
    ? Object.entries(value.options)
        .map(([k, v]) => `${k}: ${safeString(v, 600)}`)
        .join("\n")
    : "";
  const correctAnswer = safeString(value.correctAnswer, 4);
  const userAnswer = safeString(value.userAnswer, 4) || "Unanswered";
  const explanation = safeString(value.explanation, 1_000);

  if (!text) throw new Error("Question text is required.");
  return `Subject: ${subject || "General"}\nQuestion: ${text}\nOptions:\n${options}\nCandidate's Answer: ${userAnswer}\nOfficial Answer Key: ${correctAnswer}${explanation ? `\nAnswer Key Note: ${explanation}` : ""}`;
}

type ChatItem = { role: "user" | "assistant"; content: string };

function safeMessages(value: unknown): ChatItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        isRecord(m) &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2_000) }));
}

function buildPrompt(body: JsonRecord): {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
} {
  const system =
    "You are BrainLab Academy's AI Tutor. Provide accurate, encouraging, and step-by-step pedagogical explanations. Help learners understand fundamental principles, avoid common traps, and develop confident problem-solving strategies. Format responses clearly with concise sections.";

  if (body.mode === "explain" || body.mode === "why_wrong") {
    const question = safeQuestion(body.question);
    return {
      system,
      messages: [
        {
          role: "user",
          content:
            body.mode === "explain"
              ? `Please explain this question step-by-step:\n\n${question}`
              : `Help the candidate understand where the reasoning gap happened between their selection and the correct answer:\n\n${question}`,
        },
      ],
    };
  }

  if (body.mode === "chat") {
    const question = safeQuestion(body.question);
    const messages = safeMessages(body.messages);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      throw new Error("Enter a message to continue the conversation.");
    }
    messages[0] = {
      role: "user",
      content: `Context for this question:\n${question}\n\nLearner question: ${messages[0].content}`,
    };
    return { system, messages };
  }

  if (body.mode === "coach") {
    if (!isRecord(body.context)) throw new Error("Learning context is missing.");
    const context = JSON.stringify(body.context).slice(0, 8_000);
    const messages = safeMessages(body.messages);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      throw new Error("Enter a message to continue the coaching session.");
    }
    return {
      system,
      messages: [
        {
          role: "user",
          content: `Exam summary context:\n${context}\n\nCandidate question: ${messages[messages.length - 1].content}`,
        },
      ],
    };
  }

  throw new Error("Unsupported tutor request mode.");
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return jsonError("Your request is too large.", 413);

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!token || !supabaseUrl || !anonKey) {
    return jsonError("Sign in to use the AI Tutor.", 401);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return jsonError("Your session is invalid or expired. Please sign in again.", 401);
  }

  const now = Date.now();
  const userKey = authData.user.id;
  const windowData = requestWindows.get(userKey);
  if (!windowData || windowData.resetAt <= now) {
    requestWindows.set(userKey, { count: 1, resetAt: now + WINDOW_MS });
  } else if (windowData.count >= MAX_REQUESTS_PER_WINDOW) {
    return jsonError("You've sent several tutor requests. Please wait a minute and try again.", 429);
  } else {
    windowData.count += 1;
  }

  // Check providers: Gemini first, Groq fallback
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY;
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQAPIKEY;
  const provider = geminiKey ? "gemini" : groqKey ? "groq" : null;
  const model =
    provider === "gemini"
      ? process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash"
      : process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  if (!provider) {
    return jsonError("AI Tutor is not configured yet. Please try again later.", 503);
  }

  let body: JsonRecord;
  try {
    const raw = await request.text();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return jsonError("Invalid tutor request.", 400);
    body = parsed;
  } catch {
    return jsonError("Invalid JSON request.", 400);
  }

  let prompt: ReturnType<typeof buildPrompt>;
  try {
    prompt = buildPrompt(body);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid tutor request.", 400);
  }

  const upstream = await fetch(
    provider === "gemini"
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
      : "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        ...(provider === "gemini" ? { "x-goog-api-key": geminiKey! } : { Authorization: `Bearer ${groqKey!}` }),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        provider === "gemini"
          ? {
              systemInstruction: { parts: [{ text: prompt.system }] },
              contents: prompt.messages.map((message) => ({
                role: message.role === "assistant" ? "model" : "user",
                parts: [{ text: message.content }],
              })),
              generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
            }
          : {
              model,
              stream: true,
              temperature: 0.3,
              max_tokens: 900,
              messages: [{ role: "system", content: prompt.system }, ...prompt.messages],
            }
      ),
      signal: request.signal,
      cache: "no-store",
    }
  ).catch(() => null);

  if (!upstream?.ok || !upstream.body) {
    return jsonError("The AI Tutor could not connect right now. Please try again shortly.", 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const event: unknown = JSON.parse(data);
              if (!isRecord(event)) continue;
              let content = "";
              if (provider === "gemini") {
                const candidates = event.candidates;
                const candidate = Array.isArray(candidates) ? candidates[0] : null;
                const candidateContent = isRecord(candidate) ? candidate.content : null;
                const parts = isRecord(candidateContent) ? candidateContent.parts : null;
                if (Array.isArray(parts)) {
                  content = parts
                    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
                    .join("");
                }
              } else {
                const choices = event.choices;
                const choice = Array.isArray(choices) ? choices[0] : null;
                const delta = isRecord(choice) ? choice.delta : null;
                if (isRecord(delta) && typeof delta.content === "string") content = delta.content;
              }
              if (content) controller.enqueue(encoder.encode(content));
            } catch {
              // Ignore malformed event frames
            }
          }
        }
        controller.close();
      } catch {
        controller.error(new Error("AI Tutor stream interrupted."));
      } finally {
        reader.releaseLock();
      }
    },
    cancel() {
      upstream.body?.cancel().catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
