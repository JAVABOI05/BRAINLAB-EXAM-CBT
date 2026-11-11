import { supabase } from "./supabase";

export type AiOptionKey = "A" | "B" | "C" | "D" | "E";

export type AiQuestionContext = {
  id?: string | number;
  subject: string;
  type?: string;
  text: string;
  options: { A: string; B: string; C: string; D: string; E?: string; };
  correctAnswer: AiOptionKey;
  explanation?: string;
  userAnswer: AiOptionKey | null;
};

export type AiSubjectStat = {
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
};

export type AiCoachContext = {
  summary: AiSubjectStat;
  subjectStats: Record<string, AiSubjectStat>;
  missedQuestions: { subject: string; text: string; correctAnswer: AiOptionKey }[];
};

export type AiChatMessage = { role: "user" | "assistant"; content: string };

export type AiTutorRequest =
  | { mode: "explain" | "why_wrong"; question: AiQuestionContext; forceRefresh?: boolean; style?: "standard" | "simple" | "detailed" | "exam_traps" }
  | { mode: "hint"; question: AiQuestionContext }
  | { mode: "socratic"; question: AiQuestionContext; step: "clue" | "formula" | "derivation" }
  | { mode: "distractor_traps"; question: AiQuestionContext }
  | { mode: "chat"; question: AiQuestionContext; messages: AiChatMessage[] }
  | { mode: "coach"; context: AiCoachContext; messages: AiChatMessage[] };

export const MAX_CHAT_MESSAGES = 6;
export const MAX_CHAT_MESSAGE_CHARS = 300;

/** Keep only the newest turns so every request stays small, concise, and affordable. */
export function trimChatHistory(messages: AiChatMessage[]): AiChatMessage[] {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_CHAT_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, MAX_CHAT_MESSAGE_CHARS),
    }));
}

/**
 * POST a tutoring request with the signed-in user's access token, then forward
 * streamed text chunks to onDelta. The API route validates the token server-side.
 */
export async function streamAiTutor(
  request: AiTutorRequest,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const session = data?.session;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const response = await fetch("/api/ai", {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `The AI Tutor could not be reached (error ${response.status}).`;
    try {
      const data: unknown = await response.json();
      if (
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string" &&
        data.error.trim()
      ) {
        message = data.error;
      }
    } catch {
      // Keep generic message when body is not JSON
    }
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Streaming is not supported in this browser.");

  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) onDelta(chunk);
    }
    const finalChunk = decoder.decode();
    if (finalChunk) onDelta(finalChunk);
  } finally {
    reader.releaseLock();
  }
}
