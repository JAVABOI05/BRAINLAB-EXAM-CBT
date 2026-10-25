import { supabase } from "./supabase";

export type ConfidenceLevel = "struggling" | "learning" | "proficient" | "mastered";

export interface TopicMastery {
  subject: string;
  category: string;
  totalAttempted: number;
  totalCorrect: number;
  masteryScore: number; // 0.0 to 1.0
  confidenceLevel: ConfidenceLevel;
  lastPracticedAt: string;
}

export interface ExamReadiness {
  predictedJambScore: number; // out of 400
  predictedWaecPercent: number; // out of 100%
  subjectBreakdown: Record<string, { score: number; max: number; mastery: number }>;
  weakestTopics: { subject: string; category: string; mastery: number }[];
  strongestTopics: { subject: string; category: string; mastery: number }[];
  overallConfidence: ConfidenceLevel;
}

const LOCAL_STORAGE_MASTERY_KEY = "brainlab_adaptive_mastery_v1";

/**
 * Loads topic mastery records for the user. First checks local cache for instant zero-latency
 * rendering, then synchronizes with Supabase.
 */
export async function getTopicMasteryRecords(): Promise<TopicMastery[]> {
  let localData: TopicMastery[] = [];
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_MASTERY_KEY) : null;
    if (raw) {
      localData = JSON.parse(raw);
    }
  } catch {}

  try {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (!sessionData?.session?.user?.id) {
      return localData;
    }

    const { data, error } = await supabase
      .from("learner_topic_mastery")
      .select("subject, category, total_attempted, total_correct, mastery_score, confidence_level, last_practiced_at")
      .order("mastery_score", { ascending: true });

    if (!error && Array.isArray(data)) {
      const remoteData: TopicMastery[] = data.map((row) => ({
        subject: row.subject,
        category: row.category,
        totalAttempted: row.total_attempted,
        totalCorrect: row.total_correct,
        masteryScore: Number(row.mastery_score),
        confidenceLevel: row.confidence_level as ConfidenceLevel,
        lastPracticedAt: row.last_practiced_at,
      }));

      // Cache locally
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(LOCAL_STORAGE_MASTERY_KEY, JSON.stringify(remoteData));
        } catch {}
      }
      return remoteData;
    }
  } catch {
    // Return local cache on network drop
  }

  return localData;
}

/**
 * Records an attempt outcome (correct or wrong) for a given subject and topic category.
 * Dynamically updates the mastery score, confidence level, and local mirror.
 */
export async function recordTopicAttempt(
  subject: string,
  category: string,
  isCorrect: boolean,
  hesitationSec: number = 0
): Promise<TopicMastery> {
  const normSubject = subject.trim();
  const normCategory = (category || "General Concept").trim();

  // 1. Update local cache immediately
  let records: TopicMastery[] = [];
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_MASTERY_KEY) : null;
    if (raw) records = JSON.parse(raw);
  } catch {}

  const existing = records.find(
    (r) => r.subject.toLowerCase() === normSubject.toLowerCase() && r.category.toLowerCase() === normCategory.toLowerCase()
  );

  const attempted = (existing?.totalAttempted ?? 0) + 1;
  const correct = (existing?.totalCorrect ?? 0) + (isCorrect ? 1 : 0);
  
  let currentScore = existing?.masteryScore ?? 0.50;
  if (isCorrect) {
    currentScore = Math.min(1.0, currentScore + 0.08);
  } else {
    currentScore = Math.max(0.05, currentScore - 0.12);
  }

  let confidence: ConfidenceLevel = "learning";
  if (currentScore >= 0.85) confidence = "mastered";
  else if (currentScore >= 0.70) confidence = "proficient";
  else if (currentScore >= 0.40) confidence = "learning";
  else confidence = "struggling";

  const updated: TopicMastery = {
    subject: normSubject,
    category: normCategory,
    totalAttempted: attempted,
    totalCorrect: correct,
    masteryScore: Number(currentScore.toFixed(3)),
    confidenceLevel: confidence,
    lastPracticedAt: new Date().toISOString(),
  };

  const filtered = records.filter(
    (r) => !(r.subject.toLowerCase() === normSubject.toLowerCase() && r.category.toLowerCase() === normCategory.toLowerCase())
  );
  filtered.push(updated);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_MASTERY_KEY, JSON.stringify(filtered));
    } catch {}
  }

  // 2. Persist to Supabase if authenticated
  try {
    const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    if (sessionData?.session?.user?.id) {
      // Try RPC first
      const { error: rpcError } = await supabase.rpc("record_topic_mastery_attempt", {
        p_subject: normSubject,
        p_category: normCategory,
        p_is_correct: isCorrect,
        p_hesitation_sec: hesitationSec,
      });

      if (rpcError) {
        // Fallback to direct upsert
        await supabase.from("learner_topic_mastery").upsert(
          {
            user_id: sessionData.session.user.id,
            subject: normSubject,
            category: normCategory,
            total_attempted: attempted,
            total_correct: correct,
            mastery_score: updated.masteryScore,
            confidence_level: confidence,
            average_hesitation_sec: hesitationSec,
            last_practiced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,subject,category" }
        );
      }
    }
  } catch {}

  return updated;
}

/**
 * Computes an estimated examination readiness score (JAMB 400-point scale & WAEC percentage).
 */
export function calculateExamReadiness(masteryList: TopicMastery[]): ExamReadiness {
  if (!masteryList.length) {
    return {
      predictedJambScore: 200,
      predictedWaecPercent: 50,
      subjectBreakdown: {},
      weakestTopics: [],
      strongestTopics: [],
      overallConfidence: "learning",
    };
  }

  // Group by subject
  const subjects: Record<string, { totalScore: number; count: number }> = {};
  for (const m of masteryList) {
    if (!subjects[m.subject]) {
      subjects[m.subject] = { totalScore: 0, count: 0 };
    }
    subjects[m.subject].totalScore += m.masteryScore;
    subjects[m.subject].count += 1;
  }

  const subjectBreakdown: Record<string, { score: number; max: number; mastery: number }> = {};
  const subjectScores: number[] = [];

  for (const [subj, data] of Object.entries(subjects)) {
    const avgMastery = data.totalScore / data.count;
    // Jamb subject max is 100
    const jambSubjScore = Math.round(avgMastery * 100);
    subjectBreakdown[subj] = {
      score: jambSubjScore,
      max: 100,
      mastery: Number(avgMastery.toFixed(2)),
    };
    subjectScores.push(jambSubjScore);
  }

  // If candidate has fewer than 4 subjects, fill standard baseline
  while (subjectScores.length < 4) {
    subjectScores.push(50);
  }

  const predictedJambScore = Math.min(400, Math.max(80, subjectScores.slice(0, 4).reduce((a, b) => a + b, 0)));
  const predictedWaecPercent = Math.round((predictedJambScore / 400) * 100);

  // Weakest and strongest topics
  const sorted = [...masteryList].sort((a, b) => a.masteryScore - b.masteryScore);
  const weakestTopics = sorted.slice(0, 4).map((t) => ({
    subject: t.subject,
    category: t.category,
    mastery: t.masteryScore,
  }));
  const strongestTopics = sorted
    .filter((t) => t.masteryScore >= 0.70)
    .reverse()
    .slice(0, 4)
    .map((t) => ({
      subject: t.subject,
      category: t.category,
      mastery: t.masteryScore,
    }));

  let overallConfidence: ConfidenceLevel = "learning";
  if (predictedWaecPercent >= 80) overallConfidence = "mastered";
  else if (predictedWaecPercent >= 65) overallConfidence = "proficient";
  else if (predictedWaecPercent >= 45) overallConfidence = "learning";
  else overallConfidence = "struggling";

  return {
    predictedJambScore,
    predictedWaecPercent,
    subjectBreakdown,
    weakestTopics,
    strongestTopics,
    overallConfidence,
  };
}
