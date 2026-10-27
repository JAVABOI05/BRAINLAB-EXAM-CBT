// BRAINLAB ACADEMY CBT - FORMAL DIFFICULTY CALCULATION MODEL
// Reference: Section 1 - 14 of Formal Difficulty Specification
// Implements continuous slider interpolation, largest-remainder rounding (Hare-Niemeyer),
// target and actual difficulty scores, availability validation, strict & best-effort shortage handling,
// multi-constraint solver (topic coverage + high-yield + difficulty), and manual override mode.

export type DifficultyCategory = "easy" | "medium" | "hard";

export interface DifficultyDistributionProportions {
  easy: number; // 0.0 to 1.0 (sums to 1.0)
  medium: number; // 0.0 to 1.0 (sums to 1.0)
  hard: number; // 0.0 to 1.0 (sums to 1.0)
}

export interface DifficultyCategoryCounts {
  easy: number;
  medium: number;
  hard: number;
}

export interface ReferenceDistributions {
  low: DifficultyDistributionProportions; // Position 0 (e.g., 70% Easy, 25% Medium, 5% Hard)
  medium: DifficultyDistributionProportions; // Position 50 (e.g., 30% Easy, 40% Medium, 30% Hard)
  high: DifficultyDistributionProportions; // Position 100 (e.g., 10% Easy, 25% Medium, 65% Hard)
}

export type ShortagePolicy = "strict" | "best_effort";

export type ConflictPriorityPolicy = "topic_priority" | "difficulty_priority" | "balanced";

export type AllocationMode = "slider" | "manual";

export interface AdministratorDifficultyConfig {
  version: number;
  default_slider_position: number; // e.g. 50
  reference_distributions: ReferenceDistributions;
  supported_assessment_sizes: number[]; // e.g. [10, 15, 20, 30, 40, 50, 60, 100]
  default_question_count: number;
  default_shortage_policy: ShortagePolicy;
  default_conflict_priority: ConflictPriorityPolicy;
  allow_manual_mode: boolean;
  allow_creator_override: boolean;
  enable_audit_logging: boolean;
  updated_at?: string;
  updated_by?: string;
}

/**
 * Standard Default Reference Distributions as specified in Section 2:
 * Low (0):    70% Easy, 25% Medium,  5% Hard
 * Medium (50):30% Easy, 40% Medium, 30% Hard
 * High (100): 10% Easy, 25% Medium, 65% Hard
 */
export const DEFAULT_REFERENCE_DISTRIBUTIONS: ReferenceDistributions = {
  low: { easy: 0.7, medium: 0.25, hard: 0.05 },
  medium: { easy: 0.3, medium: 0.4, hard: 0.3 },
  high: { easy: 0.1, medium: 0.25, hard: 0.65 },
};

export const DEFAULT_ADMIN_DIFFICULTY_CONFIG: AdministratorDifficultyConfig = {
  version: 1,
  default_slider_position: 50,
  reference_distributions: DEFAULT_REFERENCE_DISTRIBUTIONS,
  supported_assessment_sizes: [10, 15, 20, 25, 30, 40, 50, 60, 100],
  default_question_count: 40,
  default_shortage_policy: "best_effort",
  default_conflict_priority: "balanced",
  allow_manual_mode: true,
  allow_creator_override: true,
  enable_audit_logging: true,
};

/**
 * Category weights for difficulty score calculation (Section 5):
 * Easy = 0.0, Medium = 0.5, Hard = 1.0
 */
export const DIFFICULTY_WEIGHTS = {
  easy: 0.0,
  medium: 0.5,
  hard: 1.0,
} as const;

/**
 * Validates that proportions sum to 1.0 (with small floating tolerance).
 */
export function validateProportionsSum(dist: DifficultyDistributionProportions, tolerance = 0.0001): boolean {
  const sum = dist.easy + dist.medium + dist.hard;
  return Math.abs(sum - 1.0) < tolerance;
}

/**
 * Section 3: Difficulty Slider Calculation
 * Continuous piecewise linear interpolation between Low (0), Medium (50), and High (100).
 *
 * S = slider position [0, 100]
 * X = S / 100
 * When X <= 0.5: T = 2 * X
 *   Target = (1 - T) * Low + T * Medium
 * When X > 0.5:  T = 2 * X - 1
 *   Target = (1 - T) * Medium + T * High
 */
export function calculateTargetProportions(
  sliderPosition: number,
  references: ReferenceDistributions = DEFAULT_REFERENCE_DISTRIBUTIONS
): DifficultyDistributionProportions {
  // Clamp S to [0, 100]
  const S = Math.min(100, Math.max(0, sliderPosition));
  const X = S / 100;

  let easy: number;
  let medium: number;
  let hard: number;

  if (X <= 0.5) {
    const T = 2 * X;
    easy = (1 - T) * references.low.easy + T * references.medium.easy;
    medium = (1 - T) * references.low.medium + T * references.medium.medium;
    hard = (1 - T) * references.low.hard + T * references.medium.hard;
  } else {
    const T = 2 * X - 1;
    easy = (1 - T) * references.medium.easy + T * references.high.easy;
    medium = (1 - T) * references.medium.medium + T * references.high.medium;
    hard = (1 - T) * references.medium.hard + T * references.high.hard;
  }

  // Normalize slightly to ensure exact 1.0 float sum
  const sum = easy + medium + hard;
  return {
    easy: easy / sum,
    medium: medium / sum,
    hard: hard / sum,
  };
}

/**
 * Section 4: Convert Percentages into Whole Question Counts using Largest-Remainder Method
 * (Hare-Niemeyer / Hamilton Method)
 *
 * 1. Expected count = Total questions * Target proportion
 * 2. Round each expected count down: floor(expected)
 * 3. Calculate unallocated questions: remainder = total - sum(floors)
 * 4. Fractional remainder: frac = expected - floor
 * 5. Allocate remaining questions to categories with largest fractional remainders.
 * 6. Deterministic tie-breaking rule: Medium -> Hard -> Easy if fractional remainders are equal.
 */
export function calculateWholeQuestionCounts(
  totalQuestions: number,
  proportions: DifficultyDistributionProportions
): DifficultyCategoryCounts {
  if (totalQuestions <= 0) {
    return { easy: 0, medium: 0, hard: 0 };
  }

  const expected = {
    easy: totalQuestions * proportions.easy,
    medium: totalQuestions * proportions.medium,
    hard: totalQuestions * proportions.hard,
  };

  const floored = {
    easy: Math.floor(expected.easy),
    medium: Math.floor(expected.medium),
    hard: Math.floor(expected.hard),
  };

  let unallocated = totalQuestions - (floored.easy + floored.medium + floored.hard);

  const sortedRemainders = [
    { category: "medium" as DifficultyCategory, frac: expected.medium - floored.medium, tiePriority: 3 },
    { category: "hard" as DifficultyCategory, frac: expected.hard - floored.hard, tiePriority: 2 },
    { category: "easy" as DifficultyCategory, frac: expected.easy - floored.easy, tiePriority: 1 },
  ].sort((a, b) => {
    const diff = b.frac - a.frac;
    if (Math.abs(diff) > 1e-9) {
      return diff;
    }
    return b.tiePriority - a.tiePriority;
  });

  const counts: DifficultyCategoryCounts = { ...floored };

  for (const item of sortedRemainders) {
    if (unallocated <= 0) break;
    counts[item.category] += 1;
    unallocated -= 1;
  }

  return counts;
}

/**
 * Section 5: Difficulty Score Calculation
 * Weightings: Easy = 0, Medium = 0.5, Hard = 1
 * Difficulty Score = 100 * [(0.5 * Medium count + Hard count) / Total questions]
 * Ranges from 0 to 100.
 */
export function calculateDifficultyScore(counts: DifficultyCategoryCounts): number {
  const total = counts.easy + counts.medium + counts.hard;
  if (total === 0) return 0;
  const weighted = 0.5 * counts.medium + 1.0 * counts.hard;
  const rawScore = 100 * (weighted / total);
  // Round cleanly to 2 decimal places
  return Math.round(rawScore * 100) / 100;
}

/**
 * Section 5: Target Difficulty Score from Proportions directly
 */
export function calculateTargetDifficultyScoreFromProportions(proportions: DifficultyDistributionProportions): number {
  const weighted = 0.5 * proportions.medium + 1.0 * proportions.hard;
  const rawScore = 100 * weighted;
  return Math.round(rawScore * 100) / 100;
}

export interface AvailableDifficultyPool {
  easy: number;
  medium: number;
  hard: number;
  total: number;
}

export interface DifficultyDeviationSummary {
  hasShortage: boolean;
  easyDelta: number; // actual - target
  mediumDelta: number; // actual - target
  hardDelta: number; // actual - target
  targetScore: number;
  actualScore: number;
  scoreDelta: number;
  notes: string[];
}

export interface DifficultyAllocationResult {
  ok: boolean;
  allocationMode: AllocationMode;
  sliderPosition: number | null;
  targetProportions: DifficultyDistributionProportions;
  targetCounts: DifficultyCategoryCounts;
  actualCounts: DifficultyCategoryCounts;
  targetScore: number;
  actualScore: number;
  policyApplied: ShortagePolicy;
  deviations: DifficultyDeviationSummary;
  shortageDetails?: {
    category: DifficultyCategory;
    required: number;
    available: number;
    deficit: number;
  }[];
  errorMessage?: string;
}

/**
 * Section 7 & 8: Shortage Handling and Availability Check
 * Validates requested target counts against available pool under Policy A (strict) or Policy B (best-effort).
 */
export function resolveDifficultyDistribution(params: {
  targetCounts: DifficultyCategoryCounts;
  availablePool: AvailableDifficultyPool;
  policy: ShortagePolicy;
  allocationMode: AllocationMode;
  sliderPosition: number | null;
  targetProportions: DifficultyDistributionProportions;
}): DifficultyAllocationResult {
  const {
    targetCounts,
    availablePool,
    policy,
    allocationMode,
    sliderPosition,
    targetProportions,
  } = params;

  const totalRequested = targetCounts.easy + targetCounts.medium + targetCounts.hard;
  const targetScore = calculateDifficultyScore(targetCounts);

  // Check category shortages
  const deficits: Array<{ category: DifficultyCategory; required: number; available: number; deficit: number }> = [];

  if (targetCounts.easy > availablePool.easy) {
    deficits.push({
      category: "easy",
      required: targetCounts.easy,
      available: availablePool.easy,
      deficit: targetCounts.easy - availablePool.easy,
    });
  }
  if (targetCounts.medium > availablePool.medium) {
    deficits.push({
      category: "medium",
      required: targetCounts.medium,
      available: availablePool.medium,
      deficit: targetCounts.medium - availablePool.medium,
    });
  }
  if (targetCounts.hard > availablePool.hard) {
    deficits.push({
      category: "hard",
      required: targetCounts.hard,
      available: availablePool.hard,
      deficit: targetCounts.hard - availablePool.hard,
    });
  }

  // Total pool availability check
  if (availablePool.total < totalRequested) {
    return {
      ok: false,
      allocationMode,
      sliderPosition,
      targetProportions,
      targetCounts,
      actualCounts: { easy: 0, medium: 0, hard: 0 },
      targetScore,
      actualScore: 0,
      policyApplied: policy,
      deviations: {
        hasShortage: true,
        easyDelta: -targetCounts.easy,
        mediumDelta: -targetCounts.medium,
        hardDelta: -targetCounts.hard,
        targetScore,
        actualScore: 0,
        scoreDelta: -targetScore,
        notes: [
          `Total available eligible questions (${availablePool.total}) is less than total requested questions (${totalRequested}).`,
        ],
      },
      shortageDetails: deficits,
      errorMessage: `Insufficient total eligible questions in question bank (${availablePool.total} available, ${totalRequested} required).`,
    };
  }

  // Policy A: Strict distribution
  if (policy === "strict") {
    if (deficits.length > 0) {
      const detailsStr = deficits
        .map((d) => `${d.category.toUpperCase()} (Required: ${d.required}, Available: ${d.available})`)
        .join("; ");
      return {
        ok: false,
        allocationMode,
        sliderPosition,
        targetProportions,
        targetCounts,
        actualCounts: { easy: 0, medium: 0, hard: 0 },
        targetScore,
        actualScore: 0,
        policyApplied: "strict",
        deviations: {
          hasShortage: true,
          easyDelta: -targetCounts.easy,
          mediumDelta: -targetCounts.medium,
          hardDelta: -targetCounts.hard,
          targetScore,
          actualScore: 0,
          scoreDelta: -targetScore,
          notes: [`Strict difficulty distribution policy violated: ${detailsStr}`],
        },
        shortageDetails: deficits,
        errorMessage: `Strict difficulty distribution cannot be met: ${detailsStr}. Adjust difficulty slider, question count, or eligible bank source.`,
      };
    }

    // Exact match
    return {
      ok: true,
      allocationMode,
      sliderPosition,
      targetProportions,
      targetCounts,
      actualCounts: { ...targetCounts },
      targetScore,
      actualScore: targetScore,
      policyApplied: "strict",
      deviations: {
        hasShortage: false,
        easyDelta: 0,
        mediumDelta: 0,
        hardDelta: 0,
        targetScore,
        actualScore: targetScore,
        scoreDelta: 0,
        notes: ["Exact target difficulty distribution satisfied."],
      },
    };
  }

  // Policy B: Best-effort distribution
  // Fulfill as much as possible for each category, then reallocate deficits to available categories closest in difficulty
  // Neighbor preference: Medium substitutes for Easy or Hard; Hard substitutes for Medium if needed, etc.
  if (deficits.length === 0) {
    return {
      ok: true,
      allocationMode,
      sliderPosition,
      targetProportions,
      targetCounts,
      actualCounts: { ...targetCounts },
      targetScore,
      actualScore: targetScore,
      policyApplied: "best_effort",
      deviations: {
        hasShortage: false,
        easyDelta: 0,
        mediumDelta: 0,
        hardDelta: 0,
        targetScore,
        actualScore: targetScore,
        scoreDelta: 0,
        notes: ["Target difficulty distribution fully satisfied under best-effort policy."],
      },
    };
  }

  // Reallocation algorithm to preserve total requested count while minimizing difficulty distance:
  const actual: DifficultyCategoryCounts = {
    easy: Math.min(targetCounts.easy, availablePool.easy),
    medium: Math.min(targetCounts.medium, availablePool.medium),
    hard: Math.min(targetCounts.hard, availablePool.hard),
  };

  let unallocatedQuestions = totalRequested - (actual.easy + actual.medium + actual.hard);
  const notes: string[] = [];

  for (const d of deficits) {
    notes.push(
      `Shortage in ${d.category.toUpperCase()}: needed ${d.required}, available ${d.available} (deficit of ${d.deficit}).`
    );
  }

  // Distance priority table for substituting:
  // If Easy is short: prefer Medium first (distance 0.5), then Hard (distance 1.0)
  // If Medium is short: prefer Hard or Easy based on slider position:
  //    if S >= 50 prefer Hard then Easy; if S < 50 prefer Easy then Hard
  // If Hard is short: prefer Medium first (distance 0.5), then Easy (distance 1.0)
  const isHigherDifficultyBias = (sliderPosition ?? 50) >= 50;

  while (unallocatedQuestions > 0) {
    // Check remaining capacities
    const capEasy = availablePool.easy - actual.easy;
    const capMedium = availablePool.medium - actual.medium;
    const capHard = availablePool.hard - actual.hard;

    if (capEasy <= 0 && capMedium <= 0 && capHard <= 0) {
      break; // No more available in any category
    }

    // Pick best category that still has capacity
    let candidate: DifficultyCategory | null = null;
    if (capMedium > 0) {
      candidate = "medium";
    } else if (isHigherDifficultyBias) {
      if (capHard > 0) candidate = "hard";
      else if (capEasy > 0) candidate = "easy";
    } else {
      if (capEasy > 0) candidate = "easy";
      else if (capHard > 0) candidate = "hard";
    }

    if (!candidate) break;

    const availableToTake = Math.min(
      unallocatedQuestions,
      candidate === "easy" ? capEasy : candidate === "medium" ? capMedium : capHard
    );

    actual[candidate] += availableToTake;
    unallocatedQuestions -= availableToTake;
  }

  const actualScore = calculateDifficultyScore(actual);
  const easyDelta = actual.easy - targetCounts.easy;
  const mediumDelta = actual.medium - targetCounts.medium;
  const hardDelta = actual.hard - targetCounts.hard;
  const scoreDelta = Math.round((actualScore - targetScore) * 100) / 100;

  notes.push(
    `Best-effort re-allocation result: Easy ${actual.easy} (${easyDelta >= 0 ? "+" : ""}${easyDelta}), ` +
      `Medium ${actual.medium} (${mediumDelta >= 0 ? "+" : ""}${mediumDelta}), ` +
      `Hard ${actual.hard} (${hardDelta >= 0 ? "+" : ""}${hardDelta}). Actual difficulty score: ${actualScore} (target: ${targetScore}).`
  );

  return {
    ok: unallocatedQuestions === 0,
    allocationMode,
    sliderPosition,
    targetProportions,
    targetCounts,
    actualCounts: actual,
    targetScore,
    actualScore,
    policyApplied: "best_effort",
    deviations: {
      hasShortage: true,
      easyDelta,
      mediumDelta,
      hardDelta,
      targetScore,
      actualScore,
      scoreDelta,
      notes,
    },
    shortageDetails: deficits,
    errorMessage:
      unallocatedQuestions > 0
        ? `Could not satisfy total requested count (${totalRequested}); only ${totalRequested - unallocatedQuestions} questions available.`
        : undefined,
  };
}

/**
 * Section 10: Manual Difficulty Configuration Validation
 * Validates manual input counts, checks sums, computes difficulty score, checks availability.
 */
export function validateManualDifficultyInput(params: {
  manualCounts: DifficultyCategoryCounts;
  totalRequested: number;
  availablePool?: AvailableDifficultyPool;
}): {
  isValid: boolean;
  score: number;
  proportions: DifficultyDistributionProportions;
  error?: string;
} {
  const { manualCounts, totalRequested, availablePool } = params;

  if (manualCounts.easy < 0 || manualCounts.medium < 0 || manualCounts.hard < 0) {
    return {
      isValid: false,
      score: 0,
      proportions: { easy: 0, medium: 0, hard: 0 },
      error: "Question counts cannot be negative numbers.",
    };
  }

  const sum = manualCounts.easy + manualCounts.medium + manualCounts.hard;
  if (sum !== totalRequested) {
    return {
      isValid: false,
      score: 0,
      proportions: { easy: 0, medium: 0, hard: 0 },
      error: `Sum of category counts (${sum}) must exactly equal requested total questions (${totalRequested}).`,
    };
  }

  const score = calculateDifficultyScore(manualCounts);
  const proportions: DifficultyDistributionProportions = {
    easy: totalRequested > 0 ? manualCounts.easy / totalRequested : 0,
    medium: totalRequested > 0 ? manualCounts.medium / totalRequested : 0,
    hard: totalRequested > 0 ? manualCounts.hard / totalRequested : 0,
  };

  if (availablePool) {
    if (manualCounts.easy > availablePool.easy) {
      return {
        isValid: false,
        score,
        proportions,
        error: `Requested ${manualCounts.easy} Easy questions, but only ${availablePool.easy} are available in eligible pool.`,
      };
    }
    if (manualCounts.medium > availablePool.medium) {
      return {
        isValid: false,
        score,
        proportions,
        error: `Requested ${manualCounts.medium} Medium questions, but only ${availablePool.medium} are available in eligible pool.`,
      };
    }
    if (manualCounts.hard > availablePool.hard) {
      return {
        isValid: false,
        score,
        proportions,
        error: `Requested ${manualCounts.hard} Hard questions, but only ${availablePool.hard} are available in eligible pool.`,
      };
    }
  }

  return {
    isValid: true,
    score,
    proportions,
  };
}

/**
 * Section 9: Multi-Constraint Question Selection Engine
 * Integrates Difficulty Allocation with Topic Coverage, High-Yield Quotas, and Duplicate Prevention.
 */
export interface GenericEngineQuestion {
  id: string | number;
  subject: string;
  topic?: string | null;
  subtopic?: string | null;
  difficulty?: string | null; // "easy" | "medium" | "hard"
  marks?: number;
  is_active?: boolean;
  is_archived?: boolean;
  status?: string;
  group_hash?: string;
  [key: string]: unknown;
}

export interface MultiConstraintSelectionOptions {
  totalCount: number;
  allocationMode: AllocationMode;
  sliderPosition?: number;
  manualCounts?: DifficultyCategoryCounts;
  shortagePolicy?: ShortagePolicy;
  conflictPriority?: ConflictPriorityPolicy;
  referenceDistributions?: ReferenceDistributions;
  highYieldTopics?: Array<{ topic: string; quota: number }>;
  targetDistinctTopics?: number;
  requiredTopics?: string[];
  randomize?: boolean;
  seed?: number;
  excludedQuestionIds?: Set<string | number>;
}

export interface MultiConstraintSelectionResult {
  ok: boolean;
  selectedQuestions: GenericEngineQuestion[];
  allocationResult: DifficultyAllocationResult;
  topicsCovered: string[];
  highYieldFulfilled: Record<string, { requested: number; delivered: number }>;
  warnings: string[];
  errors: string[];
}

/**
 * Deterministic pseudo-random number generator for seeded shuffling
 */
function seededShuffle<T>(array: T[], seed = 42): T[] {
  const result = [...array];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const rnd = s / 233280;
    const j = Math.floor(rnd * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function normaliseDifficulty(raw?: string | null): DifficultyCategory {
  const d = (raw || "").trim().toLowerCase();
  if (d === "easy") return "easy";
  if (d === "hard") return "hard";
  return "medium";
}

/**
 * Executes multi-constraint selection satisfying topic coverage, high-yield rules,
 * duplicate prevention, and the formal difficulty allocation model.
 */
export function selectQuestionsWithDifficultyModel(
  questionPool: GenericEngineQuestion[],
  options: MultiConstraintSelectionOptions
): MultiConstraintSelectionResult {
  const {
    totalCount,
    allocationMode = "slider",
    sliderPosition = 50,
    manualCounts,
    shortagePolicy = "best_effort",
    conflictPriority = "balanced",
    referenceDistributions = DEFAULT_REFERENCE_DISTRIBUTIONS,
    highYieldTopics = [],
    requiredTopics = [],
    randomize = true,
    seed = 12345,
    excludedQuestionIds = new Set(),
  } = options;

  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Filter eligible question pool
  const eligible = questionPool.filter((q) => {
    if (excludedQuestionIds.has(q.id)) return false;
    if (q.is_archived === true) return false;
    if (q.is_active === false) return false;
    if (q.status && !["approved", "published", "verified"].includes(q.status.toLowerCase())) return false;
    return true;
  });

  // 2. Count availability by difficulty
  const poolEasy = eligible.filter((q) => normaliseDifficulty(q.difficulty) === "easy");
  const poolMedium = eligible.filter((q) => normaliseDifficulty(q.difficulty) === "medium");
  const poolHard = eligible.filter((q) => normaliseDifficulty(q.difficulty) === "hard");

  const availablePool: AvailableDifficultyPool = {
    easy: poolEasy.length,
    medium: poolMedium.length,
    hard: poolHard.length,
    total: eligible.length,
  };

  // 3. Determine target counts
  let targetProportions: DifficultyDistributionProportions;
  let targetCounts: DifficultyCategoryCounts;

  if (allocationMode === "manual" && manualCounts) {
    const val = validateManualDifficultyInput({
      manualCounts,
      totalRequested: totalCount,
    });
    if (!val.isValid) {
      errors.push(val.error || "Invalid manual difficulty input.");
    }
    targetProportions = val.proportions;
    targetCounts = { ...manualCounts };
  } else {
    targetProportions = calculateTargetProportions(sliderPosition, referenceDistributions);
    targetCounts = calculateWholeQuestionCounts(totalCount, targetProportions);
  }

  // 4. Resolve difficulty distribution against available pool & shortage policy
  const allocation = resolveDifficultyDistribution({
    targetCounts,
    availablePool,
    policy: shortagePolicy,
    allocationMode,
    sliderPosition: allocationMode === "slider" ? sliderPosition : null,
    targetProportions,
  });

  if (!allocation.ok) {
    if (allocation.errorMessage) errors.push(allocation.errorMessage);
    return {
      ok: false,
      selectedQuestions: [],
      allocationResult: allocation,
      topicsCovered: [],
      highYieldFulfilled: {},
      warnings,
      errors,
    };
  }

  // Disclose any deviations
  if (allocation.deviations.hasShortage) {
    warnings.push(...allocation.deviations.notes);
  }

  // 5. Select questions satisfying:
  // - actualCounts (Easy, Medium, Hard)
  // - High-Yield Quotas
  // - Required Topics & Topic Coverage
  // - Conflict Priority Policy
  const desiredCounts = { ...allocation.actualCounts };
  const selectedQuestions: GenericEngineQuestion[] = [];
  const selectedIds = new Set<string | number>();
  const seenHashes = new Set<string>();

  // Helper to add question safely
  const tryAddQuestion = (q: GenericEngineQuestion, forceCategory?: DifficultyCategory): boolean => {
    if (selectedIds.has(q.id)) return false;
    if (q.group_hash && seenHashes.has(q.group_hash)) return false; // Duplicate prevention

    const cat = forceCategory || normaliseDifficulty(q.difficulty);
    if (desiredCounts[cat] <= 0 && conflictPriority === "difficulty_priority") {
      return false;
    }

    selectedQuestions.push(q);
    selectedIds.add(q.id);
    if (q.group_hash) seenHashes.add(q.group_hash);
    if (desiredCounts[cat] > 0) {
      desiredCounts[cat]--;
    }
    return true;
  };

  // Group by topic and difficulty
  const byCategory = {
    easy: randomize ? seededShuffle(poolEasy, seed + 1) : [...poolEasy],
    medium: randomize ? seededShuffle(poolMedium, seed + 2) : [...poolMedium],
    hard: randomize ? seededShuffle(poolHard, seed + 3) : [...poolHard],
  };

  const highYieldFulfilled: Record<string, { requested: number; delivered: number }> = {};

  // Stage A: High-Yield Topics Pass
  for (const hy of highYieldTopics) {
    highYieldFulfilled[hy.topic] = { requested: hy.quota, delivered: 0 };
    const candidates = eligible.filter(
      (q) => (q.topic || "General").trim().toLowerCase() === hy.topic.trim().toLowerCase() && !selectedIds.has(q.id)
    );
    const shuffledHy = randomize ? seededShuffle(candidates, seed + 11) : candidates;

    for (const q of shuffledHy) {
      if (highYieldFulfilled[hy.topic].delivered >= hy.quota) break;
      if (selectedQuestions.length >= totalCount) break;

      const cat = normaliseDifficulty(q.difficulty);
      if (desiredCounts[cat] > 0 || conflictPriority !== "difficulty_priority") {
        if (tryAddQuestion(q)) {
          highYieldFulfilled[hy.topic].delivered++;
        }
      }
    }

    if (highYieldFulfilled[hy.topic].delivered < hy.quota) {
      warnings.push(
        `High-yield topic '${hy.topic}' received ${highYieldFulfilled[hy.topic].delivered}/${hy.quota} questions due to difficulty constraint balance.`
      );
    }
  }

  // Stage B: Required Topics Pass
  for (const reqTopic of requiredTopics) {
    const hasReq = selectedQuestions.some(
      (q) => (q.topic || "General").trim().toLowerCase() === reqTopic.trim().toLowerCase()
    );
    if (!hasReq) {
      const candidates = eligible.filter(
        (q) => (q.topic || "General").trim().toLowerCase() === reqTopic.trim().toLowerCase() && !selectedIds.has(q.id)
      );
      const shuffledReq = randomize ? seededShuffle(candidates, seed + 21) : candidates;
      for (const q of shuffledReq) {
        if (tryAddQuestion(q)) break;
      }
    }
  }

  // Stage C: Fill Remaining Target Quotas per Difficulty Category
  for (const cat of ["easy", "medium", "hard"] as DifficultyCategory[]) {
    for (const q of byCategory[cat]) {
      if (desiredCounts[cat] <= 0) break;
      if (selectedQuestions.length >= totalCount) break;
      tryAddQuestion(q, cat);
    }
  }

  // Stage D: Safety Fill if still below totalCount
  if (selectedQuestions.length < totalCount) {
    const remainingEligible = eligible.filter((q) => !selectedIds.has(q.id));
    const shuffledRemaining = randomize ? seededShuffle(remainingEligible, seed + 99) : remainingEligible;

    for (const q of shuffledRemaining) {
      if (selectedQuestions.length >= totalCount) break;
      tryAddQuestion(q);
    }
  }

  // 6. Recalculate true actual counts and actual score from selected questions
  const finalCounts: DifficultyCategoryCounts = { easy: 0, medium: 0, hard: 0 };
  for (const q of selectedQuestions) {
    finalCounts[normaliseDifficulty(q.difficulty)]++;
  }

  const finalActualScore = calculateDifficultyScore(finalCounts);
  allocation.actualCounts = finalCounts;
  allocation.actualScore = finalActualScore;

  const topicsCovered = Array.from(new Set(selectedQuestions.map((q) => (q.topic || "General").trim())));

  return {
    ok: selectedQuestions.length === totalCount,
    selectedQuestions,
    allocationResult: allocation,
    topicsCovered,
    highYieldFulfilled,
    warnings,
    errors,
  };
}

/**
 * Section 12: Data to Persist - Helper to generate immutable audit payload
 */
export function buildDifficultyAuditPayload(params: {
  allocationResult: DifficultyAllocationResult;
  configVersion?: number;
  referenceDistributions?: ReferenceDistributions;
  selectedQuestionIds: Array<string | number>;
  topicConstraints?: Record<string, unknown>;
}) {
  const {
    allocationResult,
    configVersion = 1,
    referenceDistributions = DEFAULT_REFERENCE_DISTRIBUTIONS,
    selectedQuestionIds,
    topicConstraints = {},
  } = params;

  return {
    configuration_version: configVersion,
    allocation_mode: allocationResult.allocationMode,
    slider_position: allocationResult.sliderPosition,
    reference_distributions: referenceDistributions,
    target_proportions: allocationResult.targetProportions,
    target_counts: allocationResult.targetCounts,
    actual_counts: allocationResult.actualCounts,
    target_difficulty_score: allocationResult.targetScore,
    actual_difficulty_score: allocationResult.actualScore,
    score_delta: allocationResult.deviations.scoreDelta,
    shortage_policy: allocationResult.policyApplied,
    shortage_deviations: {
      has_shortage: allocationResult.deviations.hasShortage,
      easy_delta: allocationResult.deviations.easyDelta,
      medium_delta: allocationResult.deviations.mediumDelta,
      hard_delta: allocationResult.deviations.hardDelta,
      notes: allocationResult.deviations.notes,
    },
    selected_question_ids: selectedQuestionIds,
    topic_constraints: topicConstraints,
    configured_at: new Date().toISOString(),
  };
}
