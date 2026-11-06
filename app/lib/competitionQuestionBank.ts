// BRAINLAB ACADEMY COMPETITION ARENA
// DEDICATED COMPETITION QUESTION BANK & INTELLIGENCE ENGINE
// Supports 4/5 option MCQs, CSV validation & safe import, duplicate detection & resolution, and question lifecycle.

import Papa from "papaparse";
import { normaliseQuestionText, calculateTextSimilarity } from "./examEngine/duplicateDetector";

export type QuestionDifficulty = "easy" | "medium" | "hard";
export type QuestionStatus = "draft" | "review" | "approved" | "published" | "archived";
export type DuplicateType = "exact" | "identical_options" | "similar" | "batch";

export interface CompetitionQuestionItem {
  id?: string;
  bank_id: string;
  question: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  passage_id?: string | null;
  passage_title?: string | null;
  passage_text?: string | null;
  reading_text_id?: string | null;
  difficulty: QuestionDifficulty;
  question_type: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string | null;
  option_a_image_url?: string;
  option_b_image_url?: string;
  option_c_image_url?: string;
  option_d_image_url?: string;
  option_e_image_url?: string;
  question_image_url?: string;
  question_image_alt?: string;
  correct_answer: string; // 'A' | 'B' | 'C' | 'D' | 'E'
  explanation?: string;
  marks: number;
  tags?: string[];
  learning_objectives?: string[];
  status: QuestionStatus;
  group_hash?: string;
  duplicate_of_id?: string;
  created_by: string;
  approved_by?: string;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CSVValidationError {
  row: number;
  question_snippet: string;
  field: string;
  message: string;
}

export interface DuplicateDetectionResult {
  group_hash: string;
  duplicate_type: DuplicateType;
  similarity_score: number;
  existing_question: CompetitionQuestionItem;
  incoming_question: CompetitionQuestionItem;
  recommendation: string;
}

export interface CSVImportSummary {
  total_rows: number;
  imported_count: number;
  rejected_count: number;
  duplicates_count: number;
  review_needed_count: number;
  errors: CSVValidationError[];
  detected_duplicates: DuplicateDetectionResult[];
  imported_questions: CompetitionQuestionItem[];
}

/**
 * Standard CSV Template Header and Sample Rows
 */
export const OFFICIAL_COMPETITION_CSV_TEMPLATE = `Question,Subject,Topic,Subtopic,Difficulty,Question Type,Option A,Option B,Option C,Option D,Option E,Correct Answer,Explanation,Marks,Tags,Media URL
"Solve for x: 2^(2x) - 10(2^x) + 16 = 0","Mathematics","Indices and Logarithms","Exponential Equations","medium","multiple_choice","x = 1 or 3","x = 2 or 4","x = 0 or 2","x = 1 or 2","x = -1 or 3","A","Let y = 2^x. Then y^2 - 10y + 16 = 0, giving (y-8)(y-2) = 0. So 2^x = 8 (x=3) or 2^x = 2 (x=1).",2.0,"algebra;equations",
"Choose the word opposite in meaning to METICULOUS: The scientist was known for her meticulous records.","English","Antonyms","Vocabulary","medium","multiple_choice","Careful","Careless","Painstaking","Diligent","Scrupulous","B","Careless is the antonym of meticulous.",1.0,"lexis;vocabulary",
"Which organelle is primarily responsible for ATP synthesis in eukaryotic cells?","Biology","Cell Structure","Organelles","easy","multiple_choice","Ribosome","Endoplasmic reticulum","Mitochondrion","Golgi apparatus","Chloroplast","C","Mitochondria are the powerhouses of the cell.",1.0,"cytology;cell-biology",
`;

/**
 * Generates group hash for exact duplicate detection
 */
export function computeQuestionHash(q: {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string | null;
  correct_answer: string;
}): string {
  const normStem = normaliseQuestionText(q.question);
  const normAns = (q.correct_answer || "").trim().toUpperCase();
  const opts = [
    normaliseQuestionText(q.option_a),
    normaliseQuestionText(q.option_b),
    normaliseQuestionText(q.option_c),
    normaliseQuestionText(q.option_d),
    normaliseQuestionText(q.option_e || ""),
  ]
    .sort()
    .join("|");

  let hash = 0;
  const str = `${normStem}###${opts}###${normAns}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * Validates a single question item against domain requirements.
 */
export function validateQuestionItem(
  q: Partial<CompetitionQuestionItem>,
  rowNumber: number = 1
): CSVValidationError[] {
  const errors: CSVValidationError[] = [];
  const snippet = (q.question || "").slice(0, 50);

  if (!q.question || !q.question.trim()) {
    errors.push({
      row: rowNumber,
      question_snippet: snippet,
      field: "Question",
      message: "Question stem is required and cannot be empty.",
    });
  }

  if (!q.subject || !q.subject.trim()) {
    errors.push({
      row: rowNumber,
      question_snippet: snippet,
      field: "Subject",
      message: "Subject is required.",
    });
  }

  // Four options A, B, C, D are mandatory
  const requiredOptions: Array<keyof CompetitionQuestionItem> = [
    "option_a",
    "option_b",
    "option_c",
    "option_d",
  ];
  for (const optKey of requiredOptions) {
    const val = q[optKey] as string;
    if (!val || !val.trim()) {
      errors.push({
        row: rowNumber,
        question_snippet: snippet,
        field: optKey.toUpperCase().replace("_", " "),
        message: `${optKey.toUpperCase().replace("_", " ")} is required.`,
      });
    }
  }

  // Validate answer key
  const ans = (q.correct_answer || "").trim().toUpperCase();
  const hasOptionE = Boolean(q.option_e && q.option_e.trim());
  const validAnswers = hasOptionE ? ["A", "B", "C", "D", "E"] : ["A", "B", "C", "D"];

  if (!ans || !validAnswers.includes(ans)) {
    errors.push({
      row: rowNumber,
      question_snippet: snippet,
      field: "Correct Answer",
      message: hasOptionE
        ? `Correct answer must be one of: A, B, C, D, or E (got '${q.correct_answer || ""}').`
        : `Correct answer must be one of: A, B, C, or D (got '${q.correct_answer || ""}'). Option E is not set.`,
    });
  }

  // Validate marks
  if (q.marks !== undefined && (isNaN(q.marks) || q.marks <= 0)) {
    errors.push({
      row: rowNumber,
      question_snippet: snippet,
      field: "Marks",
      message: "Marks must be a positive number.",
    });
  }

  // Validate media URL if present
  if (q.question_image_url && !q.question_image_url.startsWith("https://") && !q.question_image_url.startsWith("/")) {
    errors.push({
      row: rowNumber,
      question_snippet: snippet,
      field: "Media URL",
      message: "Media URL must be secure (https://) or an internal path.",
    });
  }

  return errors;
}

/**
 * Checks for duplicates against an existing pool of questions.
 */
export function detectQuestionDuplicates(
  incoming: CompetitionQuestionItem,
  existingPool: CompetitionQuestionItem[]
): DuplicateDetectionResult | null {
  const incHash = incoming.group_hash || computeQuestionHash(incoming);
  const incStem = normaliseQuestionText(incoming.question);

  for (const existing of existingPool) {
    if (existing.id && incoming.id && existing.id === incoming.id) continue;
    if (existing.is_archived) continue;

    const existHash = existing.group_hash || computeQuestionHash(existing);

    // 1. Exact hash duplicate
    if (incHash === existHash) {
      return {
        group_hash: incHash,
        duplicate_type: "exact",
        similarity_score: 1.0,
        existing_question: existing,
        incoming_question: incoming,
        recommendation: "Exact duplicate found. Recommend keeping existing question and discarding new row.",
      };
    }

    // 2. Identical options and answer key with similar question stem
    const sameAns = (existing.correct_answer || "").toUpperCase() === (incoming.correct_answer || "").toUpperCase();
    const sameSubject = (existing.subject || "").toLowerCase() === (incoming.subject || "").toLowerCase();

    if (sameSubject) {
      const existStem = normaliseQuestionText(existing.question);
      const similarity = calculateTextSimilarity(incStem, existStem);

      if (similarity >= 0.90 && sameAns) {
        return {
          group_hash: incHash,
          duplicate_type: "identical_options",
          similarity_score: similarity,
          existing_question: existing,
          incoming_question: incoming,
          recommendation: "High similarity (≥90%) with identical answer key. Requires side-by-side inspection.",
        };
      } else if (similarity >= 0.82) {
        return {
          group_hash: incHash,
          duplicate_type: "similar",
          similarity_score: similarity,
          existing_question: existing,
          incoming_question: incoming,
          recommendation: "Potentially equivalent question wording (≥82%). Inspect side-by-side.",
        };
      }
    }
  }

  return null;
}

/**
 * Parses, validates, and simulates/commits CSV import into a competition question bank.
 */
export function parseAndValidateCompetitionCSV(
  csvContent: string,
  bankId: string,
  userId: string,
  existingBankQuestions: CompetitionQuestionItem[] = []
): CSVImportSummary {
  const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
    header: true,
    skipEmptyLines: "greedy",
  });

  const summary: CSVImportSummary = {
    total_rows: parsed.data.length,
    imported_count: 0,
    rejected_count: 0,
    duplicates_count: 0,
    review_needed_count: 0,
    errors: [],
    detected_duplicates: [],
    imported_questions: [],
  };

  const cumulativePool = [...existingBankQuestions];

  parsed.data.forEach((row, idx) => {
    const rowNum = idx + 2; // header is row 1

    // Normalise headers (case-insensitive mapping)
    const findCol = (keyName: string): string => {
      const match = Object.keys(row).find(
        (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === keyName.toLowerCase().replace(/[^a-z0-9]/g, "")
      );
      return match ? row[match] || "" : "";
    };

    const questionText = findCol("question");
    const subject = findCol("subject");
    const topic = findCol("topic") || undefined;
    const subtopic = findCol("subtopic") || undefined;
    const difficultyRaw = (findCol("difficulty") || "medium").toLowerCase();
    const difficulty: QuestionDifficulty =
      difficultyRaw === "easy" || difficultyRaw === "hard" ? difficultyRaw : "medium";
    const questionType = findCol("questiontype") || "multiple_choice";

    const optA = findCol("optiona");
    const optB = findCol("optionb");
    const optC = findCol("optionc");
    const optD = findCol("optiond");
    const optE = findCol("optione") || null;

    const correctAns = (findCol("correctanswer") || findCol("answer") || "").trim().toUpperCase();
    const explanation = findCol("explanation") || undefined;
    const marksRaw = findCol("marks");
    const marks = marksRaw && !isNaN(parseFloat(marksRaw)) ? parseFloat(marksRaw) : 1.0;
    const tagsRaw = findCol("tags");
    const tags = tagsRaw
      ? tagsRaw
          .split(/[,;]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
    const mediaUrl = findCol("mediaurl") || findCol("imageurl") || undefined;

    const candidate: CompetitionQuestionItem = {
      bank_id: bankId,
      question: questionText,
      subject,
      topic,
      subtopic,
      difficulty,
      question_type: questionType,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      option_e: optE,
      correct_answer: correctAns,
      explanation,
      marks,
      tags,
      question_image_url: mediaUrl,
      status: "approved",
      created_by: userId,
    };

    candidate.group_hash = computeQuestionHash(candidate);

    // Validate fields
    const rowErrors = validateQuestionItem(candidate, rowNum);
    if (rowErrors.length > 0) {
      summary.rejected_count++;
      summary.errors.push(...rowErrors);
      return;
    }

    // Check for duplicates
    const dupResult = detectQuestionDuplicates(candidate, cumulativePool);
    if (dupResult) {
      summary.duplicates_count++;
      summary.detected_duplicates.push(dupResult);
      if (dupResult.duplicate_type === "exact") {
        summary.rejected_count++;
        summary.errors.push({
          row: rowNum,
          question_snippet: questionText.slice(0, 50),
          field: "Duplicate",
          message: `Exact duplicate detected: identical to existing question in bank (Hash: ${dupResult.group_hash}).`,
        });
        return;
      } else {
        // High similarity: flagged for review
        summary.review_needed_count++;
        candidate.status = "review";
      }
    }

    // Question passed validation
    summary.imported_count++;
    summary.imported_questions.push(candidate);
    cumulativePool.push(candidate);
  });

  return summary;
}

// ============================================================================
// QUESTION LIFECYCLE CONTROLS
// ============================================================================

export const VALID_LIFECYCLE_TRANSITIONS: Record<QuestionStatus, QuestionStatus[]> = {
  draft: ["review", "archived"],
  review: ["draft", "approved", "archived"],
  approved: ["published", "review", "archived"],
  published: ["archived"],
  archived: ["draft"],
};

export function canTransitionQuestionStatus(
  currentStatus: QuestionStatus,
  targetStatus: QuestionStatus,
  actor: { id: string; role: string; created_by: string }
): { allowed: boolean; reason?: string } {
  const allowedNext = VALID_LIFECYCLE_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid status transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  // Question creators must not be able to approve their own questions where independent approval is required
  if (targetStatus === "approved" || targetStatus === "published") {
    if (actor.id === actor.created_by && actor.role !== "super_admin" && actor.role !== "competition_admin") {
      return {
        allowed: false,
        reason: "Separation of duties: Creators cannot self-approve questions for publication. An independent administrator must review and approve.",
      };
    }
  }

  return { allowed: true };
}
