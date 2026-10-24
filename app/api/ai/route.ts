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
  const system = customSystemPrompt?.trim() || "You are BrainLab Academy's AI Tutor. Provide clear, direct, and concise pedagogical explanations under 180 words. Never output markdown hashtags (#) or asterisks (* or **). Never use asterisks for bold, italic, or bullet lists. Write in clean plain text only using simple numbered lists (1., 2.) or regular line breaks. Help students understand the concept and avoid common mistakes without long essays.";


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
      ? process.env.GROQ_MODEL?.trim() || "qwen/qwen3.8-27b"
      : process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview");

  if (!provider) {
    return jsonError("AI Tutor is not configured yet. Please try again later.", 503);
  }

  let body: JsonRecord;
  try {
    const raw = await request.text();
    // Content-Length is optional and may be missing on streamed/chunked requests.
    // Enforce the limit on the actual body before parsing to bound memory and work.
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return jsonError("Your request is too large.", 413);
    }
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

  if (body.mode === "explain" && questionId && !isForceRefresh) {
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
            "X-BrainLab-Model": cached.model,
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

  const maxTokens = aiConfig?.max_output_tokens || 350;
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
                // Strip markdown hashes and asterisks from streamed chunks
                const cleanedChunk = content
                  .replace(/\s\*\s/g, " × ")
                  .replace(/[#*`]/g, "");
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
        if (body.mode === "explain" && questionId && accumulatedCleaned.trim()) {
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
