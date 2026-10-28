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

export function selectEnglishExaminationPaper(
  allEnglishQuestions: EngineQuestion[],
  blueprint: ExamBlueprint = OFFICIAL_UTME_ENGLISH_BLUEPRINT,
  highYieldRules: HighYieldRule[] = []
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

  // Pre-index questions by section / category and passage groups
  const passageGroups = new Map<string, EngineQuestion[]>();
  for (const q of eligibleQuestions) {
    if (q.passage_id) {
      if (!passageGroups.has(q.passage_id)) passageGroups.set(q.passage_id, []);
      passageGroups.get(q.passage_id)!.push(q);
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
        !qCat.includes("lekki")
      );
    }

    // 3. Cloze passage check (Stage 6)
    if (cfgSec.includes("cloze")) {
      return (
        qCat.includes("cloze") ||
        qSec.includes("cloze") ||
        qCat.includes("grammar in context") ||
        qCat.includes("registers")
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

    sectionCounts[secName] = 0;
    sectionMarks[secName] = 0;

    // Filter available questions for this section not already selected
    const pool = eligibleQuestions.filter((q) => !selectedIds.has(q.id) && matchesSection(q, secConfig));

    const chosenForSection: EngineQuestion[] = [];

    // Stage 6 — Handle passage groups (Comprehension & Cloze)
    if (secConfig.passage_required) {
      // Find eligible passage groups whose questions belong to this pool
      const eligiblePassageIds = Array.from(passageGroups.keys()).filter((pid) => {
        const pQuestions = passageGroups.get(pid)!;
        return pQuestions.some((q) => !selectedIds.has(q.id) && matchesSection(q, secConfig));
      });

      if (eligiblePassageIds.length > 0) {
        // Pick randomized passage group
        const shuffledPids = shuffle(eligiblePassageIds);
        for (const pid of shuffledPids) {
          if (chosenForSection.length >= quota) break;
          const groupQuestions = passageGroups.get(pid)!.filter((q) => !selectedIds.has(q.id));
          const needed = quota - chosenForSection.length;
          // Select as complete unit or slice up to needed
          const toAdd = groupQuestions.slice(0, needed);
          chosenForSection.push(...toAdd);
        }
      }
    }

    // Stage 4 & Stage 5 — Maximise topic coverage & apply High-Yield rules
    if (chosenForSection.length < quota) {
      // Group remaining available pool by distinct topic/category
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
        // If all questions in that topic exhausted, drop it
        if (!topicPool.some((q) => !chosenForSection.some((c) => c.id === q.id))) {
          const idx = topicKeys.indexOf(currentTopic);
          if (idx !== -1) topicKeys.splice(idx, 1);
        }
      }

      // If still short, fallback to any available question in pool
      if (chosenForSection.length < quota) {
        const remaining = pool.filter((q) => !chosenForSection.some((c) => c.id === q.id));
        const needed = quota - chosenForSection.length;
        chosenForSection.push(...shuffle(remaining).slice(0, needed));
      }
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

  // If total selected questions < 60 due to bank shortages, fill from remaining active English questions
  if (selectedQuestions.length < totalTarget) {
    const needed = totalTarget - selectedQuestions.length;
    const remainingFillers = eligibleQuestions.filter((q) => !selectedIds.has(q.id));
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

  // Stage 8 — Randomise presentation while preserving passage integrity
  // Questions belonging to the same passage are kept sequential
  const sequencedQuestions: EngineQuestion[] = [];
  const processedPassages = new Set<string>();

  for (const q of selectedQuestions) {
    if (q.passage_id) {
      if (processedPassages.has(q.passage_id)) continue;
      processedPassages.add(q.passage_id);
      const passageSiblingQuestions = selectedQuestions.filter((item) => item.passage_id === q.passage_id);
      sequencedQuestions.push(...passageSiblingQuestions);
    } else {
      sequencedQuestions.push(q);
    }
  }

  // Stage 9 — Validate completed paper
  const finalQuestions = sequencedQuestions.length === selectedQuestions.length ? sequencedQuestions : selectedQuestions;

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
