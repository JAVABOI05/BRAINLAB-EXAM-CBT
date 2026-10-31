import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCachedExplanation, setCachedExplanation, computeQuestionFingerprint } from "@/app/lib/explanationCache";
import { getAIPlatformConfig } from "@/app/lib/platformConfig";

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
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 300) }));
}

function buildPrompt(body: JsonRecord, customSystemPrompt?: string): {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
} {
  const system =
    customSystemPrompt?.trim() ||
    "You are BrainLab Academy's expert CBT AI Tutor. Provide complete, thorough, accurate, and pedagogical step-by-step solutions for Nigerian examinations (JAMB UTME, WAEC, NECO).\n- For Mathematics, Physics, and Chemistry: State the core formula or theorem explicitly. Define each given variable and substitute values step-by-step. Carry out calculations clearly and state the final answer with correct units. Explain why each distractor option is incorrect (e.g. sign error, inverted fraction, wrong conversion).\n- For English Language and Humanities: Explain the grammatical rule, comprehension clue, or literary context, and contrast why the other options do not fit.\n- Never invent facts or hallucinate answers. Never cut off mid-explanation. Write in clean, structured plain text using numbered steps (1., 2., 3.) or bullet points (•) and clear line breaks. Use × for multiplication.";

  if (body.mode === "distractor_traps" || body.style === "exam_traps") {
    const question = safeQuestion(body.question);
    return {
      system,
      messages: [
        {
          role: "user",
          content: `Perform a comprehensive Trap Analysis on this CBT exam question:\n\n${question}\n\nBreakdown structure:
1. Core Examiner Intent: State the fundamental principle being tested and what concept examiners are probing.
2. Distractor Trap Breakdown:
   • Option A: What specific misconception, formula error, or temptation does this option represent?
   • Option B: What specific examiner trap is engineered into this option?
   • Option C: What specific examiner trap is engineered into this option?
   • Option D: What specific examiner trap is engineered into this option?
3. The Winning Clue: Give the exact shortcut, test-taking heuristic, or verification rule to spot and bypass this trap in future timed exams.`,
        },
      ],
    };
  }

  if (body.mode === "explain" || body.mode === "why_wrong") {
    const question = safeQuestion(body.question);
    const styleInstruction =
      body.style === "detailed"
        ? "Provide a comprehensive, in-depth breakdown including background theory, complete worked calculations, formula derivations, and deep conceptual insight."
        : body.style === "simple"
        ? "Explain this in very simple, plain everyday language that is easy to understand without heavy jargon, followed by a direct 2-step solution."
        : "Provide a complete, structured step-by-step explanation covering: 1. Core Principle or Formula, 2. Worked Step-by-Step Solution, 3. Why Distractors Fail, 4. Quick CBT Strategy.";

    return {
      system,
      messages: [
        {
          role: "user",
          content:
            body.mode === "explain"
              ? `Please explain this question completely without cutting off:\n\n${question}\n\n${styleInstruction}`
              : `Help the candidate understand where the reasoning gap happened between their selection and the correct answer:\n\n${question}\n\n${styleInstruction}`,
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
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";

  let userKey = `ip:${clientIp}`;
  let maxRequests = 10;

  if (token) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && anonKey) {
      try {
        const supabase = createClient(supabaseUrl, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
        const { data: authData } = await supabase.auth.getUser(token);
        if (authData?.user) {
          userKey = `user:${authData.user.id}`;
          maxRequests = 30;
        }
      } catch {
        // Fall back to IP rate limiting if auth check encounters an error
      }
    }
  }

  const now = Date.now();
  const windowData = requestWindows.get(userKey);
  if (!windowData || windowData.resetAt <= now) {
    requestWindows.set(userKey, { count: 1, resetAt: now + WINDOW_MS });
  } else if (windowData.count >= maxRequests) {
    return jsonError("You've sent several tutor requests. Please wait a minute and try again.", 429);
  } else {
    windowData.count += 1;
  }

  // Check providers: Groq offers ultra-fast ~200ms latency, Gemini 3 offers ~1.3s latency
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQAPIKEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GEMINIAPIKEY;
  const aiConfig = await getAIPlatformConfig().catch(() => null);
  const configuredProvider = aiConfig?.provider;
  const provider = (configuredProvider === "gemini" && geminiKey) ? "gemini" : (configuredProvider === "groq" && groqKey) ? "groq" : (groqKey ? "groq" : geminiKey ? "gemini" : null);
  const model = (provider === "groq" ? aiConfig?.groq_model : aiConfig?.gemini_model)?.trim() || (
    provider === "groq"
      ? process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile"
      : process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash");

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

  // Active exam guard: never disclose explanations during active exams
  const isExamActive =
    request.headers.get("x-brainlab-exam-active") === "true" ||
    body.exam_active === true;
  if (isExamActive && (body.mode === "explain" || body.mode === "why_wrong" || body.mode === "distractor_traps")) {
    return jsonError("Explanations are strictly unavailable during an active timed exam attempt.", 403);
  }

  // Shared Explanation Cache Lookup
  const qRecord = isRecord(body.question) ? body.question : null;
  const questionId = qRecord?.id ? String(qRecord.id) : null;
  const isForceRefresh = Boolean(body.forceRefresh);

  if (body.mode === "explain" && questionId && !isForceRefresh && !body.style) {
    const qText = safeString(qRecord?.text, 2000);
    const qOptions = isRecord(qRecord?.options) ? (qRecord.options as Record<string, string>) : {};
    const qAns = safeString(qRecord?.correctAnswer, 4);
    const fingerprint = computeQuestionFingerprint(qText, qOptions, qAns);

    const cached = await getCachedExplanation(questionId, fingerprint).catch(() => null);
    if (cached) {
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(cached.explanation));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-BrainLab-Cached": "true",
            "X-BrainLab-Model": "BrainLab AI Tutor",
          },
        }
      );
    }
  }

  let prompt: ReturnType<typeof buildPrompt>;
  try {
    prompt = buildPrompt(body, aiConfig?.system_prompt_tone);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid tutor request.", 400);
  }

  const maxTokens = aiConfig?.max_output_tokens && aiConfig.max_output_tokens > 350 ? aiConfig.max_output_tokens : 1200;
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
              generationConfig: { temperature: 0.3, maxOutputTokens: maxTokens },
            }
          : {
              model,
              stream: true,
              temperature: 0.3,
              max_tokens: maxTokens,
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
      let accumulatedCleaned = "";
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
              if (content) {
                // Strip markdown formatting while safely preserving math multiplication
                const cleanedChunk = content
                  .replace(/\*\*/g, "")
                  .replace(/\s\*\s/g, " × ")
                  .replace(/(\d)\*(\d)/g, "$1 × $2")
                  .replace(/[#`]/g, "");
                if (cleanedChunk) {
                  accumulatedCleaned += cleanedChunk;
                  controller.enqueue(encoder.encode(cleanedChunk));
                }
              }
            } catch {
              // Ignore malformed event frames
            }
          }
        }
        controller.close();

        // Save generated standard explanation to shared cache
        if (body.mode === "explain" && questionId && accumulatedCleaned.trim() && !body.style) {
          void setCachedExplanation({
            questionId,
            subject: safeString(qRecord?.subject, 120) || "General",
            questionText: safeString(qRecord?.text, 2000),
            options: isRecord(qRecord?.options) ? (qRecord.options as Record<string, string>) : {},
            correctAnswer: safeString(qRecord?.correctAnswer, 4),
            explanation: accumulatedCleaned.trim(),
            model,
          }).catch((cacheErr) => {
            console.warn("[app/api/ai] Failed to cache explanation:", cacheErr);
          });
        }
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
