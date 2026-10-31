// Typed wrappers around the server-side exam functions created in 02_stage_a_additive.sql.
// The browser never sees answer keys and never computes scores: it only sends answers and
// receives results from these functions.
import { supabase } from "./supabase";
import { getExamSettings, getFeatureFlags } from "./platformConfig";

export type Option = "A" | "B" | "C" | "D" | "E";
export type ApiError = { ok: false; error: string; message: string };
export type PublicSettings = {
  mock_enabled: boolean;
  calculator_enabled: boolean;
  show_results: boolean;
  leaderboard_enabled: boolean;
  exam_duration: number;
  access_code_required: boolean;
  show_marks_in_exam?: boolean;
  show_topic_in_exam?: boolean;
  allow_corrections?: boolean;
  result_notifications?: boolean;
  chief_proctor_name?: string;
  chief_proctor_title?: string;
};
export type PaperQuestion = {
  id: number;
  subject: string;
  section: string;
  category: string | null;
  topic?: string | null;
  subtopic?: string | null;
  passage_id: string | null;
  passage_title: string | null;
  passage_text: string | null;
  reading_text_id?: string | null;
  question: string;
  question_image_url: string | null;
  question_image_alt: string | null;
  option_a: string | null;
  option_a_image_url: string | null;
  option_a_image_alt: string | null;
  option_b: string | null;
  option_b_image_url: string | null;
  option_b_image_alt: string | null;
  option_c: string | null;
  option_c_image_url: string | null;
  option_c_image_alt: string | null;
  option_d: string | null;
  option_d_image_url: string | null;
  option_d_image_alt: string | null;
  option_e?: string | null;
  option_e_image_url?: string | null;
  option_e_image_alt?: string | null;
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
  subjects?: string[];
};
export type ResultItem = {
  id: string;
  subject: string;
  type?: string;
  text: string;
  options: Record<Option, string>;
  optionImages?: Partial<Record<Option, string | null>>;
  optionImageAlts?: Partial<Record<Option, string>>;
  questionImageUrl?: string | null;
  questionImageAlt?: string;
  correctAnswer: Option;
  explanation: string;
  explanationImageUrl?: string | null;
  explanationImageAlt?: string;
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
  items?: ResultItem[];
};
export type CorrectionsPayload =
  | { ok: true; items: ResultItem[] }
  | ApiError;

const NETWORK_ERROR: ApiError = {
  ok: false,
  error: "network",
  message: "Could not reach the server. Check your connection and try again.",
};

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T | ApiError> {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) return { ok: false, error: "rpc_error", message: error.message || NETWORK_ERROR.message };
    return data as T | ApiError;
  } catch {
    return NETWORK_ERROR;
  }
}

export function isError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false;
}

let cachedPublicSettings: { data: PublicSettings; timestamp: number } | null = null;
const SETTINGS_CACHE_TTL_MS = 3 * 60 * 1000;

export async function getPublicSettings(forceRefresh = false): Promise<PublicSettings | null> {
  // Official result slips must bypass cached signatory details.
  if (forceRefresh) {
    cachedPublicSettings = null;
    if (typeof window !== "undefined") {
      try { window.sessionStorage.removeItem("brainlab_public_settings_cache"); } catch {}
    }
  }

  // 1. In-memory fast cache
  if (!forceRefresh && cachedPublicSettings && Date.now() - cachedPublicSettings.timestamp < SETTINGS_CACHE_TTL_MS) {
    return cachedPublicSettings.data;
  }

  // 2. SessionStorage cache for instant transitions between pages
  if (!forceRefresh && typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem("brainlab_public_settings_cache");
      if (stored) {
        const parsed = JSON.parse(stored) as { data: PublicSettings; timestamp: number };
        if (parsed?.data && Date.now() - parsed.timestamp < SETTINGS_CACHE_TTL_MS) {
          cachedPublicSettings = parsed;
          return parsed.data;
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }

  let rpcRes: Partial<PublicSettings> | null = null;
  try {
    const res = await call<PublicSettings>("get_public_settings");
    if (!isError(res) && res) rpcRes = res;
  } catch {}

  let resolved: PublicSettings;
  try {
    const [examSettings, flags] = await Promise.all([getExamSettings(), getFeatureFlags()]);
    resolved = {
      mock_enabled: rpcRes?.mock_enabled ?? flags.mock_exams,
      calculator_enabled: (rpcRes?.calculator_enabled ?? flags.calculator_enabled) !== false,
      show_results: rpcRes?.show_results ?? examSettings.show_results_immediately,
      leaderboard_enabled: rpcRes?.leaderboard_enabled ?? flags.public_leaderboard,
      exam_duration: (rpcRes?.exam_duration && rpcRes.exam_duration > 0) ? rpcRes.exam_duration : examSettings.exam_duration_seconds,
      access_code_required: rpcRes?.access_code_required ?? true,
      show_marks_in_exam: examSettings.show_marks_in_exam !== false,
      show_topic_in_exam: examSettings.show_topic_in_exam !== false,
      allow_corrections: examSettings.allow_corrections !== false,
      result_notifications: examSettings.result_notifications !== false,
      chief_proctor_name: examSettings.chief_proctor_name?.trim() || "Chief Examination Proctor",
      chief_proctor_title: examSettings.chief_proctor_title?.trim() || "Chief Examination Proctor",
    };
  } catch {
    resolved = {
      mock_enabled: rpcRes?.mock_enabled ?? true,
      calculator_enabled: (rpcRes?.calculator_enabled) !== false,
      show_results: rpcRes?.show_results ?? true,
      leaderboard_enabled: rpcRes?.leaderboard_enabled ?? true,
      exam_duration: (rpcRes?.exam_duration && rpcRes.exam_duration > 0) ? rpcRes.exam_duration : 7200,
      access_code_required: rpcRes?.access_code_required ?? true,
      show_marks_in_exam: true,
      show_topic_in_exam: true,
      allow_corrections: true,
      result_notifications: true,
      chief_proctor_name: "Chief Examination Proctor",
      chief_proctor_title: "Chief Examination Proctor",
    };
  }

  // Cache resolved settings
  cachedPublicSettings = { data: resolved, timestamp: Date.now() };
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("brainlab_public_settings_cache", JSON.stringify(cachedPublicSettings));
    } catch {
      // Ignore quota errors
    }
  }

  return resolved;
}

export async function checkAccessCode(code: string, phone: string) {
  return call<{ ok: true; type: "master" | "normal" | "none" }>("check_access_code", { p_code: code, p_phone: phone });
}

export async function startExam(
  code: string,
  name: string,
  phone: string,
  elective: string,
  subjects?: string[]
): Promise<AttemptPayload | ApiError> {
  try {
    const res = await fetch("/api/exam/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, phone, elective, subjects }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      return {
        ok: false as const,
        error: data.error || "start_failed",
        message: data.message || "Failed to start exam.",
      };
    }
    return data as AttemptPayload;
  } catch {
    return call<AttemptPayload>("start_exam", { p_code: code, p_name: name, p_phone: phone, p_elective: elective });
  }
}

export async function resumeExam(sessionId: string, token: string) {
  return call<AttemptPayload | FinishedPayload>("resume_exam", { p_session: sessionId, p_token: token });
}

export async function saveProgress(sessionId: string, token: string, answers: Record<string, Option>) {
  return call<{ ok: true; time_left_seconds: number }>("save_progress", { p_session: sessionId, p_token: token, p_answers: answers });
}

export async function recordTabSwitch(sessionId: string, token: string) {
  return call<{ ok: true; tab_switch_count: number; time_left_seconds: number }>("record_tab_switch", { p_session: sessionId, p_token: token });
}

export async function submitExam(
  sessionId: string,
  token: string,
  answers: Record<string, Option>,
  auto: boolean,
  flagged: Record<string, boolean>
): Promise<FinishedPayload | ApiError> {
  // 1. Fast server route handler first (server-to-server low latency + recovery)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const res = await fetch("/api/exam/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, token, answers, auto, flagged }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object" && data.ok) {
        return data as FinishedPayload;
      }
    }
  } catch (e) {
    console.warn("[examApi] /api/exam/submit failed or timed out, falling back to direct RPC:", e);
  }

  // 2. Direct Supabase RPC fallback
  return call<FinishedPayload>("submit_exam", { p_session: sessionId, p_token: token, p_answers: answers, p_auto: auto, p_flagged: flagged });
}

export async function lookupResult(phone: string, code: string) {
  return call<{ ok: true; name: string; subject: string; score: number; total: number; created_at: string }>("lookup_result", { p_phone: phone, p_code: code });
}

export async function getResultCorrections(resultId: string): Promise<CorrectionsPayload> {
  return call<CorrectionsPayload>("get_result_corrections", { p_result_id: resultId });
}

export type LeaderboardRow = { id: string; name: string; subject: string; score: number; total: number; created_at?: string };

export async function getLeaderboard(limit = 10) {
  return call<{ enabled: boolean; rows: LeaderboardRow[] }>("get_leaderboard", { p_limit: limit });
}
