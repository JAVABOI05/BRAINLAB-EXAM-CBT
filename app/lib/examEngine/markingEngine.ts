// Authoritative Marking Engine for BrainLab CBT
// Strictly enforces exact blueprint marks, raw score calculation, English 90->100 conversion,
// and consistent upward-rounding display rules across all attempts, results, and corrections.

import {
  AttemptSnapshot,
  AuthoritativeMarkingResult,
  EngineQuestion,
  OptionLetter,
  QuestionMarkDetail,
  SubjectMarkDetail,
} from "./types";

export function roundUpScore(value: number): number {
  if (Number.isInteger(value)) return value;
  // If there's any fractional score part, round upward to whole number as per UTME standard
  return Math.ceil(value);
}

export function convertEnglishRawScore(rawScore: number, rawMax: number = 90): {
  rawScore: number;
  rawMax: number;
  convertedScore: number;
  displayedScore: number;
  percentage: number;
} {
  const safeRaw = Math.max(0, Math.min(rawScore, rawMax));
  const converted = (safeRaw / (rawMax || 90)) * 100;
  const displayed = roundUpScore(converted);
  return {
    rawScore: safeRaw,
    rawMax,
    convertedScore: Math.round(converted * 100) / 100, // 2 decimal places
    displayedScore: Math.min(100, Math.max(0, displayed)),
    percentage: Math.round((safeRaw / (rawMax || 90)) * 1000) / 10,
  };
}

export function convertStandardRawScore(rawScore: number, rawMax: number = 100): {
  rawScore: number;
  rawMax: number;
  convertedScore: number;
  displayedScore: number;
  percentage: number;
} {
  const safeMax = rawMax > 0 ? rawMax : 100;
  const safeRaw = Math.max(0, Math.min(rawScore, safeMax));
  // Normalize each selected subject against its actual available raw marks.
  // This guarantees a 100-mark subject scale even when a question set's raw
  // marks differ slightly from the blueprint target.
  const converted = (safeRaw / safeMax) * 100;
  const displayed = roundUpScore(converted);
  return {
    rawScore: safeRaw,
    rawMax: safeMax,
    convertedScore: Math.round(converted * 100) / 100,
    displayedScore: Math.min(100, Math.max(0, displayed)),
    percentage: Math.round(converted * 10) / 10,
  };
}

/**
 * Authoritative marking calculation:
 * Uses the saved attempt snapshot or blueprint question marks to compute an immutable result.
 */
export function markExamAttempt(
  questions: EngineQuestion[],
  candidateAnswers: Record<string | number, OptionLetter | string>,
  snapshot?: AttemptSnapshot | null
): AuthoritativeMarkingResult {
  const questionDetails: QuestionMarkDetail[] = [];
  const subjectGroups = new Map<string, EngineQuestion[]>();

  for (const q of questions) {
    const subj = q.subject || "General";
    if (!subjectGroups.has(subj)) {
      subjectGroups.set(subj, []);
    }
    subjectGroups.get(subj)!.push(q);
  }

  const subjectDetails: Record<string, SubjectMarkDetail> = {};
  const subjectScores: Record<string, number> = {};

  let aggregateRawScore = 0;
  let aggregateRawMax = 0;
  let aggregateDisplayedScore = 0;

  for (const [subj, subjQuestions] of subjectGroups.entries()) {
    const isEnglish = subj.toLowerCase().includes("english");
    let subjRawScore = 0;
    let subjRawMax = 0;
    let answeredCount = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    for (const q of subjQuestions) {
      // Determine question marks from snapshot marking_rules if present, else question.marks, else default
      let maxMarks = q.marks;
      if (snapshot?.marking_rules?.question_marks?.[q.id] !== undefined) {
        maxMarks = snapshot.marking_rules.question_marks[q.id];
      } else if (!maxMarks || maxMarks <= 0) {
        maxMarks = isEnglish ? 1 : 2.5;
      }

      subjRawMax += maxMarks;

      const userAnsRaw = candidateAnswers[q.id] ?? candidateAnswers[String(q.id)] ?? null;
      const userAns = typeof userAnsRaw === "string" ? (userAnsRaw.trim().toUpperCase() as OptionLetter) : null;
      const correctAns = String(q.correct_answer || "A").trim().toUpperCase();

      const isAnswered = userAns !== null;
      const isCorrect = isAnswered && userAns === correctAns;

      let awarded = 0;
      if (isCorrect) {
        awarded = maxMarks;
        correctCount += 1;
      } else if (isAnswered) {
        wrongCount += 1;
      } else {
        unansweredCount += 1;
      }

      if (isAnswered) answeredCount += 1;
      subjRawScore += awarded;

      questionDetails.push({
        question_id: q.id,
        subject: subj,
        user_answer: userAns,
        correct_answer: correctAns,
        is_correct: isCorrect,
        raw_marks_awarded: awarded,
        raw_max_marks: maxMarks,
        explanation: q.explanation,
      });
    }

    // Apply conversion formula
    let conversionRes: {
      rawScore: number;
      rawMax: number;
      convertedScore: number;
      displayedScore: number;
      percentage: number;
    };

    if (isEnglish) {
      // UTME English converts raw score (out of 90) to student-facing score out of 100
      conversionRes = convertEnglishRawScore(subjRawScore, subjRawMax || 90);
    } else {
      // Standard elective: 40 questions x 2.5 marks = 100 marks
      conversionRes = convertStandardRawScore(subjRawScore, subjRawMax || 100);
    }

    subjectDetails[subj] = {
      subject: subj,
      total_questions: subjQuestions.length,
      answered_count: answeredCount,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unanswered_count: unansweredCount,
      raw_score: conversionRes.rawScore,
      raw_max_marks: conversionRes.rawMax,
      converted_score: conversionRes.convertedScore,
      displayed_score: conversionRes.displayedScore,
      percentage: conversionRes.percentage,
      conversion_formula: isEnglish ? "english_90_to_100" : "direct",
    };

    subjectScores[subj] = conversionRes.displayedScore;

    aggregateRawScore += conversionRes.rawScore;
    aggregateRawMax += conversionRes.rawMax;
    aggregateDisplayedScore += conversionRes.displayedScore;
  }

  const totalPossible = Object.keys(subjectDetails).length * 100; // 4 subjects = 400
  const aggregatePercentage = totalPossible > 0 ? Math.round((aggregateDisplayedScore / totalPossible) * 100) : 0;

  return {
    raw_score: aggregateRawScore,
    raw_max_marks: aggregateRawMax,
    converted_score: aggregateDisplayedScore,
    displayed_score: aggregateDisplayedScore,
    percentage: aggregatePercentage,
    total_possible: totalPossible,
    subject_scores: subjectScores,
    subject_details: subjectDetails,
    question_details: questionDetails,
  };
}
