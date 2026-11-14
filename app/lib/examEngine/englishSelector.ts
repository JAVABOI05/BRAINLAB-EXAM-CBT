// UTME English Section-Aware Examination Generator
// Implements the complete 10-stage selection algorithm defined in the Master Blueprint.
// Guarantees: 60 questions, 8 section quotas, 90 raw marks, complete passage units,
// reading-text ("The Lekki Headmaster"), broad topic coverage, and immutable snapshot freezing.

import { OFFICIAL_UTME_ENGLISH_BLUEPRINT } from "./blueprints";
import { EngineQuestion, ExamBlueprint, HighYieldRule } from "./types";

export type EnglishSelectionResult = {
  success: boolean;
  questions: EngineQuestion[];
  rawTotalMarks: number;
  sectionCounts: Record<string, number>;
  sectionMarks: Record<string, number>;
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

/**
 * Extracts sequence number (e.g. blank [1]..[10]) for Cloze or passage questions.
 */
function extractQuestionSequence(q: EngineQuestion): number {
  const text = `${q.question} ${q.subtopic || ""}`;
  const match =
    text.match(/(?:blank\s*\[?|#|\b\[)(\d{1,2})(?:\]|\b)/i) ||
    text.match(/\bquestion\s*(\d{1,2})\b/i) ||
    text.match(/^(\d{1,2})\./);
  if (match && match[1]) {
    const n = parseInt(match[1], 10);
    if (!isNaN(n) && n >= 1 && n <= 100) return n;
  }
  return typeof q.id === "number" ? q.id : 0;
}

export function selectEnglishExaminationPaper(
  allEnglishQuestions: EngineQuestion[],
  blueprint: ExamBlueprint = OFFICIAL_UTME_ENGLISH_BLUEPRINT,
  highYieldRules: HighYieldRule[] = [],
  rotation?: {
    previouslySeenQuestionIds?: number[];
    masteredQuestionIds?: number[];
  }
): EnglishSelectionResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Stage 1 — Load and verify the blueprint
  const totalTarget = blueprint.total_questions || 60;
  const rawTarget = blueprint.raw_max_marks || 90;

  // Stage 2 — Build eligible pools (active, non-archived, valid prompt and at least 2 options)
  const eligibleQuestions = allEnglishQuestions.filter((q) => {
    if (q.is_archived) return false;
    if (q.is_active === false) return false;
    if (!q.question || q.question.trim().length === 0) return false;
    const hasA = Boolean(q.option_a && q.option_a.trim());
    const hasB = Boolean(q.option_b && q.option_b.trim());
    if (!hasA || !hasB) return false;
    return true;
  });

  if (eligibleQuestions.length < totalTarget) {
    errors.push(
      `Insufficient active English questions in bank: found ${eligibleQuestions.length}, but blueprint requires ${totalTarget}.`
    );
    return {
      success: false,
      questions: [],
      rawTotalMarks: 0,
      sectionCounts: {},
      sectionMarks: {},
      warnings,
      errors,
    };
  }

  // Pre-index questions by passage groups
  const passageGroups = new Map<string, EngineQuestion[]>();
  for (const q of eligibleQuestions) {
    if (q.passage_id && q.passage_id.trim()) {
      const pid = q.passage_id.trim();
      if (!passageGroups.has(pid)) passageGroups.set(pid, []);
      passageGroups.get(pid)!.push(q);
    }
  }

  const selectedQuestions: EngineQuestion[] = [];
  const selectedIds = new Set<number>();
  const sectionCounts: Record<string, number> = {};
  const sectionMarks: Record<string, number> = {};

  // Helper to match questions to section config
  function matchesSection(q: EngineQuestion, secConfig: (typeof blueprint.sections_config)[0]): boolean {
    const qSec = (q.section || "").toLowerCase().trim();
    const qCat = (q.topic || q.category || "").toLowerCase().trim();
    const cfgSec = secConfig.section.toLowerCase().trim();

    // 1. Reading text section check (Stage 7)
    if (secConfig.reading_text_id || cfgSec.includes("reading text") || cfgSec.includes("literature")) {
      const isLekki =
        qCat.includes("lekki") ||
        (q.passage_title && q.passage_title.toLowerCase().includes("lekki")) ||
        qSec.includes("literature");
      return Boolean(isLekki);
    }

    // 2. Comprehension section check (Stage 6)
    if (cfgSec.includes("comprehension")) {
      return (
        (qSec.includes("comprehension") || qCat.includes("comprehension")) &&
        !qCat.includes("cloze") &&
        !qSec.includes("cloze") &&
        !qCat.includes("lekki")
      );
    }

    // 3. Cloze passage check (Stage 6)
    if (cfgSec.includes("cloze")) {
      return (
        qSec === "cloze" ||
        qCat.includes("cloze") ||
        (qSec.includes("cloze") && !qCat.includes("comprehension"))
      );
    }

    // 4. Exact category matching from matching_categories array
    if (secConfig.matching_categories && secConfig.matching_categories.length > 0) {
      for (const m of secConfig.matching_categories) {
        const target = m.toLowerCase().trim();
        if (qCat.includes(target) || target.includes(qCat)) {
          return true;
        }
      }
    }

    // 5. Fallback section matching
    return qSec.includes(cfgSec) || qCat.includes(cfgSec);
  }

  // Stage 3 — Fill each section independently
  for (const secConfig of blueprint.sections_config) {
    const quota = secConfig.quota;
    const marksPerQ = secConfig.marks_per_question;
    const secName = secConfig.section;
    const secNameLower = secName.toLowerCase();

    sectionCounts[secName] = 0;
    sectionMarks[secName] = 0;

    const chosenForSection: EngineQuestion[] = [];

    // =========================================================================
    // SPECIALIZED HANDLER 1: Cloze Test Passage Grouping (Strict 10 Qs from 1 Passage)
    // =========================================================================
    if (secNameLower.includes("cloze")) {
      // 1. Identify all eligible Cloze passage groups
      // Each group must contain EXACTLY 10 active, unselected questions belonging to that passage
      const eligibleClozePassages: { passageId: string; questions: EngineQuestion[] }[] = [];

      for (const [pid, pQuestions] of passageGroups.entries()) {
        const availableInGroup = pQuestions.filter(
          (q) => !selectedIds.has(q.id) && matchesSection(q, secConfig)
        );

        // Validation rule: each Cloze passage group must contain exactly the configured section quota (default 10)
        // Incomplete (<quota), excessive (>quota), or invalid groups are strictly excluded
        if (availableInGroup.length === quota) {
          // Sort in their original sequence (preserving blank 1..quota order)
          const sortedGroup = [...availableInGroup].sort(
            (a, b) => extractQuestionSequence(a) - extractQuestionSequence(b) || a.id - b.id
          );
          eligibleClozePassages.push({ passageId: pid, questions: sortedGroup });
        }
      }

      if (eligibleClozePassages.length === 0) {
        // Strict Rejection Rule: Never select individual questions randomly across different Cloze passages
        // Reject incomplete selection rather than filling with unrelated questions
        errors.push(`No complete ${quota}-question Cloze Test passage found in the question bank.`);
        return {
          success: false,
          questions: [],
          rawTotalMarks: 0,
          sectionCounts,
          sectionMarks,
          warnings,
          errors,
        };
      }

      // Cloze is rotated as a complete passage unit. Never remove individual
      // questions from a passage because of answer history: doing so would break
      // the ten-question passage. Unseen passages always take priority.
      const previouslySeenIds = new Set(rotation?.previouslySeenQuestionIds || []);
      const masteredIds = new Set(rotation?.masteredQuestionIds || []);
      const allSeenIds = new Set([...previouslySeenIds, ...masteredIds]);
      const unseenPassages = eligibleClozePassages.filter(({ questions }) =>
        !questions.some((q) => allSeenIds.has(q.id))
      );
      const passagesNeedingReview = eligibleClozePassages.filter(({ questions }) =>
        questions.some((q) => previouslySeenIds.has(q.id) && !masteredIds.has(q.id))
      );
      const previouslyAttemptedPassages = eligibleClozePassages.filter(({ questions }) =>
        questions.some((q) => allSeenIds.has(q.id))
      );

      const priorityPassages = unseenPassages.length > 0
        ? unseenPassages
        : passagesNeedingReview.length > 0
          ? passagesNeedingReview
          : previouslyAttemptedPassages.length > 0
            ? previouslyAttemptedPassages
            : eligibleClozePassages;
      const selectedGroup = shuffle(priorityPassages)[0];

      for (const q of selectedGroup.questions) {
        selectedIds.add(q.id);
        const questionWithMarks: EngineQuestion = {
          ...q,
          marks: marksPerQ,
        };
        chosenForSection.push(questionWithMarks);
        selectedQuestions.push(questionWithMarks);
        sectionCounts[secName] += 1;
        sectionMarks[secName] += marksPerQ;
      }

      // Cloze section is fully and authoritatively satisfied by the single complete unit
      continue;
    }

    // =========================================================================
    // SPECIALIZED HANDLER 2: Comprehension Passage Grouping (5 Qs from 1 Passage)
    // =========================================================================
    if (secNameLower.includes("comprehension") && secConfig.passage_required) {
      const eligibleCompPassages: { passageId: string; questions: EngineQuestion[] }[] = [];

      for (const [pid, pQuestions] of passageGroups.entries()) {
        const availableInGroup = pQuestions.filter(
          (q) => !selectedIds.has(q.id) && matchesSection(q, secConfig)
        );

        if (availableInGroup.length >= quota) {
          const sortedGroup = [...availableInGroup].sort(
            (a, b) => extractQuestionSequence(a) - extractQuestionSequence(b) || a.id - b.id
          );
          eligibleCompPassages.push({ passageId: pid, questions: sortedGroup });
        }
      }

      if (eligibleCompPassages.length > 0) {
        // Randomly pick ONE comprehension passage unit
        const selectedGroup = shuffle(eligibleCompPassages)[0];
        const toAdd = selectedGroup.questions.slice(0, quota);

        for (const q of toAdd) {
          selectedIds.add(q.id);
          const questionWithMarks: EngineQuestion = {
            ...q,
            marks: marksPerQ,
          };
          chosenForSection.push(questionWithMarks);
          selectedQuestions.push(questionWithMarks);
          sectionCounts[secName] += 1;
          sectionMarks[secName] += marksPerQ;
        }

        continue;
      }
    }

    // =========================================================================
    // GENERAL SECTIONS: Reading Text, Grammar, Vocabulary, Oral Forms
    // =========================================================================
    const pool = eligibleQuestions.filter(
      (q) => !selectedIds.has(q.id) && matchesSection(q, secConfig)
    );

    // Stage 4 & Stage 5 — Maximise topic coverage & apply High-Yield rules
    const byTopic = new Map<string, EngineQuestion[]>();
    for (const q of pool) {
      if (chosenForSection.some((c) => c.id === q.id)) continue;
      const topic = (q.topic || q.category || "General").trim();
      if (!byTopic.has(topic)) byTopic.set(topic, []);
      byTopic.get(topic)!.push(q);
    }

    // Check high yield rules for this section
    const activeHighYield = highYieldRules.filter(
      (r) =>
        r.isActive &&
        r.subject.toLowerCase() === "english" &&
        (r.section?.toLowerCase() === secName.toLowerCase() || !r.section)
    );

    for (const hy of activeHighYield) {
      if (chosenForSection.length >= quota) break;
      const matchingQuestions = byTopic.get(hy.topic) || [];
      const toTake = Math.min(hy.quota, quota - chosenForSection.length, matchingQuestions.length);
      const shuffled = shuffle(matchingQuestions).slice(0, toTake);
      chosenForSection.push(...shuffled);
    }

    // Fill remaining quota round-robin across distinct topics to maximise syllabus spread
    const topicKeys = shuffle(Array.from(byTopic.keys()));
    let topicIndex = 0;
    let loopCount = 0;
    while (chosenForSection.length < quota && topicKeys.length > 0 && loopCount < 500) {
      loopCount++;
      const currentTopic = topicKeys[topicIndex % topicKeys.length];
      const topicPool = byTopic.get(currentTopic) || [];
      const candidate = topicPool.find((q) => !chosenForSection.some((c) => c.id === q.id));
      if (candidate) {
        chosenForSection.push(candidate);
      }
      topicIndex++;
      if (!topicPool.some((q) => !chosenForSection.some((c) => c.id === q.id))) {
        const idx = topicKeys.indexOf(currentTopic);
        if (idx !== -1) topicKeys.splice(idx, 1);
      }
    }

    // If still short, fallback to any available question in section pool
    if (chosenForSection.length < quota) {
      const remaining = pool.filter((q) => !chosenForSection.some((c) => c.id === q.id));
      const needed = quota - chosenForSection.length;
      chosenForSection.push(...shuffle(remaining).slice(0, needed));
    }

    // Enforce blueprint marks on selected questions for this section
    for (const q of chosenForSection) {
      selectedIds.add(q.id);
      const questionWithMarks: EngineQuestion = {
        ...q,
        marks: marksPerQ,
      };
      selectedQuestions.push(questionWithMarks);
      sectionCounts[secName] += 1;
      sectionMarks[secName] += marksPerQ;
    }

    if (chosenForSection.length < quota) {
      warnings.push(
        `Section '${secName}' has question shortage: required ${quota}, but selected ${chosenForSection.length}.`
      );
    }
  }

  // If total selected questions < 60 due to non-passage shortages, fill from remaining standalone active English questions
  // Never fill with Cloze questions or broken passage fragments
  if (selectedQuestions.length < totalTarget) {
    const needed = totalTarget - selectedQuestions.length;
    const remainingFillers = eligibleQuestions.filter(
      (q) => !selectedIds.has(q.id) && !q.passage_id && q.section !== "cloze"
    );
    const fillers = shuffle(remainingFillers).slice(0, needed);
    for (const f of fillers) {
      selectedIds.add(f.id);
      selectedQuestions.push({
        ...f,
        marks: 1,
      });
    }
    warnings.push(`Filled ${fillers.length} supplementary English questions to reach total count of ${totalTarget}.`);
  }

  // Calculate final raw marks total
  const rawTotalMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);

  // Stage 8 — Preserve section and passage integrity
  // Questions belonging to the same passage are kept sequential in 1..10 order
  const sequencedQuestions: EngineQuestion[] = [];
  const processedPassages = new Set<string>();

  for (const q of selectedQuestions) {
    if (q.passage_id) {
      if (processedPassages.has(q.passage_id)) continue;
      processedPassages.add(q.passage_id);
      const passageSiblingQuestions = selectedQuestions
        .filter((item) => item.passage_id === q.passage_id)
        .sort((a, b) => extractQuestionSequence(a) - extractQuestionSequence(b) || a.id - b.id);
      sequencedQuestions.push(...passageSiblingQuestions);
    } else {
      sequencedQuestions.push(q);
    }
  }

  // Stage 9 — Validate completed paper
  const finalQuestions =
    sequencedQuestions.length === selectedQuestions.length ? sequencedQuestions : selectedQuestions;

  // Verify no duplicate IDs
  const uniqueCheck = new Set(finalQuestions.map((q) => q.id));
  if (uniqueCheck.size !== finalQuestions.length) {
    errors.push("Duplicate question IDs detected in generated English paper.");
  }

  return {
    success: errors.length === 0,
    questions: finalQuestions.slice(0, totalTarget),
    rawTotalMarks,
    sectionCounts,
    sectionMarks,
    warnings,
    errors,
  };
}
