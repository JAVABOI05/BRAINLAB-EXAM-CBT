// Shared Randomisation Engine for All Standard UTME Subjects (Maths, Chemistry, Physics, Biology, etc.)
// Selects 40 questions per examination, allocating 2.5 marks per question (100 marks total),
// prioritising distinct-topic coverage across curriculum themes, and applying active high-yield quotas.

import { OFFICIAL_STANDARD_SUBJECT_BLUEPRINT } from "./blueprints";
import { EngineQuestion, ExamBlueprint, HighYieldRule } from "./types";
import {
  DifficultyAllocationResult,
  GenericEngineQuestion,
  selectQuestionsWithDifficultyModel,
} from "../difficultyEngine";

export type SubjectSelectionResult = {
  success: boolean;
  subject: string;
  questions: EngineQuestion[];
  totalMarks: number;
  distinctTopicsCovered: number;
  difficultyAllocation?: DifficultyAllocationResult;
  warnings: string[];
  errors: string[];
};

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function selectStandardSubjectPaper(
  subject: string,
  allSubjectQuestions: EngineQuestion[],
  blueprint: ExamBlueprint = OFFICIAL_STANDARD_SUBJECT_BLUEPRINT,
  highYieldRules: HighYieldRule[] = []
): SubjectSelectionResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const targetCount = blueprint.total_questions || 40;
  const marksPerQ = blueprint.sections_config[0]?.marks_per_question || 2.5;

  // 1. Filter active, non-archived questions with valid prompt and at least 2 options
  const eligible = allSubjectQuestions.filter((q) => {
    if (q.is_archived) return false;
    if (q.is_active === false) return false;
    if (!q.question || q.question.trim().length === 0) return false;
    const hasA = Boolean(q.option_a && q.option_a.trim());
    const hasB = Boolean(q.option_b && q.option_b.trim());
    if (!hasA || !hasB) return false;
    return true;
  });

  if (eligible.length < targetCount) {
    const message = `Subject '${subject}' has only ${eligible.length} eligible active questions; ${targetCount} are required. Add or activate more questions before starting this exam.`;
    errors.push(message);
    return {
      success: false,
      subject,
      questions: [],
      totalMarks: 0,
      distinctTopicsCovered: 0,
      warnings,
      errors,
    };
  }

  const selectedQuestions: EngineQuestion[] = [];
  const selectedIds = new Set<number>();

  // 2. Group available questions by topic / category
  const byTopic = new Map<string, EngineQuestion[]>();
  for (const q of eligible) {
    const topic = (q.topic || q.category || "General").trim();
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic)!.push(q);
  }

  // 3. Apply High-Yield Quotas first
  const subjectHighYield = highYieldRules.filter(
    (r) => (r.isActive || r.is_active) && r.subject.toLowerCase() === subject.toLowerCase()
  );

  // If blueprint specifies formal difficulty model slider position, execute multi-constraint solver
  if (blueprint.difficulty_slider !== undefined) {
    const diffRes = selectQuestionsWithDifficultyModel(eligible as unknown as GenericEngineQuestion[], {
      totalCount: targetCount,
      allocationMode: "slider",
      sliderPosition: blueprint.difficulty_slider,
      shortagePolicy: blueprint.difficulty_shortage_policy || "best_effort",
      highYieldTopics: subjectHighYield.map((h) => ({ topic: h.topic, quota: h.quota })),
      randomize: true,
    });

    warnings.push(...diffRes.warnings);
    errors.push(...diffRes.errors);

    const questionsWithMarks = diffRes.selectedQuestions.map((q) => ({
      ...(q as unknown as EngineQuestion),
      marks: marksPerQ,
    }));

    const totalMarks = questionsWithMarks.reduce((sum, q) => sum + (q.marks || marksPerQ), 0);
    const topicsCovered = new Set(questionsWithMarks.map((q) => (q.topic || q.category || "General").trim()));

    return {
      success: errors.length === 0,
      subject,
      questions: questionsWithMarks,
      totalMarks,
      distinctTopicsCovered: topicsCovered.size,
      difficultyAllocation: diffRes.allocationResult,
      warnings,
      errors,
    };
  }

  for (const hy of subjectHighYield) {
    if (selectedQuestions.length >= targetCount) break;

    const topicQuestions = byTopic.get(hy.topic) || [];
    const availableNotSelected = topicQuestions.filter((q) => !selectedIds.has(q.id));
    const toTake = Math.min(hy.quota, targetCount - selectedQuestions.length, availableNotSelected.length);

    if (toTake < hy.quota) {
      warnings.push(
        `High-yield topic '${hy.topic}' in ${subject} only provided ${toTake} questions (quota was ${hy.quota}).`
      );
    }

    const chosen = shuffle(availableNotSelected).slice(0, toTake);
    for (const q of chosen) {
      selectedIds.add(q.id);
      selectedQuestions.push({
        ...q,
        marks: marksPerQ,
      });
    }
  }

  // 4. Maximise Distinct Topic Coverage across curriculum
  // Round-robin selection across all remaining topics
  const topicsList = shuffle(Array.from(byTopic.keys()));
  let topicIdx = 0;
  let safetyLoop = 0;

  while (selectedQuestions.length < targetCount && topicsList.length > 0 && safetyLoop < 1000) {
    safetyLoop++;
    const currentTopic = topicsList[topicIdx % topicsList.length];
    const topicQuestions = byTopic.get(currentTopic) || [];
    const available = topicQuestions.filter((q) => !selectedIds.has(q.id));

    if (available.length > 0) {
      const picked = available[Math.floor(Math.random() * available.length)];
      selectedIds.add(picked.id);
      selectedQuestions.push({
        ...picked,
        marks: marksPerQ,
      });
    } else {
      // Topic exhausted, remove from active cycle
      const idx = topicsList.indexOf(currentTopic);
      if (idx !== -1) topicsList.splice(idx, 1);
    }

    topicIdx++;
  }

  // 5. If still below target count, take any remaining eligible questions
  if (selectedQuestions.length < targetCount) {
    const remaining = eligible.filter((q) => !selectedIds.has(q.id));
    const needed = targetCount - selectedQuestions.length;
    const fillers = shuffle(remaining).slice(0, needed);
    for (const f of fillers) {
      selectedIds.add(f.id);
      selectedQuestions.push({
        ...f,
        marks: marksPerQ,
      });
    }
  }

  // Calculate distinct topics covered
  const topicsCovered = new Set(selectedQuestions.map((q) => (q.topic || q.category || "General").trim()));

  // 6. Validate completed paper
  const uniqueCheck = new Set(selectedQuestions.map((q) => q.id));
  if (uniqueCheck.size !== selectedQuestions.length) {
    errors.push(`Duplicate question IDs detected in generated ${subject} paper.`);
  }

  const totalMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || marksPerQ), 0);

  return {
    success: errors.length === 0,
    subject,
    questions: selectedQuestions,
    totalMarks,
    distinctTopicsCovered: topicsCovered.size,
    warnings,
    errors,
  };
}
