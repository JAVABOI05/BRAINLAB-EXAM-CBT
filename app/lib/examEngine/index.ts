// Master Entry Point for BrainLab CBT Engine
// Exports unified API for paper generation, randomisation, marking, snapshots,
// high-yield management, and duplicate intelligence.

import { loadBlueprintForSubject } from "./blueprints";
import { selectEnglishExaminationPaper } from "./englishSelector";
import { listHighYieldRules } from "./highYieldManager";
import { markExamAttempt } from "./markingEngine";
import { freezeAttemptSnapshot } from "./snapshotManager";
import { selectStandardSubjectPaper } from "./subjectSelector";
import { resolveUtme4Subjects } from "./subjectResolver";
import { AttemptSnapshot, AuthoritativeMarkingResult, EngineQuestion, ExamBlueprint, OptionLetter } from "./types";
import { getSupabaseServerClient } from "../supabaseServer";

export * from "./types";
export * from "./blueprints";
export * from "./markingEngine";
export * from "./snapshotManager";
export * from "./highYieldManager";
export * from "./duplicateDetector";
export * from "./englishSelector";
export * from "./subjectSelector";
export * from "./subjectResolver";
export * from "../difficultyEngine";

export type GeneratePaperResult = {
  success: boolean;
  sessionId: string;
  token: string;
  durationSeconds: number;
  subjects: string[];
  paperIds: number[];
  clientQuestions: Omit<EngineQuestion, "correct_answer" | "explanation">[];
  snapshot: AttemptSnapshot;
  warnings: string[];
  errors: string[];
};

/**
 * High-level examination paper generation workflow:
 * 1. Validates candidates subjects (English is always compulsory Slot 1).
 * 2. Fetches active questions concurrently from DB.
 * 3. Applies multi-stage English blueprint (60 questions, 90 raw marks, passage integrity, reading text).
 * 4. Applies shared standard selector for electives (40 questions each, 100 marks, high-yield quotas).
 * 5. Assembles full 180-question paper (English 1..60, Elective 1 61..100, Elective 2 101..140, Elective 3 141..180).
 * 6. Freezes immutable snapshot.
 * 7. Returns safe client questions (zero answer key leakage).
 */
export async function generateExamPaper(options: {
  sessionId: string;
  token: string;
  subjects: string[];
  durationSeconds?: number;
  excludeQuestionIds?: number[];
}): Promise<GeneratePaperResult> {
  const { sessionId, token, durationSeconds = 7200 } = options;
  const excludedIds = new Set(options.excludeQuestionIds || []);
  const warnings: string[] = [];
  const errors: string[] = [];

  const supabase = getSupabaseServerClient();

  // 1. Authoritatively resolve the 4 UTME subjects using official curriculum rules
  const chosenSubjects = resolveUtme4Subjects({
    candidateSubjects: options.subjects,
  });

  // 2. Fetch high-yield rules & questions concurrently across all 4 subjects
  const allPaperQuestions: EngineQuestion[] = [];
  const paperIds: number[] = [];

  const allHighYield = await listHighYieldRules();

  // Run all subject generations in parallel for maximum performance
  const subjectPromises = chosenSubjects.map(async (subj) => {
    const isEnglish = subj.toLowerCase().includes("english");
    const [blueprint, questionPages] = await Promise.all([
      loadBlueprintForSubject(subj),
      (async () => {
        const rows: EngineQuestion[] = [];
        const pageSize = 1000;
        for (let offset = 0; offset < 10000; offset += pageSize) {
          const { data, error } = await supabase
            .from("questions")
            .select("*")
            .eq("is_active", true)
            .ilike("subject", isEnglish ? "English" : subj)
            .order("id", { ascending: true })
            .range(offset, offset + pageSize - 1);
          if (error) return { rows: [] as EngineQuestion[], error };
          const page = (data || []) as EngineQuestion[];
          rows.push(...page);
          if (page.length < pageSize) break;
        }
        return { rows, error: null };
      })(),
    ]);
    const fetchErr = questionPages.error;

    if (fetchErr) {
      return {
        subj,
        questions: [] as EngineQuestion[],
        warnings: [] as string[],
        errors: [`Error querying question bank for ${subj}: ${fetchErr.message}`],
      };
    }

    const available = questionPages.rows;
    const freshAvailable = excludedIds.size
      ? available.filter((question) => !excludedIds.has(question.id))
      : available;
    const runSelector = (pool: EngineQuestion[]) =>
      isEnglish
        ? selectEnglishExaminationPaper(pool, blueprint, allHighYield)
        : selectStandardSubjectPaper(subj, pool, blueprint, allHighYield);
    let selected = runSelector(freshAvailable);
    const targetCount = blueprint.total_questions || (isEnglish ? 60 : 40);
    const selectedQuestions = selected.questions || [];
    const selectionWarnings = [...(selected.warnings || [])];
    // If unseen questions cannot satisfy the existing blueprint, fall back to the
    // full eligible pool rather than breaking the mock or its scoring structure.
    if (excludedIds.size && (selected.errors.length > 0 || selectedQuestions.length < targetCount)) {
      selected = runSelector(available);
      selectionWarnings.push("Some previously seen questions were reused because the unseen pool could not satisfy the subject blueprint.");
    }
    return {
      subj,
      questions: selected.questions,
      warnings: selectionWarnings,
      errors: selected.errors,
    };
  });

  const subjectResults = await Promise.all(subjectPromises);

  for (const res of subjectResults) {
    warnings.push(...res.warnings);
    errors.push(...res.errors);
    for (const q of res.questions) {
      allPaperQuestions.push(q);
      paperIds.push(q.id);
    }
  }

  const expectedQuestionCount = 180;
  if (paperIds.length !== expectedQuestionCount) {
    errors.push(`Incomplete UTME paper: generated ${paperIds.length} unique questions; exactly ${expectedQuestionCount} are required (60 English + 40 for each of 3 electives).`);
  }
  if (new Set(paperIds).size !== paperIds.length) {
    errors.push("The generated UTME paper contains repeated question IDs.");
  }
  if (allPaperQuestions.length === 0) {
    errors.push("No examination questions could be assembled from the question bank.");
  }

  // 3. Freeze immutable attempt snapshot in database
  const snapshot = await freezeAttemptSnapshot(
    sessionId,
    "jamb_utme_full_mock",
    1,
    paperIds,
    chosenSubjects,
    allPaperQuestions,
    "english_90_to_100"
  );

  // 4. Strip answer keys and explanations before returning client payload (Security Boundary)
  const clientQuestions = allPaperQuestions.map((q) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { correct_answer, explanation, ...safeQuestion } = q;
    return safeQuestion;
  });

  return {
    success: errors.length === 0,
    sessionId,
    token,
    durationSeconds,
    subjects: chosenSubjects,
    paperIds,
    clientQuestions,
    snapshot,
    warnings,
    errors,
  };
}
