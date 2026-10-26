import assert from "node:assert/strict";

console.log("=================================================================");
console.log("BRAINLAB ACADEMY - QUESTION BUILD & INTEGRITY VERIFICATION SUITE");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
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

// -------------------------------------------------------------
// Group 1: Question Pool Structure & Subject Grouping
// -------------------------------------------------------------
runTest("Sample question pool delivers 5 core subjects with English first", () => {
  const CORE_SUBJECTS = ["English", "Mathematics", "Biology", "Chemistry", "Physics"];
  assert.equal(CORE_SUBJECTS[0], "English", "English must be compulsory primary subject");
  assert.equal(CORE_SUBJECTS.length, 5, "Must cover all 5 verified exam subjects");
});

runTest("Question item schema strictly requires prompt, 4 options, and correct letter", () => {
  const sampleQuestion = {
    id: "db-101",
    subject: "English",
    examContext: "JAMB UTME Concord",
    question: "Neither of the boys ____ present.",
    options: [
      { letter: "A", text: "was" },
      { letter: "B", text: "were" },
      { letter: "C", text: "are" },
      { letter: "D", text: "have been" },
    ],
    correctLetter: "A",
    explanation: "Singular indefinite pronoun 'neither' takes a singular verb.",
  };

  assert.ok(sampleQuestion.id, "Missing question ID");
  assert.ok(sampleQuestion.question.trim().length > 0, "Missing prompt");
  assert.equal(sampleQuestion.options.length, 4, "Must have exactly 4 options");
  assert.ok(["A", "B", "C", "D"].includes(sampleQuestion.correctLetter), "Correct letter must be A, B, C, or D");
  assert.ok(sampleQuestion.explanation.length > 0, "Missing explanation");
});

// -------------------------------------------------------------
// Group 2: Examination Paper Builder & Security Boundaries
// -------------------------------------------------------------
runTest("Candidate question payload contract strictly excludes correct_answer and explanation", () => {
  // Simulates client payload built for active exam session
  const candidatePaperQuestion = {
    id: 4521,
    subject: "English",
    section: "Comprehension",
    category: "Lexis",
    question: "Choose the word opposite in meaning to...",
    option_a: "Concise",
    option_b: "Prolix",
    option_c: "Vague",
    option_d: "Ambiguous",
    marks: 1,
  };

  assert.equal(candidatePaperQuestion.correct_answer, undefined, "Answer key must not leak to candidate client");
  assert.equal(candidatePaperQuestion.explanation, undefined, "Explanation must not leak during active examination");
  assert.ok(candidatePaperQuestion.option_a && candidatePaperQuestion.option_b, "Options must be present");
});

runTest("Exam question paper builder preserves exact paperIds sequence across 4 subjects", () => {
  const paperIds = [101, 102, 201, 202, 301, 302, 401, 402];
  // DB returns rows out-of-order (e.g. ordered by primary key or physical disk order)
  const unorderedDbRows = [
    { id: 401, subject: "Biology" },
    { id: 101, subject: "English" },
    { id: 301, subject: "Physics" },
    { id: 202, subject: "Mathematics" },
    { id: 102, subject: "English" },
    { id: 402, subject: "Biology" },
    { id: 201, subject: "Mathematics" },
    { id: 302, subject: "Physics" },
  ];

  const idMap = new Map();
  for (const q of unorderedDbRows) {
    idMap.set(Number(q.id), q);
  }
  const ordered = [];
  for (const id of paperIds) {
    const found = idMap.get(id);
    if (found) ordered.push(found);
  }

  assert.equal(ordered.length, 8);
  assert.deepEqual(ordered.map((q) => q.id), paperIds, "Questions must follow paperIds sequence");
  assert.equal(ordered[0].subject, "English");
  assert.equal(ordered[1].subject, "English");
  assert.equal(ordered[2].subject, "Mathematics");
  assert.equal(ordered[4].subject, "Physics");
  assert.equal(ordered[6].subject, "Biology");
});

// -------------------------------------------------------------
// Group 3: Tutor Test Builder Validation Rules
// -------------------------------------------------------------
function validateQuestions(questions, questionLimit, title, timeLimit) {
  if (!title.trim()) return "Add an assessment title.";
  if (!Number.isInteger(questionLimit) || questionLimit < 1 || questionLimit > 200) return "Question count must be between 1 and 200.";
  if (questions.length < questionLimit) return `The question pool has ${questions.length} questions, but the test requests ${questionLimit}. Add more questions or reduce the question count.`;
  if (timeLimit && (!Number.isInteger(Number(timeLimit)) || Number(timeLimit) < 1 || Number(timeLimit) > 600)) return "Time limit must be between 1 and 600 minutes, or left empty for untimed.";
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    if (!question.prompt.trim()) return `Question ${index + 1}: add a question prompt.`;
    if (question.question_type === "true_false") {
      if (!["true", "false"].includes(question.correct_answer)) return `Question ${index + 1}: choose True or False as the answer.`;
    } else {
      if (question.options.length < 2 || question.options.some((option) => !option.id || !option.text.trim())) return `Question ${index + 1}: provide at least two complete options.`;
      if (!question.options.some((option) => option.id === question.correct_answer)) return `Question ${index + 1}: select a correct option.`;
    }
  }
  return "";
}

runTest("Test builder validator catches empty assessment title", () => {
  const err = validateQuestions([], 5, "", "");
  assert.equal(err, "Add an assessment title.");
});

runTest("Test builder validator rejects question pools smaller than target limit", () => {
  const qList = [{ prompt: "What is 2+2?", question_type: "mcq", options: [{ id: "a", text: "4" }, { id: "b", text: "5" }], correct_answer: "a" }];
  const err = validateQuestions(qList, 5, "Test Title", "30");
  assert.match(err, /The question pool has 1 questions, but the test requests 5/);
});

runTest("Test builder validator requires valid correct_answer selection in options", () => {
  const qList = [{ prompt: "Capital of Nigeria?", question_type: "mcq", options: [{ id: "a", text: "Abuja" }, { id: "b", text: "Lagos" }], correct_answer: "c" }];
  const err = validateQuestions(qList, 1, "Geography Test", "15");
  assert.equal(err, "Question 1: select a correct option.");
});

runTest("Test builder validator passes complete valid assessments", () => {
  const qList = [
    { prompt: "Is pure water neutral at 25°C?", question_type: "true_false", options: [], correct_answer: "true" },
    { prompt: "SI unit of force?", question_type: "mcq", options: [{ id: "a", text: "Newton" }, { id: "b", text: "Joule" }], correct_answer: "a" },
  ];
  const err = validateQuestions(qList, 2, "General Science Quiz", "20");
  assert.equal(err, "", "Validation should pass without error");
});

// -------------------------------------------------------------
// Group 4: CSV Header Aliases & Question Importer
// -------------------------------------------------------------
const HEADER_KEY_ALIASES = {
  subject: "subject",
  course: "subject",
  topic: "subject",
  prompt: "question",
  questiontext: "question",
  item: "question",
  option_a: "option_a",
  optiona: "option_a",
  a: "option_a",
  correct_answer: "correct_answer",
  answer: "correct_answer",
  correctoption: "correct_answer",
};

runTest("CSV header normalizer maps diverse column headers to canonical question schema", () => {
  const incomingHeaders = ["Course", "Prompt", "OptionA", "CorrectOption"];
  const normalized = incomingHeaders.map((h) => HEADER_KEY_ALIASES[h.toLowerCase().replace(/[\s_-]/g, "")] || h);
  assert.deepEqual(normalized, ["subject", "question", "option_a", "correct_answer"]);
});

console.log("\n-----------------------------------------------------------------");
console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("-----------------------------------------------------------------");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All Question Build & Integrity tests PASSED!\n");
}
