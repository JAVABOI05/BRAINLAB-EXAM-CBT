import assert from "node:assert/strict";
import {
  OFFICIAL_UTME_ENGLISH_BLUEPRINT,
  OFFICIAL_STANDARD_SUBJECT_BLUEPRINT,
  validateBlueprint,
} from "../app/lib/examEngine/blueprints.ts";
import {
  convertEnglishRawScore,
  convertStandardRawScore,
  markExamAttempt,
  roundUpScore,
} from "../app/lib/examEngine/markingEngine.ts";
import {
  selectEnglishExaminationPaper,
} from "../app/lib/examEngine/englishSelector.ts";
import {
  selectStandardSubjectPaper,
} from "../app/lib/examEngine/subjectSelector.ts";
import {
  calculateTextSimilarity,
  detectDuplicates,
  generateWordDiff,
  normaliseQuestionText,
  scoreQuestionQuality,
} from "../app/lib/examEngine/duplicateDetector.ts";
import {
  checkHighYieldShortages,
  getDefaultHighYieldRules,
} from "../app/lib/examEngine/highYieldManager.ts";

console.log("=================================================================");
console.log("BRAINLAB ACADEMY CBT - MASTER IMPLEMENTATION BLUEPRINT TEST SUITE");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// =================================================================
// 1. STANDARD EXAMINATION & MARKING RULES
// =================================================================
test("Standard exam blueprint validates 40 questions, 2.5 marks/q, 100 max marks", () => {
  const res = validateBlueprint(OFFICIAL_STANDARD_SUBJECT_BLUEPRINT);
  assert.equal(res.valid, true, `Validation failed: ${res.errors.join("; ")}`);
  assert.equal(OFFICIAL_STANDARD_SUBJECT_BLUEPRINT.total_questions, 40);
  assert.equal(OFFICIAL_STANDARD_SUBJECT_BLUEPRINT.raw_max_marks, 100);
});

test("Standard exam 31 correct answers produces 77.5 raw and 78 whole-number display", () => {
  const rawScore = 31 * 2.5; // 77.5
  const res = convertStandardRawScore(rawScore, 100);
  assert.equal(res.rawScore, 77.5, "Raw marks must be exactly 77.5");
  assert.equal(res.displayedScore, 78, "Whole-number display must round upward to 78");
  assert.equal(res.percentage, 77.5, "Percentage must be preserved unrounded");
});

test("Standard exam zero correct answers produces 0/100", () => {
  const res = convertStandardRawScore(0, 100);
  assert.equal(res.rawScore, 0);
  assert.equal(res.displayedScore, 0);
});

test("Standard exam 40 correct answers produces 100/100", () => {
  const res = convertStandardRawScore(100, 100);
  assert.equal(res.rawScore, 100);
  assert.equal(res.displayedScore, 100);
});

// =================================================================
// 2. COMPLETE UTME ENGLISH EXAMINATION BLUEPRINT & CONVERSION
// =================================================================
test("Official UTME English blueprint validates exactly 60 questions and 90 raw marks", () => {
  const res = validateBlueprint(OFFICIAL_UTME_ENGLISH_BLUEPRINT);
  assert.equal(res.valid, true, `Validation failed: ${res.errors.join("; ")}`);
  assert.equal(OFFICIAL_UTME_ENGLISH_BLUEPRINT.total_questions, 60);
  assert.equal(OFFICIAL_UTME_ENGLISH_BLUEPRINT.raw_max_marks, 90);
  assert.equal(OFFICIAL_UTME_ENGLISH_BLUEPRINT.converted_max_marks, 100);
  assert.equal(OFFICIAL_UTME_ENGLISH_BLUEPRINT.sections_config.length, 8);
});

test("English section mark totals match exact BrainLab specification", () => {
  const sections = OFFICIAL_UTME_ENGLISH_BLUEPRINT.sections_config;
  const expectedMap = {
    "Comprehension": { quota: 5, marks: 3, total: 15 },
    "Cloze passage": { quota: 10, marks: 2, total: 20 },
    "Reading text": { quota: 10, marks: 1, total: 10 },
    "Sentence interpretation": { quota: 5, marks: 2, total: 10 },
    "Antonyms": { quota: 5, marks: 2, total: 10 },
    "Synonyms": { quota: 5, marks: 1, total: 5 },
    "Sentence completion": { quota: 10, marks: 1, total: 10 },
    "Oral forms": { quota: 10, marks: 1, total: 10 },
  };

  for (const s of sections) {
    const exp = expectedMap[s.section];
    assert.ok(exp, `Unexpected section: ${s.section}`);
    assert.equal(s.quota, exp.quota, `${s.section} quota mismatch`);
    assert.equal(s.marks_per_question, exp.marks, `${s.section} marks mismatch`);
    assert.equal(s.raw_total, exp.total, `${s.section} raw total mismatch`);
  }
});

test("English conversion: Raw 45/90 produces converted 50.00 and displayed 50/100", () => {
  const res = convertEnglishRawScore(45, 90);
  assert.equal(res.rawScore, 45);
  assert.equal(res.convertedScore, 50);
  assert.equal(res.displayedScore, 50);
});

test("English conversion: Raw 72/90 produces converted 80.00 and displayed 80/100", () => {
  const res = convertEnglishRawScore(72, 90);
  assert.equal(res.rawScore, 72);
  assert.equal(res.convertedScore, 80);
  assert.equal(res.displayedScore, 80);
});

test("English conversion: Raw 89/90 produces converted 98.89 and upward-rounded 99/100", () => {
  const res = convertEnglishRawScore(89, 90);
  assert.equal(res.rawScore, 89);
  assert.equal(res.convertedScore, 98.89);
  assert.equal(res.displayedScore, 99, "89/90 must round upward to 99/100");
});

test("English conversion: Raw 90/90 produces converted 100.00 and displayed 100/100", () => {
  const res = convertEnglishRawScore(90, 90);
  assert.equal(res.rawScore, 90);
  assert.equal(res.convertedScore, 100);
  assert.equal(res.displayedScore, 100);
});

// =================================================================
// 3. MULTI-STAGE ENGLISH SELECTION ALGORITHM
// =================================================================
test("English generator selects exactly 60 questions respecting all 8 sections and passage integrity", () => {
  const mockEnglishBank = [];
  let idSeq = 1;

  // 1. Comprehension passage (passage_id: CP1, 10 questions)
  for (let i = 0; i < 10; i++) {
    mockEnglishBank.push({
      id: idSeq++,
      subject: "English",
      section: "Comprehension",
      category: "Comprehension passages",
      passage_id: "CP1",
      passage_title: "The Scholar's Path",
      passage_text: "In the quiet library of BrainLab...",
      question: `Comprehension question ${i + 1}?`,
      option_a: "Alpha", option_b: "Beta", option_c: "Gamma", option_d: "Delta",
      correct_answer: "A", marks: 3, is_active: true,
    });
  }

  // 2. Cloze passage (passage_id: CL1, 15 questions)
  for (let i = 0; i < 15; i++) {
    mockEnglishBank.push({
      id: idSeq++,
      subject: "English",
      section: "objective",
      category: "Cloze passage",
      passage_id: "CL1",
      passage_title: "Economic Horizons",
      passage_text: "Sustainable growth requires [1] and [2]...",
      question: `Choose the best word for blank [${i + 1}]`,
      option_a: "foster", option_b: "stagnate", option_c: "plummet", option_d: "erode",
      correct_answer: "B", marks: 2, is_active: true,
    });
  }

  // 3. Reading text (The Lekki Headmaster, 20 questions)
  for (let i = 0; i < 20; i++) {
    mockEnglishBank.push({
      id: idSeq++,
      subject: "English",
      section: "literature",
      category: "Literature text - Lekki headmaster",
      question: `In The Lekki Headmaster, how did the protagonist handle episode ${i + 1}?`,
      option_a: "Wisely", option_b: "Hastily", option_c: "Indifferently", option_d: "Secretly",
      correct_answer: "C", marks: 1, is_active: true,
    });
  }

  // 4. Sentence interpretation (10 questions)
  for (let i = 0; i < 10; i++) {
    mockEnglishBank.push({
      id: idSeq++,
      subject: "English",
      section: "objective",
      category: "Sentence Interpretation",
      question: `The candidate was caught between the devil and the deep blue sea. This means:`,
      option_a: "In a dilemma", option_b: "Swimming", option_c: "Afraid", option_d: "Guilty",
      correct_answer: "A", marks: 2, is_active: true,
    });
  }

  // 5. Antonyms (10 questions)
  for (let i = 0; i < 10; i++) {
    mockEnglishBank.push({
      id: idSeq++,
      subject: "English",
      section: "objective",
      category: "Antonyms",
      question: `Choose the word opposite in meaning to 'frugal':`,
      option_a: "Extravagant", option_b: "Economical", option_c: "Thrifty", option_d: "Careful",
      correct_answer: "A", marks: 2, is_active: true,
    });
  }

  // 6. Synonyms (10 questions)
  for (let i = 0; i < 10; i++) {
    mockEnglishBank.push({
      id: idSeq++,
      subject: "English",
      section: "objective",
      category: "Synonyms",
      question: `Choose the word nearest in meaning to 'lucid':`,
      option_a: "Clear", option_b: "Opaque", option_c: "Confused", option_d: "Dark",
      correct_answer: "A", marks: 1, is_active: true,
    });
  }

  // 7. Sentence completion (20 questions)
  for (let i = 0; i < 20; i++) {
    mockEnglishBank.push({
      id: idSeq++,
      subject: "English",
      section: "objective",
      category: "Sentence Completion",
      question: `Neither of the students ____ registered for the examination.`,
      option_a: "was", option_b: "were", option_c: "are", option_d: "have been",
      correct_answer: "A", marks: 1, is_active: true,
    });
  }

  // 8. Oral forms (20 questions)
  for (let i = 0; i < 20; i++) {
    mockEnglishBank.push({
      id: idSeq++,
      subject: "English",
      section: "objective",
      category: "Oral English: Vowels",
      question: `Which word contains the vowel sound /i:/?`,
      option_a: "Beat", option_b: "Bit", option_c: "Bet", option_d: "Bat",
      correct_answer: "A", marks: 1, is_active: true,
    });
  }

  const selection = selectEnglishExaminationPaper(mockEnglishBank, OFFICIAL_UTME_ENGLISH_BLUEPRINT);

  assert.equal(selection.success, true, `Selection errors: ${selection.errors.join("; ")}`);
  assert.equal(selection.questions.length, 60, "Must select exactly 60 questions");
  assert.equal(selection.rawTotalMarks, 90, "Must sum to exactly 90 raw marks");

  assert.equal(selection.sectionCounts["Comprehension"], 5);
  assert.equal(selection.sectionCounts["Cloze passage"], 10);
  assert.equal(selection.sectionCounts["Reading text"], 10);
  assert.equal(selection.sectionCounts["Sentence interpretation"], 5);
  assert.equal(selection.sectionCounts["Antonyms"], 5);
  assert.equal(selection.sectionCounts["Synonyms"], 5);
  assert.equal(selection.sectionCounts["Sentence completion"], 10);
  assert.equal(selection.sectionCounts["Oral forms"], 10);

  const idSet = new Set(selection.questions.map((q) => q.id));
  assert.equal(idSet.size, 60, "Generated paper must have 60 unique question IDs");
});

// =================================================================
// 4. FIVE-OPTION QUESTION SUPPORT (A-E)
// =================================================================
test("Five-option questions with option E are preserved and graded correctly", () => {
  const fiveOptionQuestion = {
    id: 501,
    subject: "Mathematics",
    section: "objective",
    category: "Calculus",
    question: "Find the derivative of f(x) = x^5 at x = 2.",
    option_a: "16",
    option_b: "32",
    option_c: "64",
    option_d: "75",
    option_e: "80",
    correct_answer: "E",
    marks: 2.5,
    is_active: true,
  };

  assert.ok(fiveOptionQuestion.option_e, "Option E must be present");

  // Candidate answers E (correct)
  const markingCorrect = markExamAttempt([fiveOptionQuestion], { 501: "E" });
  assert.equal(markingCorrect.question_details[0].is_correct, true);
  assert.equal(markingCorrect.question_details[0].raw_marks_awarded, 2.5);

  // Candidate answers D (wrong)
  const markingWrong = markExamAttempt([fiveOptionQuestion], { 501: "D" });
  assert.equal(markingWrong.question_details[0].is_correct, false);
  assert.equal(markingWrong.question_details[0].raw_marks_awarded, 0);
});

// =================================================================
// 5. DUPLICATE QUESTIONS DETECTION & QUALITY SCORING
// =================================================================
test("Duplicate detector classifies exact matches ignoring harmless formatting differences", () => {
  const q1 = {
    id: 1001,
    subject: "Physics",
    section: "objective",
    category: "Mechanics",
    question: "What is the SI unit of electric force?",
    option_a: "Newton", option_b: "Joule", option_c: "Watt", option_d: "Pascal",
    correct_answer: "A", marks: 2.5, explanation: "Force is always measured in Newtons (N).",
    verification_status: "verified", is_active: true,
  };

  const q2 = {
    id: 1002,
    subject: "Physics",
    section: "objective",
    category: "Mechanics",
    question: "WHAT IS THE SI UNIT OF ELECTRIC FORCE???",
    option_a: "Newton", option_b: "Joule", option_c: "Watt", option_d: "Pascal",
    correct_answer: "A", marks: 2.5, explanation: "",
    verification_status: "unreviewed", is_active: true,
  };

  const groups = detectDuplicates([q1, q2]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].type, "exact");
  assert.equal(groups[0].similarityScore, 1.0);
  assert.equal(groups[0].recommendedRetainId, 1001, "q1 must be recommended because of completeness and explanation");
});

test("Duplicate detector flags near-duplicates with similarity percentage", () => {
  const sim = calculateTextSimilarity(
    "Calculate the acceleration of a 5kg mass subjected to a net force of 20N.",
    "Find the acceleration of a 5kg object acted upon by a net force of 20N."
  );

  assert.ok(sim >= 0.65, `Similarity was ${sim}, expected >= 0.65`);
});

// =================================================================
// 6. HIGH-YIELD TOPIC QUOTAS & SHORTAGE WARNINGS
// =================================================================
test("High-yield shortage detector reports topic shortages accurately", () => {
  const rules = [
    {
      id: "r1",
      subject: "Mathematics",
      topic: "Calculus: Differentiation",
      quota: 5,
      priority: 1,
      min_questions: 2,
      max_questions: 8,
      isActive: true,
    },
    {
      id: "r2",
      subject: "Mathematics",
      topic: "Quantum Topology",
      quota: 4,
      priority: 2,
      min_questions: 1,
      max_questions: 5,
      isActive: true,
    },
  ];

  const availableMath = [
    { id: 1, subject: "Mathematics", topic: "Calculus: Differentiation", question: "q1", marks: 2.5 },
    { id: 2, subject: "Mathematics", topic: "Calculus: Differentiation", question: "q2", marks: 2.5 },
  ];

  const { warnings, totalReserved } = checkHighYieldShortages(rules, availableMath, 40);

  assert.equal(totalReserved, 9);
  assert.equal(warnings.length, 2, "Must generate warnings for both Calculus (shortage) and Quantum Topology (0 available)");
  assert.equal(warnings[0].severity, "warning");
  assert.equal(warnings[1].severity, "critical");
});

console.log("\n-----------------------------------------------------------------");
console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("-----------------------------------------------------------------");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All CBT Master Blueprint Acceptance Tests PASSED!\n");
}
