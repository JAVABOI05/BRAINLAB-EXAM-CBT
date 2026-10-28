// Master Entry Point for BrainLab CBT Engine
// Exports unified API for paper generation, randomisation, marking, snapshots,
// high-yield management, and duplicate intelligence.

import { loadBlueprintForSubject } from "./blueprints";
import { selectEnglishExaminationPaper } from "./englishSelector";
import { listHighYieldRules } from "./highYieldManager";
import { markExamAttempt } from "./markingEngine";
import { freezeAttemptSnapshot } from "./snapshotManager";
import { selectStandardSubjectPaper } from "./subjectSelector";
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
}): Promise<GeneratePaperResult> {
  const { sessionId, token, durationSeconds = 7200 } = options;
  const warnings: string[] = [];
  const errors: string[] = [];

  const supabase = getSupabaseServerClient();

  // 1. Normalise subjects list (English is always compulsory Slot 1)
  const incomingSubjects = options.subjects || [];
  const nonEnglish = incomingSubjects.filter((s) => !s.toLowerCase().includes("english"));
  const chosenSubjects = ["English", ...nonEnglish.slice(0, 3)];

  // Fill up to 4 subjects if candidate provided fewer
  const defaultFillers = ["Mathematics", "Physics", "Chemistry", "Biology"];
  while (chosenSubjects.length < 4) {
    const filler = defaultFillers.find((f) => !chosenSubjects.includes(f)) || "Mathematics";
    chosenSubjects.push(filler);
  }

  // 2. Fetch high-yield rules & questions concurrently across all 4 subjects
  const allPaperQuestions: EngineQuestion[] = [];
  const paperIds: number[] = [];

  const allHighYield = await listHighYieldRules();

  // Run all subject generations in parallel for maximum performance
  const subjectPromises = chosenSubjects.map(async (subj) => {
    const isEnglish = subj.toLowerCase().includes("english");
    const [blueprint, { data: dbRows, error: fetchErr }] = await Promise.all([
      loadBlueprintForSubject(subj),
      supabase
        .from("questions")
        .select("*")
        .eq("is_active", true)
        .ilike("subject", isEnglish ? "English" : subj)
        .limit(600),
    ]);

    if (fetchErr) {
      return {
        subj,
        questions: [] as EngineQuestion[],
        warnings: [] as string[],
        errors: [`Error querying question bank for ${subj}: ${fetchErr.message}`],
      };
    }

    const available = (dbRows || []) as EngineQuestion[];

    if (isEnglish) {
      const engResult = selectEnglishExaminationPaper(available, blueprint, allHighYield);
      return {
        subj,
        questions: engResult.questions,
        warnings: engResult.warnings,
        errors: engResult.errors,
      };
    } else {
      const stdResult = selectStandardSubjectPaper(subj, available, blueprint, allHighYield);
      return {
        subj,
        questions: stdResult.questions,
        warnings: stdResult.warnings,
        errors: stdResult.errors,
      };
    }
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
