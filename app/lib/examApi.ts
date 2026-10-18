// Typed wrappers around the server-side exam functions created in 02_stage_a_additive.sql.
// The browser never sees answer keys and never computes scores: it only sends answers and
// receives results from these functions.
import { supabase } from "./supabase";

export type Option = "A" | "B" | "C" | "D";

export type ApiError = { ok: false; error: string; message: string };

export type PublicSettings = {
  mock_enabled: boolean;
  calculator_enabled: boolean;
  show_results: boolean;
  leaderboard_enabled: boolean;
  exam_duration: number;
  access_code_required: boolean;
};

export type PaperQuestion = {
  id: number;
  subject: string;
  section: string;
  category: string | null;
  passage_id: string | null;
  passage_title: string | null;
  passage_text: string | null;
  question: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  marks: number;
};

export type AttemptPayload = {
  ok: true;
  finished: false;
  resumed: boolean;
  session_id: string;
  token: string;
  elective: string;
  duration_seconds: number;
  time_left_seconds: number;
  tab_switch_count: number;
  answers: Record<string, Option>;
  questions: PaperQuestion[];
};

export type ResultItem = {
  id: string;
  subject: string;
  type?: string;
  text: string;
  options: Record<Option, string>;
  correctAnswer: Option;
  explanation: string;
  userAnswer: Option | null;
  isCorrect: boolean;
  flagged?: boolean;
  marks?: number;
};

export type FinishedPayload = {
  ok: true;
  finished: true;
  status: string;
  result_id: string;
  score: number;
  total: number;
  subject_scores: Record<string, number>;
  show_results: boolean;
  items: ResultItem[];
};

const NETWORK_ERROR: ApiError = {
  ok: false,
  error: "network",
  message: "Could not reach the server. Check your connection and try again.",
};

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T | ApiError> {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      return { ok: false, error: "rpc_error", message: error.message || NETWORK_ERROR.message };
    }
    return data as T | ApiError;
  } catch {
    return NETWORK_ERROR;
  }
}

export function isError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === false
  );
}

export async function getPublicSettings(): Promise<PublicSettings | null> {
  const res = await call<PublicSettings>("get_public_settings");
  return isError(res) ? null : res;
}

export async function checkAccessCode(code: string, phone: string) {
  return call<{ ok: true; type: "master" | "normal" | "none" }>("check_access_code", {
    p_code: code,
    p_phone: phone,
  });
}

export async function startExam(code: string, name: string, phone: string, elective: string) {
  return call<AttemptPayload>("start_exam", {
    p_code: code,
    p_name: name,
    p_phone: phone,
    p_elective: elective,
  });
}

export async function resumeExam(sessionId: string, token: string) {
  return call<AttemptPayload | FinishedPayload>("resume_exam", {
    p_session: sessionId,
    p_token: token,
  });
}

export async function saveProgress(sessionId: string, token: string, answers: Record<string, Option>) {
  return call<{ ok: true; time_left_seconds: number }>("save_progress", {
    p_session: sessionId,
    p_token: token,
    p_answers: answers,
  });
}

export async function recordTabSwitch(sessionId: string, token: string) {
  return call<{ ok: true; tab_switch_count: number; time_left_seconds: number }>(
    "record_tab_switch",
    { p_session: sessionId, p_token: token }
  );
}

export async function submitExam(
  sessionId: string,
  token: string,
  answers: Record<string, Option>,
  auto: boolean,
  flagged: Record<string, boolean>
) {
  return call<FinishedPayload>("submit_exam", {
    p_session: sessionId,
    p_token: token,
    p_answers: answers,
    p_auto: auto,
    p_flagged: flagged,
  });
}

export async function lookupResult(phone: string, code: string) {
  return call<{
    ok: true;
    name: string;
    subject: string;
    score: number;
    total: number;
    created_at: string;
  }>("lookup_result", { p_phone: phone, p_code: code });
}

export type LeaderboardRow = {
  id: string;
  name: string;
  subject: string;
  score: number;
  total: number;
  created_at?: string;
};

export async function getLeaderboard(limit = 10) {
  return call<{ enabled: boolean; rows: LeaderboardRow[] }>("get_leaderboard", {
    p_limit: limit,
  });
}
