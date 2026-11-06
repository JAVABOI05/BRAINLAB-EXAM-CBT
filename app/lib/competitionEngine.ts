// BRAINLAB ACADEMY COMPETITION ARENA
// COMPETITION QUESTION SELECTION & ASSESSMENT ENGINE
// Implements 3 source modes (competition bank, main bank, combined),
// topic coverage, difficulty distribution, high-yield weighting,
// synchronized 1v1 battle equivalence vs randomization, option shuffling,
// shortage reporting, and immutable attempt snapshots.

import { CompetitionQuestionItem } from "./competitionQuestionBank";
import {
  AllocationMode,
  ConflictPriorityPolicy,
  DifficultyCategoryCounts,
  ReferenceDistributions,
  ShortagePolicy,
  buildDifficultyAuditPayload,
  selectQuestionsWithDifficultyModel,
  DEFAULT_REFERENCE_DISTRIBUTIONS,
  GenericEngineQuestion,
  DifficultyAllocationResult,
} from "./difficultyEngine";

export type QuestionSourceMode = "competition_bank" | "main_bank" | "combined";

export interface CompetitionSelectionRules {
  question_count: number;
  duration_seconds: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  identical_questions_for_all: boolean; // Must be true for synchronized 1v1 battles
  difficulty_slider?: number; // Continuous 0 to 100
  difficulty_mode?: AllocationMode; // "slider" | "manual"
  manual_difficulty_counts?: DifficultyCategoryCounts; // { easy: number, medium: number, hard: number }
  shortage_policy?: ShortagePolicy; // "strict" | "best_effort"
  conflict_priority?: ConflictPriorityPolicy; // "topic_priority" | "difficulty_priority" | "balanced"
  reference_distributions?: ReferenceDistributions;
  difficulty_distribution?: {
    easy?: number; // percentage (e.g. 30)
    medium?: number; // percentage (e.g. 50)
    hard?: number; // percentage (e.g. 20)
  };
  topic_coverage?: {
    target_distinct_topics?: number;
    required_topics?: string[];
  };
  high_yield_weighting?: number; // multiplier e.g. 1.5
  attempt_limit?: number;
}

export interface CompetitionQuestionSnapshotItem {
  id: string;
  source: "competition_bank" | "main_bank";
  subject: string;
  topic?: string;
  subtopic?: string;
  passage_id?: string;
  passage_title?: string;
  passage_text?: string;
  reading_text_id?: string;
  difficulty: string;
  question: string;
  options: Record<string, string>; // { A: "...", B: "...", C: "...", D: "...", E?: "..." }
  option_images?: Record<string, string>;
  question_image_url?: string;
  question_image_alt?: string;
  marks: number;
  explanation?: string;
}

export interface CompetitionAttemptSnapshot {
  session_id: string;
  competition_id: string;
  user_id?: string;
  guest_session_id?: string;
  question_source_mode: QuestionSourceMode;
  questions_snapshot: CompetitionQuestionSnapshotItem[];
  answer_key_snapshot: Record<string, string>; // questionId -> Correct Option Key
  scoring_rules: {
    total_questions: number;
    max_raw_marks: number;
    duration_seconds: number;
    question_marks: Record<string, number>;
  };
  difficulty_audit?: ReturnType<typeof buildDifficultyAuditPayload>;
  created_at: string;
}

/**
 * Shuffles an array deterministically if seed is provided, or pseudo-randomly.
 */
export function shuffleArray<T>(items: T[], seed?: number): T[] {
  const result = [...items];
  let s = seed !== undefined ? seed : Math.random() * 100000;
  for (let i = result.length - 1; i > 0; i--) {
    // Simple LCG PRNG for seeded reproducibility
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    const j = Math.floor(rnd * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles options (A-D or A-E) and calculates the new correct answer key.
 */
export function shuffleQuestionOptions(
  question: CompetitionQuestionItem,
  seed?: number
): {
  shuffledOptions: Record<string, string>;
  shuffledImages: Record<string, string>;
  newCorrectAnswer: string;
} {
  const letters = ["A", "B", "C", "D"];
  if (question.option_e && question.option_e.trim()) {
    letters.push("E");
  }

  const rawOptions: Record<string, string> = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
  };
  if (question.option_e) rawOptions.E = question.option_e;

  const rawImages: Record<string, string> = {};
  if (question.option_a_image_url) rawImages.A = question.option_a_image_url;
  if (question.option_b_image_url) rawImages.B = question.option_b_image_url;
  if (question.option_c_image_url) rawImages.C = question.option_c_image_url;
  if (question.option_d_image_url) rawImages.D = question.option_d_image_url;
  if (question.option_e_image_url) rawImages.E = question.option_e_image_url;

  const originalCorrectKey = (question.correct_answer || "").trim().toUpperCase();
  if (!letters.includes(originalCorrectKey) || !rawOptions[originalCorrectKey]) {
    throw new Error(`Question ${question.id || "unknown"} has an invalid or missing correct answer key.`);
  }

  // Pair up options and shuffle their display order
  const pairs = letters.map((k) => ({
    originalKey: k,
    text: rawOptions[k],
    imageUrl: rawImages[k] || "",
  }));

  const shuffledPairs = shuffleArray(pairs, seed);

  const shuffledOptions: Record<string, string> = {};
  const shuffledImages: Record<string, string> = {};
  let newCorrectAnswer = "A";

  letters.forEach((newLetter, idx) => {
    const pair = shuffledPairs[idx];
    shuffledOptions[newLetter] = pair.text;
    if (pair.imageUrl) shuffledImages[newLetter] = pair.imageUrl;
    if (pair.originalKey === originalCorrectKey) {
      newCorrectAnswer = newLetter;
    }
  });

  return { shuffledOptions, shuffledImages, newCorrectAnswer };
}

/**
 * Formats a question item into a snapshot question with option mapping.
 */
export function formatQuestionForSnapshot(
  q: CompetitionQuestionItem,
  source: "competition_bank" | "main_bank",
  randomizeOptions: boolean,
  seed?: number
): { snapshotItem: CompetitionQuestionSnapshotItem; correctOption: string } {
  const qId = q.id || `q_${Math.random().toString(36).slice(2, 9)}`;

  if (randomizeOptions) {
    const { shuffledOptions, shuffledImages, newCorrectAnswer } = shuffleQuestionOptions(q, seed);
    return {
      snapshotItem: {
        id: qId,
        source,
        subject: q.subject,
        topic: q.topic,
        subtopic: q.subtopic,
        passage_id: q.passage_id || undefined,
        passage_title: q.passage_title || undefined,
        passage_text: q.passage_text || undefined,
        reading_text_id: q.reading_text_id || undefined,
        difficulty: q.difficulty,
        question: q.question,
        options: shuffledOptions,
        option_images: Object.keys(shuffledImages).length > 0 ? shuffledImages : undefined,
        question_image_url: q.question_image_url,
        question_image_alt: q.question_image_alt,
        marks: q.marks > 0 ? q.marks : 1.0,
        explanation: q.explanation,
      },
      correctOption: newCorrectAnswer,
    };
  }

  // Unshuffled original options
  const options: Record<string, string> = {
    A: q.option_a,
    B: q.option_b,
    C: q.option_c,
    D: q.option_d,
  };
  if (q.option_e && q.option_e.trim()) {
    options.E = q.option_e;
  }

  const option_images: Record<string, string> = {};
  if (q.option_a_image_url) option_images.A = q.option_a_image_url;
  if (q.option_b_image_url) option_images.B = q.option_b_image_url;
  if (q.option_c_image_url) option_images.C = q.option_c_image_url;
  if (q.option_d_image_url) option_images.D = q.option_d_image_url;
  if (q.option_e_image_url) option_images.E = q.option_e_image_url;

  return {
    snapshotItem: {
      id: qId,
      source,
      subject: q.subject,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty,
      question: q.question,
      options,
      option_images: Object.keys(option_images).length > 0 ? option_images : undefined,
      question_image_url: q.question_image_url,
      question_image_alt: q.question_image_alt,
      marks: q.marks > 0 ? q.marks : 1.0,
      explanation: q.explanation,
    },
    correctOption: (() => {
      const answer = (q.correct_answer || "").trim().toUpperCase();
      if (!["A", "B", "C", "D", "E"].includes(answer) || !options[answer]) {
        throw new Error(`Question ${q.id || "unknown"} has an invalid or missing correct answer key.`);
      }
      return answer;
    })(),
  };
}

/**
 * Keep comprehension/cloze passage questions together. A passage is a single
 * selection unit: either all linked questions are included or none are.
 */
function preservePassageUnits(
  selected: CompetitionQuestionItem[],
  available: CompetitionQuestionItem[],
  targetCount: number
): { ok: true; questions: CompetitionQuestionItem[] } | { ok: false; error: string } {
  const groupKey = (question: CompetitionQuestionItem) =>
    question.passage_id || question.reading_text_id || null;
  const groups = new Map<string, CompetitionQuestionItem[]>();
  for (const question of available) {
    const key = groupKey(question);
    if (!key) continue;
    const current = groups.get(key) || [];
    current.push(question);
    groups.set(key, current);
  }
  for (const [key, rows] of groups) {
    rows.sort((left, right) => {
      const leftId = Number(String(left.id || "").replace(/^main_/, ""));
      const rightId = Number(String(right.id || "").replace(/^main_/, ""));
      return Number.isFinite(leftId) && Number.isFinite(rightId) ? leftId - rightId : String(left.id).localeCompare(String(right.id));
    });
    groups.set(key, rows);
  }

  const result: CompetitionQuestionItem[] = [];
  const includedIds = new Set<string>();
  const handledGroups = new Set<string>();
  const tryAdd = (question: CompetitionQuestionItem) => {
    const key = groupKey(question);
    if (key) {
      if (handledGroups.has(key)) return true;
      handledGroups.add(key);
      const unit = groups.get(key) || [question];
      if (result.length + unit.length > targetCount) return false;
      for (const item of unit) {
        const id = String(item.id || "");
        if (!includedIds.has(id)) {
          result.push(item);
          includedIds.add(id);
        }
      }
      return true;
    }
    const id = String(question.id || "");
    if (!includedIds.has(id) && result.length < targetCount) {
      result.push(question);
      includedIds.add(id);
    }
    return true;
  };

  for (const question of selected) tryAdd(question);
  if (result.length < targetCount) {
    for (const question of available) {
      if (result.length >= targetCount) break;
      tryAdd(question);
    }
  }
  if (result.length !== targetCount) {
    return {
      ok: false,
      error: `The selected question set cannot preserve all linked comprehension/cloze passages while meeting the requested ${targetCount}-question count. Adjust the question count or source filters.`,
    };
  }
  return { ok: true, questions: result };
}

/**
 * Core Assessment Selection Engine
 * Generates an immutable attempt snapshot from the requested sources.
 */
export function generateCompetitionAssessmentSnapshot(params: {
  sessionId: string;
  competitionId: string;
  userId?: string;
  guestSessionId?: string;
  sourceMode: QuestionSourceMode;
  competitionBankQuestions: CompetitionQuestionItem[];
  mainBankQuestions: CompetitionQuestionItem[];
  rules: CompetitionSelectionRules;
  combinedRatio?: { competitionBank: number; mainBank: number };
  participantSeed?: number;
}): { ok: true; snapshot: CompetitionAttemptSnapshot } | { ok: false; error: string; shortageDetails?: Record<string, unknown> } {
  const {
    sessionId,
    competitionId,
    userId,
    guestSessionId,
    sourceMode,
    competitionBankQuestions,
    mainBankQuestions,
    rules,
    combinedRatio = { competitionBank: 0.5, mainBank: 0.5 },
    participantSeed,
  } = params;

  const targetCount = rules.question_count || 10;
  let selectedCompetitionQuestions: CompetitionQuestionItem[] = [];
  let selectedMainQuestions: CompetitionQuestionItem[] = [];
  let mainQuestionTarget = 0;
  let compAllocation: DifficultyAllocationResult | undefined;
  let mainAllocation: DifficultyAllocationResult | undefined;

  // Shortage check and collection based on source mode
  if (sourceMode === "competition_bank") {
    if (competitionBankQuestions.length < targetCount) {
      return {
        ok: false,
        error: `Insufficient questions in dedicated competition bank. Required: ${targetCount}, Available: ${competitionBankQuestions.length}.`,
        shortageDetails: {
          required: targetCount,
          available: competitionBankQuestions.length,
          source: "competition_bank",
        },
      };
    }
    const res = selectQuestionsByRules(competitionBankQuestions, targetCount, rules, participantSeed);
    if (rules.shortage_policy === "strict" && res.allocationResult && !res.allocationResult.ok) {
      return {
        ok: false,
        error: res.allocationResult.errorMessage || "Strict difficulty distribution requirements could not be satisfied.",
        shortageDetails: {
          shortages: res.allocationResult.shortageDetails,
          source: "competition_bank",
        },
      };
    }
    selectedCompetitionQuestions = res.questions;
    compAllocation = res.allocationResult;
  } else if (sourceMode === "main_bank") {
    mainQuestionTarget = targetCount;
    if (mainBankQuestions.length < targetCount) {
      return {
        ok: false,
        error: `Insufficient questions in main institutional bank. Required: ${targetCount}, Available: ${mainBankQuestions.length}.`,
        shortageDetails: {
          required: targetCount,
          available: mainBankQuestions.length,
          source: "main_bank",
        },
      };
    }
    const res = selectQuestionsByRules(mainBankQuestions, targetCount, rules, participantSeed);
    if (rules.shortage_policy === "strict" && res.allocationResult && !res.allocationResult.ok) {
      return {
        ok: false,
        error: res.allocationResult.errorMessage || "Strict difficulty distribution requirements could not be satisfied.",
        shortageDetails: {
          shortages: res.allocationResult.shortageDetails,
          source: "main_bank",
        },
      };
    }
    selectedMainQuestions = res.questions;
    mainAllocation = res.allocationResult;
  } else {
    // Combined Source Mode
    const compQuota = Math.round(targetCount * combinedRatio.competitionBank);
    const mainQuota = targetCount - compQuota;
    mainQuestionTarget = mainQuota;

    if (competitionBankQuestions.length < compQuota) {
      return {
        ok: false,
        error: `Insufficient questions in dedicated competition bank for combined mode. Required: ${compQuota}, Available: ${competitionBankQuestions.length}.`,
        shortageDetails: {
          required: compQuota,
          available: competitionBankQuestions.length,
          source: "competition_bank",
        },
      };
    }
    if (mainBankQuestions.length < mainQuota) {
      return {
        ok: false,
        error: `Insufficient questions in main institutional bank for combined mode. Required: ${mainQuota}, Available: ${mainBankQuestions.length}.`,
        shortageDetails: {
          required: mainQuota,
          available: mainBankQuestions.length,
          source: "main_bank",
        },
      };
    }

    const resComp = selectQuestionsByRules(competitionBankQuestions, compQuota, rules, participantSeed);
    const resMain = selectQuestionsByRules(mainBankQuestions, mainQuota, rules, participantSeed ? participantSeed + 13 : undefined);

    if (rules.shortage_policy === "strict") {
      if (resComp.allocationResult && !resComp.allocationResult.ok) {
        return {
          ok: false,
          error: resComp.allocationResult.errorMessage || "Strict difficulty distribution failed for competition bank.",
          shortageDetails: { shortages: resComp.allocationResult.shortageDetails, source: "competition_bank" },
        };
      }
      if (resMain.allocationResult && !resMain.allocationResult.ok) {
        return {
          ok: false,
          error: resMain.allocationResult.errorMessage || "Strict difficulty distribution failed for main bank.",
          shortageDetails: { shortages: resMain.allocationResult.shortageDetails, source: "main_bank" },
        };
      }
    }

    selectedCompetitionQuestions = resComp.questions;
    selectedMainQuestions = resMain.questions;
    compAllocation = resComp.allocationResult;
    mainAllocation = resMain.allocationResult;
  }

  if (selectedMainQuestions.length > 0 && mainQuestionTarget > 0) {
    const passageSafeSelection = preservePassageUnits(selectedMainQuestions, mainBankQuestions, mainQuestionTarget);
    if (!passageSafeSelection.ok) {
      return { ok: false, error: passageSafeSelection.error, shortageDetails: { source: "main_bank", preserve_passages: true } };
    }
    selectedMainQuestions = passageSafeSelection.questions;
  }

  // Combine and format
  const rawPool: Array<{ q: CompetitionQuestionItem; source: "competition_bank" | "main_bank" }> = [
    ...selectedCompetitionQuestions.map((q) => ({ q, source: "competition_bank" as const })),
    ...selectedMainQuestions.map((q) => ({ q, source: "main_bank" as const })),
  ];

  // If rules require identical questions (like in synchronized 1v1 battle), do NOT randomize question selection across participants
  const orderedList = rules.randomize_questions && !rules.identical_questions_for_all
    ? shuffleArray(rawPool, participantSeed)
    : rawPool;

  const snapshotItems: CompetitionQuestionSnapshotItem[] = [];
  const answerKey: Record<string, string> = {};
  const questionMarks: Record<string, number> = {};
  let totalRawMarks = 0;

  orderedList.forEach((entry, idx) => {
    const itemSeed = participantSeed !== undefined ? participantSeed + idx * 7 : undefined;
    const { snapshotItem, correctOption } = formatQuestionForSnapshot(
      entry.q,
      entry.source,
      rules.randomize_options,
      itemSeed
    );

    snapshotItems.push(snapshotItem);
    answerKey[snapshotItem.id] = correctOption;
    questionMarks[snapshotItem.id] = snapshotItem.marks;
    totalRawMarks += snapshotItem.marks;
  });

  const primaryAllocation = compAllocation || mainAllocation;
  const difficultyAudit = primaryAllocation
    ? buildDifficultyAuditPayload({
        allocationResult: primaryAllocation,
        selectedQuestionIds: snapshotItems.map((q) => q.id),
        topicConstraints: {
          target_distinct_topics: rules.topic_coverage?.target_distinct_topics,
          required_topics: rules.topic_coverage?.required_topics,
          high_yield_weighting: rules.high_yield_weighting,
        },
      })
    : undefined;

  const snapshot: CompetitionAttemptSnapshot = {
    session_id: sessionId,
    competition_id: competitionId,
    user_id: userId,
    guest_session_id: guestSessionId,
    question_source_mode: sourceMode,
    questions_snapshot: snapshotItems,
    answer_key_snapshot: answerKey,
    scoring_rules: {
      total_questions: snapshotItems.length,
      max_raw_marks: totalRawMarks,
      duration_seconds: rules.duration_seconds || 300,
      question_marks: questionMarks,
    },
    difficulty_audit: difficultyAudit,
    created_at: new Date().toISOString(),
  };

  return { ok: true, snapshot };
}

/**
 * Helper to select questions respecting topic coverage targets and difficulty distribution.
 */
function selectQuestionsByRules(
  pool: CompetitionQuestionItem[],
  quota: number,
  rules: CompetitionSelectionRules,
  seed?: number
): { questions: CompetitionQuestionItem[]; allocationResult?: DifficultyAllocationResult } {
  // If pool size equals quota, return full pool
  if (pool.length <= quota) {
    return { questions: [...pool] };
  }

  // Derive slider position
  let sliderPos = 50;
  if (rules.difficulty_slider !== undefined) {
    sliderPos = rules.difficulty_slider;
  } else if (rules.difficulty_distribution) {
    const easyP = rules.difficulty_distribution.easy ?? 30;
    const medP = rules.difficulty_distribution.medium ?? 40;
    const hardP = rules.difficulty_distribution.hard ?? 30;
    // Estimate slider pos from weighted score
    sliderPos = Math.round(((0.5 * medP + 1.0 * hardP) / (easyP + medP + hardP || 100)) * 100);
  }

  const result = selectQuestionsWithDifficultyModel(pool as unknown as GenericEngineQuestion[], {
    totalCount: quota,
    allocationMode: rules.difficulty_mode || "slider",
    sliderPosition: sliderPos,
    manualCounts: rules.manual_difficulty_counts,
    shortagePolicy: rules.shortage_policy || "best_effort",
    conflictPriority: rules.conflict_priority || "balanced",
    referenceDistributions: rules.reference_distributions || DEFAULT_REFERENCE_DISTRIBUTIONS,
    targetDistinctTopics: rules.topic_coverage?.target_distinct_topics,
    requiredTopics: rules.topic_coverage?.required_topics,
    randomize: rules.randomize_questions,
    seed,
  });

  return {
    questions: result.selectedQuestions as unknown as CompetitionQuestionItem[],
    allocationResult: result.allocationResult,
  };
}
