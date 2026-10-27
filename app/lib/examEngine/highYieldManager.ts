// High-Yield Topic Manager for BrainLab CBT
// Manages administrator high-yield quotas, priority ordering,
// live question-bank inventory counts, shortage warnings, and paper allocation rules.

import { EngineQuestion, HighYieldRule } from "./types";
import { getSupabaseServerClient } from "../supabaseServer";

export type TopicInventory = {
  topic: string;
  totalQuestions: number;
  activeQuestions: number;
  sections: string[];
};

export type ShortageWarning = {
  ruleId: string;
  subject: string;
  topic: string;
  requestedQuota: number;
  availableQuestions: number;
  severity: "critical" | "warning";
  message: string;
};

export async function listHighYieldRules(subject?: string): Promise<HighYieldRule[]> {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Check dedicated table
    const query = supabase.from("high_yield_topics").select("*");
    if (subject) query.eq("subject", subject);
    const { data: dbRows, error } = await query.order("priority", { ascending: true });

    if (!error && dbRows && dbRows.length > 0) {
      return dbRows.map((r) => ({
        id: r.id,
        subject: r.subject,
        blueprint_id: r.blueprint_id,
        topic: r.topic,
        section: r.section,
        quota: r.quota,
        priority: r.priority,
        min_questions: r.min_questions,
        max_questions: r.max_questions,
        isActive: r.is_active,
        notes: r.notes,
        created_at: r.created_at,
      }));
    }

    // 2. Fallback to exam_config key
    const { data: configRow } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", "cbt_high_yield_topics")
      .maybeSingle();

    if (configRow?.config_value && Array.isArray(configRow.config_value)) {
      const allRules = configRow.config_value as HighYieldRule[];
      return subject ? allRules.filter((r) => r.subject.toLowerCase() === subject.toLowerCase()) : allRules;
    }
  } catch (err) {
    console.warn("Could not fetch high-yield rules from DB:", err);
  }

  // Sensible default high-yield topics if none configured
  return getDefaultHighYieldRules(subject);
}

export function getDefaultHighYieldRules(subject?: string): HighYieldRule[] {
  const defaults: HighYieldRule[] = [
    // Mathematics
    {
      id: "math_calc",
      subject: "Mathematics",
      topic: "Calculus: Differentiation",
      quota: 5,
      priority: 1,
      min_questions: 3,
      max_questions: 7,
      isActive: true,
      notes: "High frequency UTME syllabus topic.",
    },
    {
      id: "math_indices",
      subject: "Mathematics",
      topic: "Indices, Logarithms and Surds",
      quota: 4,
      priority: 2,
      min_questions: 2,
      max_questions: 6,
      isActive: true,
      notes: "Core algebraic foundation topic.",
    },
    // Chemistry
    {
      id: "chem_organic",
      subject: "Chemistry",
      topic: "Organic Chemistry",
      quota: 6,
      priority: 1,
      min_questions: 4,
      max_questions: 8,
      isActive: true,
      notes: "Major weight in UTME Chemistry syllabus.",
    },
    // Physics
    {
      id: "phys_mechanics",
      subject: "Physics",
      topic: "Mechanics and Vectors",
      quota: 6,
      priority: 1,
      min_questions: 4,
      max_questions: 8,
      isActive: true,
      notes: "Highest question density topic in UTME Physics.",
    },
    // Biology
    {
      id: "bio_genetics",
      subject: "Biology",
      topic: "Genetics and Heredity",
      quota: 5,
      priority: 1,
      min_questions: 3,
      max_questions: 7,
      isActive: true,
      notes: "Mandatory conceptual domain in JAMB Biology.",
    },
  ];

  if (!subject) return defaults;
  return defaults.filter((r) => r.subject.toLowerCase() === subject.toLowerCase());
}

export async function saveHighYieldRule(rule: HighYieldRule): Promise<{ ok: boolean; message?: string }> {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Upsert dedicated table if available
    await supabase.from("high_yield_topics").upsert(
      {
        id: rule.id.length === 36 ? rule.id : undefined,
        subject: rule.subject,
        blueprint_id: rule.blueprint_id || "utme_standard_40",
        topic: rule.topic,
        section: rule.section,
        quota: rule.quota,
        priority: rule.priority,
        min_questions: rule.min_questions,
        max_questions: rule.max_questions,
        is_active: rule.is_active ?? rule.isActive ?? true,
        notes: rule.notes,
      },
      { onConflict: "id" }
    );

    // 2. Also update exam_config
    const existing = await listHighYieldRules();
    const updated = existing.filter((r) => r.id !== rule.id);
    updated.push(rule);

    await supabase.from("exam_config").upsert(
      {
        config_key: "cbt_high_yield_topics",
        config_value: updated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "config_key" }
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to save high yield rule." };
  }
}

export async function deleteHighYieldRule(ruleId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const supabase = getSupabaseServerClient();
    await supabase.from("high_yield_topics").delete().eq("id", ruleId);

    const existing = await listHighYieldRules();
    const updated = existing.filter((r) => r.id !== ruleId);

    await supabase.from("exam_config").upsert(
      {
        config_key: "cbt_high_yield_topics",
        config_value: updated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "config_key" }
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to delete rule." };
  }
}

/**
 * Inspects the question bank inventory for a subject and checks for shortages against active high-yield rules.
 */
export function checkHighYieldShortages(
  rules: HighYieldRule[],
  availableQuestions: EngineQuestion[],
  targetTotalQuestions: number = 40
): {
  warnings: ShortageWarning[];
  totalReserved: number;
} {
  const warnings: ShortageWarning[] = [];
  let totalReserved = 0;

  // Tally available questions by topic / category
  const topicCounts = new Map<string, number>();
  for (const q of availableQuestions) {
    const topic = (q.topic || q.category || "Unassigned").trim();
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  }

  for (const rule of rules) {
    if (!rule.isActive) continue;

    const available = topicCounts.get(rule.topic.trim()) || 0;
    totalReserved += rule.quota;

    if (available === 0) {
      warnings.push({
        ruleId: rule.id,
        subject: rule.subject,
        topic: rule.topic,
        requestedQuota: rule.quota,
        availableQuestions: 0,
        severity: "critical",
        message: `Topic '${rule.topic}' has 0 active questions in the question bank. Cannot satisfy quota of ${rule.quota}.`,
      });
    } else if (available < rule.quota) {
      warnings.push({
        ruleId: rule.id,
        subject: rule.subject,
        topic: rule.topic,
        requestedQuota: rule.quota,
        availableQuestions: available,
        severity: "warning",
        message: `Topic '${rule.topic}' only has ${available} active questions (quota asks for ${rule.quota}). Will select all ${available}.`,
      });
    }
  }

  if (totalReserved > targetTotalQuestions) {
    warnings.push({
      ruleId: "overflow",
      subject: rules[0]?.subject || "General",
      topic: "Total High-Yield Reservation",
      requestedQuota: totalReserved,
      availableQuestions: targetTotalQuestions,
      severity: "critical",
      message: `Total high-yield quotas (${totalReserved} questions) exceed the examination paper capacity of ${targetTotalQuestions} questions.`,
    });
  }

  return { warnings, totalReserved };
}
