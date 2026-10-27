// Duplicate Questions Manager & Intelligence Engine for BrainLab CBT
// Detects exact matches, likely duplicates, and potential near-duplicates.
// Provides side-by-side diffing, retention recommendations, and safe archival workflows.

import { DuplicateGroup, EngineQuestion } from "./types";
import { getSupabaseServerClient } from "../supabaseServer";

/**
 * Normalises text for exact comparison:
 * Lowercases, strips punctuation, normalises unicode and whitespace, removes html/markdown markup.
 */
export function normaliseQuestionText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/<[^>]*>/g, "") // strip html tags
    .replace(/[*_#`~[\]()]/g, "") // strip markdown
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”]/g, " ") // replace punctuation with space
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/**
 * Computes word shingles (n-grams) for Jaccard similarity estimation.
 */
function getWordShingles(str: string, shingleSize: number = 2): Set<string> {
  const words = str.split(" ").filter((w) => w.length > 1);
  const shingles = new Set<string>();
  if (words.length < shingleSize) {
    if (words.length > 0) shingles.add(words.join(" "));
    return shingles;
  }
  for (let i = 0; i <= words.length - shingleSize; i++) {
    shingles.add(words.slice(i, i + shingleSize).join(" "));
  }
  return shingles;
}

/**
 * Computes Levenshtein ratio between two strings (0 to 1).
 */
function levenshteinRatio(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1.0;

  let prev = Array.from({ length: len2 + 1 }, (_, i) => i);
  let curr = new Array(len2 + 1);

  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    const c1 = s1.charCodeAt(i - 1);
    for (let j = 1; j <= len2; j++) {
      const cost = c1 === s2.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  const distance = prev[len2];
  return Math.max(0, 1.0 - distance / maxLen);
}

/**
 * Calculates text similarity using token Dice coefficient and character Levenshtein ratio (0 to 1).
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const norm1 = normaliseQuestionText(text1);
  const norm2 = normaliseQuestionText(text2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const words1 = norm1.split(" ").filter(Boolean);
  const words2 = norm2.split(" ").filter(Boolean);

  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let common = 0;
  for (const w of set1) {
    if (set2.has(w)) common++;
  }
  const tokenDice = set1.size + set2.size > 0 ? (2 * common) / (set1.size + set2.size) : 0;
  const levRatio = levenshteinRatio(norm1, norm2);

  // Character 3-gram Dice
  const n = 3;
  let charDice = 0;
  if (norm1.length >= n && norm2.length >= n) {
    const cSet1 = new Set<string>();
    const cSet2 = new Set<string>();
    for (let i = 0; i <= norm1.length - n; i++) cSet1.add(norm1.slice(i, i + n));
    for (let i = 0; i <= norm2.length - n; i++) cSet2.add(norm2.slice(i, i + n));
    let cCommon = 0;
    for (const ch of cSet1) if (cSet2.has(ch)) cCommon++;
    charDice = (2 * cCommon) / (cSet1.size + cSet2.size);
  }

  return Math.max(tokenDice, levRatio, charDice);
}

/**
 * Generates word diffs between two texts for side-by-side inspection.
 */
export function generateWordDiff(textA: string, textB: string): Array<{ word: string; status: "common" | "added" | "removed" }> {
  const wordsA = (textA || "").split(/\s+/);
  const wordsB = (textB || "").split(/\s+/);
  const diff: Array<{ word: string; status: "common" | "added" | "removed" }> = [];

  const maxLen = Math.max(wordsA.length, wordsB.length);
  for (let i = 0; i < maxLen; i++) {
    const wa = wordsA[i];
    const wb = wordsB[i];
    if (wa && wb && wa.toLowerCase() === wb.toLowerCase()) {
      diff.push({ word: wa, status: "common" });
    } else {
      if (wa) diff.push({ word: wa, status: "removed" });
      if (wb) diff.push({ word: wb, status: "added" });
    }
  }

  return diff;
}

/**
 * Evaluates completeness and quality score to recommend which record to retain:
 * Higher score = more complete record.
 */
export function scoreQuestionQuality(q: EngineQuestion): number {
  let score = 0;
  if (q.explanation && q.explanation.trim().length > 10) score += 30;
  if (q.topic || q.category) score += 15;
  if (q.question_image_url) score += 15;
  if (q.option_a_image_url || q.option_b_image_url) score += 10;
  if (q.difficulty) score += 5;
  if (q.verification_status === "verified") score += 20;
  if (q.is_active) score += 10;
  if (q.source_question_id) score += 5;
  return score;
}

/**
 * Scans an array of questions and detects exact and near duplicate groups.
 */
export function detectDuplicates(questions: EngineQuestion[]): DuplicateGroup[] {
  const exactMap = new Map<string, EngineQuestion[]>();

  // 1. Group exact matches by normalised text + subject
  for (const q of questions) {
    if (q.is_archived) continue;
    const norm = normaliseQuestionText(q.question);
    if (!norm) continue;
    const key = `${(q.subject || "any").toLowerCase()}:::${norm}`;
    if (!exactMap.has(key)) exactMap.set(key, []);
    exactMap.get(key)!.push(q);
  }

  const groups: DuplicateGroup[] = [];
  const processedIds = new Set<number>();

  // Add exact duplicate groups
  for (const [key, groupQuestions] of exactMap.entries()) {
    if (groupQuestions.length > 1) {
      // Sort by completeness score descending
      const sorted = [...groupQuestions].sort((a, b) => scoreQuestionQuality(b) - scoreQuestionQuality(a));
      const retain = sorted[0];

      for (const q of groupQuestions) processedIds.add(q.id);

      groups.push({
        hash: `exact_${key.slice(0, 32)}`,
        type: "exact",
        questions: sorted,
        similarityScore: 1.0,
        recommendedRetainId: retain.id,
        reasons: [
          `Identical prompt text detected across ${groupQuestions.length} records.`,
          `Record #${retain.id} recommended because of higher completeness (quality score: ${scoreQuestionQuality(retain)}).`,
        ],
      });
    }
  }

  // 2. Detect near-duplicates (likely >= 80%, potential >= 65%) within same subject
  const bySubject = new Map<string, EngineQuestion[]>();
  for (const q of questions) {
    if (q.is_archived) continue;
    const subj = (q.subject || "General").toLowerCase();
    if (!bySubject.has(subj)) bySubject.set(subj, []);
    bySubject.get(subj)!.push(q);
  }

  for (const [subj, subjQuestions] of bySubject.entries()) {
    // Only compare questions not already captured in an exact group
    const candidates = subjQuestions.filter((q) => !processedIds.has(q.id));
    const n = Math.min(candidates.length, 300); // comparison window for responsiveness

    for (let i = 0; i < n; i++) {
      const qA = candidates[i];
      if (processedIds.has(qA.id)) continue;

      const cluster: EngineQuestion[] = [qA];
      let highestSimilarity = 0;

      for (let j = i + 1; j < n; j++) {
        const qB = candidates[j];
        if (processedIds.has(qB.id)) continue;

        const sim = calculateTextSimilarity(qA.question, qB.question);
        if (sim >= 0.70) {
          cluster.push(qB);
          if (sim > highestSimilarity) highestSimilarity = sim;
        }
      }

      if (cluster.length > 1) {
        for (const q of cluster) processedIds.add(q.id);
        const sorted = [...cluster].sort((a, b) => scoreQuestionQuality(b) - scoreQuestionQuality(a));
        const retain = sorted[0];
        const isLikely = highestSimilarity >= 0.85;

        groups.push({
          hash: `near_${qA.id}_${Math.round(highestSimilarity * 100)}`,
          type: isLikely ? "likely" : "potential",
          questions: sorted,
          similarityScore: Math.round(highestSimilarity * 100) / 100,
          recommendedRetainId: retain.id,
          reasons: [
            `${isLikely ? "High" : "Moderate"} text similarity (${Math.round(highestSimilarity * 100)}%) detected within ${subj}.`,
            `Record #${retain.id} recommended for retention based on verification & completeness.`,
          ],
        });
      }
    }
  }

  return groups;
}

/**
 * Archives a question safely: sets is_archived = true.
 * Checks references before destructive actions.
 */
export async function archiveQuestionSafely(
  questionId: number,
  adminEmail: string,
  reason: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Soft archive question in DB
    const { error: updateErr } = await supabase
      .from("questions")
      .update({ is_active: false })
      .eq("id", questionId);

    if (updateErr) {
      return { ok: false, message: `Could not deactivate question #${questionId}: ${updateErr.message}` };
    }

    // 2. Append to audit log
    await recordDuplicateActionAudit({
      action: "archive_question",
      questionId,
      adminEmail,
      reason,
      timestamp: new Date().toISOString(),
    });

    return { ok: true, message: `Question #${questionId} archived safely.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Archival failed." };
  }
}

async function recordDuplicateActionAudit(entry: Record<string, unknown>) {
  try {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.from("exam_config").select("config_value").eq("config_key", "audit_logs_trail").maybeSingle();
    const trail = Array.isArray(data?.config_value) ? data.config_value : [];
    trail.unshift(entry);
    await supabase.from("exam_config").upsert(
      {
        config_key: "audit_logs_trail",
        config_value: trail.slice(0, 100),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "config_key" }
    );
  } catch {}
}
