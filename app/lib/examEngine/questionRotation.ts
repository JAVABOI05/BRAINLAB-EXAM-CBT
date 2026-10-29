/**
 * Pure helpers for personalized mock-question rotation.
 * Selection must still be performed within the existing blueprint/topic rules.
 */
export type QuestionExposure = {
  questionId: number;
  lastSeenAt: string | null;
  exposureCount: number;
  lastOutcome?: "correct" | "incorrect" | "unanswered" | null;
};

export type RotatableQuestion = { id: number };

/**
 * Sorts eligible candidates by rotation priority without changing their membership.
 * Unseen questions come first; seen questions are ordered least-recently-seen first.
 * Questions with equal priority are randomized by the supplied random function.
 */
export function prioritizeUnseenQuestions<T extends RotatableQuestion>(
  candidates: readonly T[],
  exposureByQuestionId: ReadonlyMap<number, QuestionExposure>,
  random: () => number = Math.random
): T[] {
  const decorated = candidates.map((question, index) => ({
    question,
    index,
    exposure: exposureByQuestionId.get(question.id),
    tieBreaker: random(),
  }));

  decorated.sort((a, b) => {
    if (!a.exposure && b.exposure) return -1;
    if (a.exposure && !b.exposure) return 1;

    if (a.exposure && b.exposure) {
      const aTime = Date.parse(a.exposure.lastSeenAt ?? "");
      const bTime = Date.parse(b.exposure.lastSeenAt ?? "");
      const aValid = Number.isFinite(aTime) ? aTime : 0;
      const bValid = Number.isFinite(bTime) ? bTime : 0;
      if (aValid !== bValid) return aValid - bValid;
      if (a.exposure.exposureCount !== b.exposure.exposureCount) {
        return a.exposure.exposureCount - b.exposure.exposureCount;
      }
    }

    return a.tieBreaker - b.tieBreaker || a.index - b.index;
  });

  return decorated.map(({ question }) => question);
}

/** Returns the IDs of candidates that have not yet been seen by this learner. */
export function getUnseenQuestionIds(
  candidates: readonly RotatableQuestion[],
  exposureByQuestionId: ReadonlyMap<number, QuestionExposure>
): Set<number> {
  return new Set(
    candidates
      .filter((question) => !exposureByQuestionId.has(question.id))
      .map((question) => question.id)
  );
}
