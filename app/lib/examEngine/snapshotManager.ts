// Immutable Attempt Snapshot Manager for BrainLab CBT
// Freezes question order, options, marks, blueprint rules, and passage associations
// so that later edits, duplicate cleanups, or blueprint tweaks never alter active or completed attempts.

import { AttemptSnapshot, EngineQuestion, ExamConversionFormula } from "./types";
import { getSupabaseServerClient } from "../supabaseServer";

export async function freezeAttemptSnapshot(
  sessionId: string,
  blueprintId: string,
  blueprintVersion: number,
  paperIds: number[],
  subjects: string[],
  questions: EngineQuestion[],
  conversionFormula: ExamConversionFormula = "direct"
): Promise<AttemptSnapshot> {
  const questionMarks: Record<number, number> = {};
  const subjectBlueprints: AttemptSnapshot["marking_rules"]["subject_blueprints"] = {};

  let aggregateRawMax = 0;

  for (const q of questions) {
    const marks = q.marks > 0 ? q.marks : (q.subject.toLowerCase().includes("english") ? 1 : 2.5);
    questionMarks[q.id] = marks;
    aggregateRawMax += marks;
  }

  for (const subj of subjects) {
    const isEng = subj.toLowerCase().includes("english");
    subjectBlueprints[subj] = {
      conversion_formula: isEng ? "english_90_to_100" : "direct",
      raw_max_marks: isEng ? 90 : 100,
      converted_max_marks: 100,
      total_questions: isEng ? 60 : 40,
    };
  }

  const snapshot: AttemptSnapshot = {
    session_id: sessionId,
    blueprint_id: blueprintId,
    blueprint_version: blueprintVersion,
    paperIds: paperIds,
    subjects: subjects,
    questions_snapshot: questions,
    marking_rules: {
      conversion_formula: conversionFormula,
      raw_max_marks: aggregateRawMax,
      converted_max_marks: subjects.length * 100,
      subject_blueprints: subjectBlueprints,
      question_marks: questionMarks,
    },
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = getSupabaseServerClient();

    // 1. Attempt insert into dedicated table if available
    await supabase.from("exam_attempt_snapshots").insert({
      session_id: sessionId,
      blueprint_id: blueprintId,
      blueprint_version: blueprintVersion,
      paper_ids: paperIds,
      questions_snapshot: questions,
      marking_rules: snapshot.marking_rules,
    });

    // 2. Also persist in exam_config under attempt snapshot key for resilient fallback
    const configKey = `snapshot_${sessionId}`;
    await supabase.from("exam_config").upsert(
      {
        config_key: configKey,
        config_value: snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "config_key" }
    );
  } catch (err) {
    console.warn("Could not persist attempt snapshot to remote database:", err);
  }

  return snapshot;
}

export async function loadAttemptSnapshot(sessionId: string): Promise<AttemptSnapshot | null> {
  try {
    const supabase = getSupabaseServerClient();

    // 1. Check dedicated table
    const { data: dbRow } = await supabase
      .from("exam_attempt_snapshots")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (dbRow) {
      return {
        session_id: dbRow.session_id,
        blueprint_id: dbRow.blueprint_id,
        blueprint_version: dbRow.blueprint_version || 1,
        paperIds: dbRow.paper_ids || [],
        subjects: [],
        questions_snapshot: dbRow.questions_snapshot,
        marking_rules: dbRow.marking_rules,
        created_at: dbRow.created_at,
      };
    }

    // 2. Check exam_config key-value fallback
    const configKey = `snapshot_${sessionId}`;
    const { data: configRow } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", configKey)
      .maybeSingle();

    if (configRow?.config_value) {
      return configRow.config_value as AttemptSnapshot;
    }
  } catch (err) {
    console.warn("Could not load attempt snapshot:", err);
  }

  return null;
}
