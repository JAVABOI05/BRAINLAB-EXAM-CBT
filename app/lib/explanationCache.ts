import "server-only";

import crypto from "crypto";
import { getSupabaseServerClient } from "./supabaseServer";

export function computeQuestionFingerprint(
  questionText: string,
  options: Record<string, string>,
  correctAnswer: string
): string {
  const normText = (questionText || "").trim().toLowerCase().replace(/\s+/g, " ");
  const normOptions = Object.keys(options || {})
    .sort()
    .map((k) => `${k}:${(options[k] || "").trim().toLowerCase().replace(/\s+/g, " ")}`)
    .join("|");
  const normAns = (correctAnswer || "").trim().toUpperCase();
  const raw = `${normText}#${normOptions}#${normAns}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export interface CachedExplanationResult {
  explanation: string;
  model: string;
  cachedAt: string;
  verified: boolean;
  fingerprint: string;
}

/**
 * Looks up a previously generated and saved explanation from Supabase.
 * Checks both `question_explanations` table and `ai_generations` shared cache.
 */
export async function getCachedExplanation(
  questionId: string | number,
  fingerprint?: string
): Promise<CachedExplanationResult | null> {
  const qIdStr = String(questionId).trim();
  if (!qIdStr) return null;

  const supabase = getSupabaseServerClient();

  // 1. Try dedicated `question_explanations` table first
  try {
    const { data, error } = await supabase
      .from("question_explanations")
      .select("explanation, model, fingerprint, verified, updated_at, created_at")
      .eq("question_id", qIdStr)
      .maybeSingle();

    if (!error && data) {
      if (!fingerprint || data.fingerprint === fingerprint) {
        return {
          explanation: data.explanation,
          model: data.model,
          cachedAt: data.updated_at || data.created_at,
          verified: data.verified ?? true,
          fingerprint: data.fingerprint,
        };
      }
    }
  } catch {
    // Table may not be migrated yet, fall through to ai_generations
  }

  // 2. Try shared `ai_generations` table with metadata lookup
  try {
    const { data: genData, error: genError } = await supabase
      .from("ai_generations")
      .select("response, model, metadata, created_at")
      .eq("metadata->>question_id", qIdStr)
      .eq("metadata->>cache_type", "standard_question_explanation")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!genError && genData && genData.length > 0) {
      const row = genData[0];
      const rowMeta = (row.metadata as Record<string, unknown>) || {};
      const rowFingerprint = String(rowMeta.fingerprint || "");

      if (!fingerprint || !rowFingerprint || rowFingerprint === fingerprint) {
        return {
          explanation: row.response,
          model: row.model,
          cachedAt: row.created_at,
          verified: Boolean(rowMeta.verified ?? true),
          fingerprint: rowFingerprint,
        };
      }
    }
  } catch (err) {
    console.warn("[explanationCache] Cache lookup warning:", err);
  }

  return null;
}

/**
 * Saves an AI-generated explanation to Supabase cache for reuse by all learners.
 */
export async function setCachedExplanation(params: {
  questionId: string | number;
  subject: string;
  questionText: string;
  options: Record<string, string>;
  correctAnswer: string;
  explanation: string;
  model: string;
  fingerprint?: string;
}): Promise<void> {
  const qIdStr = String(params.questionId).trim();
  if (!qIdStr || !params.explanation) return;

  const fingerprint =
    params.fingerprint ||
    computeQuestionFingerprint(params.questionText, params.options, params.correctAnswer);

  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();

  // 1. Save to `question_explanations` if table exists
  try {
    await supabase.from("question_explanations").upsert(
      {
        question_id: qIdStr,
        subject: params.subject,
        fingerprint,
        explanation: params.explanation,
        model: params.model,
        prompt_version: "v1",
        verified: true,
        updated_at: now,
      },
      { onConflict: "question_id" }
    );
  } catch {
    // If table not yet created, proceed to ai_generations
  }

  // 2. Always persist to `ai_generations` as shared record
  try {
    await supabase.from("ai_generations").insert([
      {
        user_id: null, // Shared across all learners
        prompt: `Standard explanation for question ${qIdStr} (${params.subject})`,
        response: params.explanation,
        model: params.model,
        metadata: {
          cache_type: "standard_question_explanation",
          question_id: qIdStr,
          subject: params.subject,
          fingerprint,
          prompt_version: "v1",
          verified: true,
          cached_at: now,
        },
        created_at: now,
      },
    ]);
  } catch (genErr) {
    console.warn("[explanationCache] Failed to save shared cache in ai_generations:", genErr);
  }
}
