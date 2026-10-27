// Blueprints configuration and loader for BrainLab CBT Engine
import { ExamBlueprint } from "./types";
import { getSupabaseServerClient } from "../supabaseServer";

export const OFFICIAL_UTME_ENGLISH_BLUEPRINT: ExamBlueprint = {
  id: "utme_english_60",
  name: "Official UTME English Section-Aware Blueprint",
  subject: "English",
  total_questions: 60,
  raw_max_marks: 90,
  converted_max_marks: 100,
  score_conversion_formula: "english_90_to_100",
  sections_config: [
    {
      section: "Comprehension",
      quota: 5,
      marks_per_question: 3,
      raw_total: 15,
      passage_required: true,
      matching_categories: ["Comprehension passages", "Comprehension", "Reading comprehension"],
      description: "Extracting main ideas, tone, author intention, inferences and vocabulary in context.",
    },
    {
      section: "Cloze passage",
      quota: 10,
      marks_per_question: 2,
      raw_total: 20,
      passage_required: true,
      matching_categories: ["Cloze passage", "Cloze", "Grammar in Context", "Registers"],
      description: "Tested in unified blanks within structured contextual passages.",
    },
    {
      section: "Reading text",
      quota: 10,
      marks_per_question: 1,
      raw_total: 10,
      reading_text_id: "lekki_headmaster",
      matching_categories: ["Literature text - Lekki headmaster", "Lekki headmaster", "Literature text", "Prescribed text"],
      description: "Official prescribed novel: 'The Lekki Headmaster' by Kabir Alabi Garba.",
    },
    {
      section: "Sentence interpretation",
      quota: 5,
      marks_per_question: 2,
      raw_total: 10,
      matching_categories: ["Sentence Interpretation", "Interpretation", "Idioms and Figurative Usage"],
      description: "Discerning underlying meaning, idiomatic interpretations and figurative nuances.",
    },
    {
      section: "Antonyms",
      quota: 5,
      marks_per_question: 2,
      raw_total: 10,
      matching_categories: ["Antonyms", "Words opposite in meaning"],
      description: "Selecting words or phrases most nearly opposite in meaning.",
    },
    {
      section: "Synonyms",
      quota: 5,
      marks_per_question: 1,
      raw_total: 5,
      matching_categories: ["Synonyms", "Words nearest in meaning"],
      description: "Selecting words or phrases most nearly identical in meaning.",
    },
    {
      section: "Sentence completion",
      quota: 10,
      marks_per_question: 1,
      raw_total: 10,
      matching_categories: [
        "Sentence Completion",
        "Concord and Agreement",
        "Tense, Aspect and Mood",
        "Question Tags",
        "Clauses, Phrases and Sentence Patterns",
        "Punctuation",
        "Spelling",
        "Word Classes and Functions",
        "Homonyms and Confusables",
      ],
      description: "Standard structural English, grammatical agreement, prepositions and syntax.",
    },
    {
      section: "Oral forms",
      quota: 10,
      marks_per_question: 1,
      raw_total: 10,
      matching_categories: [
        "Oral English: Vowels",
        "Oral English: Consonants",
        "Oral English: Rhymes and Homophones",
        "Oral English: Stress",
        "Oral English: Intonation and Emphatic Stress",
        "Oral forms",
        "Phonetics",
      ],
      description: "Vowels, consonants, rhymes, syllables, word stress and emphatic intonation.",
    },
  ],
  reading_text_config: {
    active_text_id: "lekki_headmaster",
    active_title: "The Lekki Headmaster",
    question_quota: 10,
    deferred_texts: ["life_changer"],
  },
  topic_coverage_rule: {
    strategy: "maximise_distinct",
    min_per_topic: 1,
    max_per_topic: 4,
  },
  is_active: true,
  version: 1,
};

export const OFFICIAL_STANDARD_SUBJECT_BLUEPRINT: ExamBlueprint = {
  id: "utme_standard_40",
  name: "Official UTME Standard Elective Blueprint",
  subject: "General",
  total_questions: 40,
  raw_max_marks: 100,
  converted_max_marks: 100,
  score_conversion_formula: "direct",
  sections_config: [
    {
      section: "objective",
      quota: 40,
      marks_per_question: 2.5,
      raw_total: 100,
      description: "Broad-curriculum objective assessment distributed across syllabus topics.",
    },
  ],
  topic_coverage_rule: {
    strategy: "maximise_distinct",
    min_per_topic: 1,
    max_per_topic: 5,
  },
  is_active: true,
  version: 1,
};

// Validates that blueprint section totals and raw max marks strictly reconcile
export function validateBlueprint(blueprint: ExamBlueprint): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  let calcQuestions = 0;
  let calcRawMarks = 0;

  for (const s of blueprint.sections_config) {
    if (s.quota <= 0) {
      errors.push(`Section '${s.section}' has invalid quota: ${s.quota}`);
    }
    if (s.marks_per_question <= 0) {
      errors.push(`Section '${s.section}' has invalid marks per question: ${s.marks_per_question}`);
    }
    const expectedRaw = s.quota * s.marks_per_question;
    if (Math.abs(s.raw_total - expectedRaw) > 0.001) {
      errors.push(
        `Section '${s.section}' raw total mismatch: declared ${s.raw_total}, calculated ${expectedRaw}`
      );
    }
    calcQuestions += s.quota;
    calcRawMarks += expectedRaw;
  }

  if (calcQuestions !== blueprint.total_questions) {
    errors.push(
      `Blueprint question count mismatch: sum of sections is ${calcQuestions}, but total_questions is ${blueprint.total_questions}`
    );
  }

  if (Math.abs(calcRawMarks - blueprint.raw_max_marks) > 0.001) {
    errors.push(
      `Blueprint raw marks mismatch: sum of sections is ${calcRawMarks}, but raw_max_marks is ${blueprint.raw_max_marks}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function loadBlueprintForSubject(subject: string): Promise<ExamBlueprint> {
  const isEnglish = subject.toLowerCase().includes("english");
  const targetId = isEnglish ? "utme_english_60" : "utme_standard_40";

  try {
    const supabase = getSupabaseServerClient();
    // 1. Try dedicated table first if available
    const { data: dbBlueprint } = await supabase
      .from("exam_blueprints")
      .select("*")
      .eq("id", targetId)
      .maybeSingle();

    if (dbBlueprint && dbBlueprint.sections_config) {
      const parsed: ExamBlueprint = {
        id: dbBlueprint.id,
        name: dbBlueprint.name,
        subject: dbBlueprint.subject,
        total_questions: dbBlueprint.total_questions,
        raw_max_marks: Number(dbBlueprint.raw_max_marks),
        converted_max_marks: Number(dbBlueprint.converted_max_marks || 100),
        score_conversion_formula: dbBlueprint.score_conversion_formula,
        sections_config: dbBlueprint.sections_config,
        reading_text_config: dbBlueprint.reading_text_config,
        topic_coverage_rule: dbBlueprint.topic_coverage_rule,
        is_active: dbBlueprint.is_active,
        version: dbBlueprint.version || 1,
      };
      const validation = validateBlueprint(parsed);
      if (validation.valid) return parsed;
    }

    // 2. Try exam_config key-value store
    const configKey = isEnglish ? "blueprint_utme_english" : "blueprint_utme_standard";
    const { data: configRow } = await supabase
      .from("exam_config")
      .select("config_value")
      .eq("config_key", configKey)
      .maybeSingle();

    if (configRow?.config_value) {
      const parsed = configRow.config_value as ExamBlueprint;
      const validation = validateBlueprint(parsed);
      if (validation.valid) return parsed;
    }
  } catch (err) {
    console.warn("Could not load dynamic blueprint from database, using verified fallback:", err);
  }

  // Authoritative in-memory blueprint guaranteed to validate
  return isEnglish ? OFFICIAL_UTME_ENGLISH_BLUEPRINT : OFFICIAL_STANDARD_SUBJECT_BLUEPRINT;
}

export async function saveBlueprint(blueprint: ExamBlueprint): Promise<{ ok: boolean; message?: string }> {
  const validation = validateBlueprint(blueprint);
  if (!validation.valid) {
    return { ok: false, message: `Invalid blueprint: ${validation.errors.join("; ")}` };
  }

  try {
    const supabase = getSupabaseServerClient();
    const isEnglish = blueprint.subject.toLowerCase().includes("english");
    const configKey = isEnglish ? "blueprint_utme_english" : "blueprint_utme_standard";

    // Persist in exam_config
    await supabase.from("exam_config").upsert(
      {
        config_key: configKey,
        config_value: blueprint,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "config_key" }
    );

    // Also attempt to upsert into dedicated table if it exists
    await supabase.from("exam_blueprints").upsert(
      {
        id: blueprint.id,
        name: blueprint.name,
        subject: blueprint.subject,
        total_questions: blueprint.total_questions,
        raw_max_marks: blueprint.raw_max_marks,
        converted_max_marks: blueprint.converted_max_marks,
        score_conversion_formula: blueprint.score_conversion_formula,
        sections_config: blueprint.sections_config,
        reading_text_config: blueprint.reading_text_config,
        topic_coverage_rule: blueprint.topic_coverage_rule,
        is_active: blueprint.is_active,
        version: blueprint.version + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to persist blueprint." };
  }
}
