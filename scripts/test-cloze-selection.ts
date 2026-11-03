// Comprehensive Test Suite for Cloze Test Integration and Exam Engine Improvements
// Tests all 10 verification points mandated in the engineering specification.

import assert from "node:assert/strict";
import { OFFICIAL_UTME_ENGLISH_BLUEPRINT } from "../app/lib/examEngine/blueprints";
import { selectEnglishExaminationPaper } from "../app/lib/examEngine/englishSelector";
import { EngineQuestion } from "../app/lib/examEngine/types";
import { getSupabaseServerClient } from "../app/lib/supabaseServer";

console.log("=================================================================");
console.log("BRAINLAB CBT - CLOZE TEST INTEGRATION TEST & VALIDATION SUITE");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

function createCompleteMockBank(options?: {
  clozePassagesCount?: number;
  clozePassageQuestionsCount?: number;
  includeIncompletePassage?: boolean;
  includeInactiveCloze?: boolean;
}): EngineQuestion[] {
  const bank: EngineQuestion[] = [];
  let id = 1000;
  const numPassages = options?.clozePassagesCount ?? 3;
  const qPerPassage = options?.clozePassageQuestionsCount ?? 10;

  // 1. Comprehension Passages (2 passages, 10 questions each)
  for (let p = 1; p <= 2; p++) {
    for (let q = 1; q <= 10; q++) {
      bank.push({
        id: id++,
        subject: "English",
        section: "comprehension",
        category: "Comprehension passages",
        topic: "Comprehension passages",
        passage_id: `COMP_PASSAGE_${p}`,
        passage_title: `Comprehension Passage ${p}`,
        passage_text: `Text of comprehension passage ${p}...`,
        question: `Comprehension question ${q} on passage ${p}`,
        option_a: "Option A",
        option_b: "Option B",
        option_c: "Option C",
        option_d: "Option D",
        correct_answer: "A",
        marks: 3,
        is_active: true,
      });
    }
  }

  // 2. Cloze Passages
  for (let p = 1; p <= numPassages; p++) {
    for (let q = 1; q <= qPerPassage; q++) {
      bank.push({
        id: id++,
        subject: "English",
        section: "cloze",
        category: "Cloze passage",
        topic: "Cloze passage",
        passage_id: `CLOZE_PASSAGE_${p}`,
        passage_title: `Cloze Passage ${p}`,
        passage_text: `Cloze passage text with blanks [1] through [10]...`,
        question: `Select the option that best completes blank [${q}] in the passage.`,
        option_a: `Word ${q}A`,
        option_b: `Word ${q}B`,
        option_c: `Word ${q}C`,
        option_d: `Word ${q}D`,
        correct_answer: "B",
        marks: 2,
        is_active: true,
      });
    }
  }

  // Optional: Add incomplete passage (only 5 questions)
  if (options?.includeIncompletePassage) {
    for (let q = 1; q <= 5; q++) {
      bank.push({
        id: id++,
        subject: "English",
        section: "cloze",
        category: "Cloze passage",
        topic: "Cloze passage",
        passage_id: "INCOMPLETE_CLOZE_PASSAGE",
        passage_title: "Incomplete Cloze Passage",
        passage_text: "Incomplete passage text...",
        question: `Incomplete blank [${q}]`,
        option_a: "A",
        option_b: "B",
        option_c: "C",
        option_d: "D",
        correct_answer: "A",
        marks: 2,
        is_active: true,
      });
    }
  }

  // Optional: Add passage with inactive/archived questions
  if (options?.includeInactiveCloze) {
    for (let q = 1; q <= 10; q++) {
      bank.push({
        id: id++,
        subject: "English",
        section: "cloze",
        category: "Cloze passage",
        topic: "Cloze passage",
        passage_id: "INACTIVE_CLOZE_PASSAGE",
        passage_title: "Inactive Cloze Passage",
        passage_text: "Inactive passage text...",
        question: `Inactive blank [${q}]`,
        option_a: "A",
        option_b: "B",
        option_c: "C",
        option_d: "D",
        correct_answer: "A",
        marks: 2,
        is_active: q <= 8, // Questions 9 and 10 are inactive!
        is_archived: q === 10,
      });
    }
  }

  // 3. Reading Text ("The Lekki Headmaster", 20 questions)
  for (let q = 1; q <= 20; q++) {
    bank.push({
      id: id++,
      subject: "English",
      section: "literature",
      category: "Literature text - Lekki headmaster",
      topic: "Literature text - Lekki headmaster",
      reading_text_id: "lekki_headmaster",
      question: `Question ${q} about The Lekki Headmaster`,
      option_a: "Option A",
      option_b: "Option B",
      option_c: "Option C",
      option_d: "Option D",
      correct_answer: "C",
      marks: 1,
      is_active: true,
    });
  }

  // 4. Sentence Interpretation (10 questions)
  for (let q = 1; q <= 10; q++) {
    bank.push({
      id: id++,
      subject: "English",
      section: "objective",
      category: "Sentence Interpretation",
      topic: "Sentence Interpretation",
      question: `Interpretation question ${q}`,
      option_a: "Option A",
      option_b: "Option B",
      option_c: "Option C",
      option_d: "Option D",
      correct_answer: "A",
      marks: 2,
      is_active: true,
    });
  }

  // 5. Antonyms (10 questions)
  for (let q = 1; q <= 10; q++) {
    bank.push({
      id: id++,
      subject: "English",
      section: "objective",
      category: "Antonyms",
      topic: "Antonyms",
      question: `Antonym question ${q}`,
      option_a: "Option A",
      option_b: "Option B",
      option_c: "Option C",
      option_d: "Option D",
      correct_answer: "B",
      marks: 2,
      is_active: true,
    });
  }

  // 6. Synonyms (10 questions)
  for (let q = 1; q <= 10; q++) {
    bank.push({
      id: id++,
      subject: "English",
      section: "objective",
      category: "Synonyms",
      topic: "Synonyms",
      question: `Synonym question ${q}`,
      option_a: "Option A",
      option_b: "Option B",
      option_c: "Option C",
      option_d: "Option D",
      correct_answer: "A",
      marks: 1,
      is_active: true,
    });
  }

  // 7. Sentence Completion (20 questions)
  for (let q = 1; q <= 20; q++) {
    bank.push({
      id: id++,
      subject: "English",
      section: "objective",
      category: "Sentence Completion",
      topic: "Sentence Completion",
      question: `Completion question ${q}`,
      option_a: "Option A",
      option_b: "Option B",
      option_c: "Option C",
      option_d: "Option D",
      correct_answer: "C",
      marks: 1,
      is_active: true,
    });
  }

  // 8. Oral Forms (20 questions)
  for (let q = 1; q <= 20; q++) {
    bank.push({
      id: id++,
      subject: "English",
      section: "objective",
      category: "Oral English: Vowels",
      topic: "Oral English: Vowels",
      question: `Oral question ${q}`,
      option_a: "Option A",
      option_b: "Option B",
      option_c: "Option C",
      option_d: "Option D",
      correct_answer: "D",
      marks: 1,
      is_active: true,
    });
  }

  return bank;
}

async function runAllTests() {
  // Test 1: Complete Cloze passage contains exactly 10 questions
  await runTest("A complete Cloze passage unit contains exactly 10 linked questions", () => {
    const bank = createCompleteMockBank();
    const result = selectEnglishExaminationPaper(bank);
    assert.equal(result.success, true, `Selection failed: ${result.errors.join("; ")}`);
    const clozeQuestions = result.questions.filter((q) => q.section === "cloze" || q.category === "Cloze passage");
    assert.equal(clozeQuestions.length, 10, `Expected exactly 10 Cloze questions, got ${clozeQuestions.length}`);
  });

  // Test 2: One examination selects only one Cloze passage
  await runTest("One examination selects only ONE Cloze passage (never multiple)", () => {
    const bank = createCompleteMockBank({ clozePassagesCount: 5 });
    const result = selectEnglishExaminationPaper(bank);
    assert.equal(result.success, true);
    const clozeQuestions = result.questions.filter((q) => q.section === "cloze" || q.category === "Cloze passage");
    const uniquePassageIds = new Set(clozeQuestions.map((q) => q.passage_id));
    assert.equal(uniquePassageIds.size, 1, `Expected exactly 1 unique passage_id, got ${uniquePassageIds.size}`);
  });

  // Test 3: All ten selected questions share the same passage_id
  await runTest("All 10 selected Cloze questions share the exact same passage_id", () => {
    const bank = createCompleteMockBank({ clozePassagesCount: 4 });
    const result = selectEnglishExaminationPaper(bank);
    assert.equal(result.success, true);
    const clozeQuestions = result.questions.filter((q) => q.section === "cloze" || q.category === "Cloze passage");
    const firstPassageId = clozeQuestions[0].passage_id;
    assert.ok(firstPassageId, "Passage ID must not be null");
    for (const q of clozeQuestions) {
      assert.equal(q.passage_id, firstPassageId, `Question ${q.id} has mismatched passage_id`);
    }
  });

  // Test 4: Questions remain in their original sequence (1 to 10)
  await runTest("Questions remain strictly in their original sequence from 1 to 10", () => {
    const bank = createCompleteMockBank();
    const result = selectEnglishExaminationPaper(bank);
    assert.equal(result.success, true);
    const clozeQuestions = result.questions.filter((q) => q.section === "cloze" || q.category === "Cloze passage");
    assert.equal(clozeQuestions.length, 10);
    for (let i = 0; i < 10; i++) {
      const q = clozeQuestions[i];
      assert.ok(
        q.question.includes(`[${i + 1}]`),
        `Expected question ${i + 1} to correspond to blank [${i + 1}], got '${q.question}'`
      );
    }
  });

  // Test 5: Questions from different passages are never mixed
  await runTest("Questions from different Cloze passages are never mixed together", () => {
    const bank = createCompleteMockBank({ clozePassagesCount: 10 });
    // Run 10 simulations
    for (let run = 0; run < 10; run++) {
      const result = selectEnglishExaminationPaper(bank);
      assert.equal(result.success, true);
      const clozeQuestions = result.questions.filter((q) => q.section === "cloze" || q.category === "Cloze passage");
      const passageIds = new Set(clozeQuestions.map((q) => q.passage_id));
      assert.equal(passageIds.size, 1, `Run ${run}: Passages were mixed: ${Array.from(passageIds).join(", ")}`);
    }
  });

  // Test 6: Incomplete passages (<10 questions) are excluded
  await runTest("Incomplete passages (<10 questions) are strictly excluded from selection", () => {
    const bank = createCompleteMockBank({
      clozePassagesCount: 2,
      includeIncompletePassage: true,
    });
    // Run multiple selections to ensure the incomplete passage is never picked
    for (let run = 0; run < 15; run++) {
      const result = selectEnglishExaminationPaper(bank);
      assert.equal(result.success, true);
      const clozeQuestions = result.questions.filter((q) => q.section === "cloze" || q.category === "Cloze passage");
      for (const q of clozeQuestions) {
        assert.notEqual(
          q.passage_id,
          "INCOMPLETE_CLOZE_PASSAGE",
          "Incomplete passage was erroneously selected!"
        );
      }
    }
  });

  // Test 7: Inactive and archived questions are excluded, preventing partial groups
  await runTest("Passages with inactive or archived questions are excluded from selection", () => {
    const bank = createCompleteMockBank({
      clozePassagesCount: 2,
      includeInactiveCloze: true,
    });
    for (let run = 0; run < 15; run++) {
      const result = selectEnglishExaminationPaper(bank);
      assert.equal(result.success, true);
      const clozeQuestions = result.questions.filter((q) => q.section === "cloze" || q.category === "Cloze passage");
      for (const q of clozeQuestions) {
        assert.notEqual(
          q.passage_id,
          "INACTIVE_CLOZE_PASSAGE",
          "Passage with inactive questions was erroneously selected!"
        );
      }
    }
  });

  // Test 8: Engine rejects incomplete selection instead of filling with unrelated Cloze questions
  await runTest("Engine rejects selection if no complete 10-question Cloze passage exists", () => {
    // Bank with NO complete Cloze passage (only incomplete ones)
    const bank = createCompleteMockBank({
      clozePassagesCount: 0,
      includeIncompletePassage: true,
    });
    const result = selectEnglishExaminationPaper(bank);
    assert.equal(result.success, false, "Should fail when no complete Cloze passage exists");
    assert.ok(
      result.errors.some((e) => e.includes("Cloze Test passage")),
      `Expected error about Cloze Test passage, got: ${result.errors.join("; ")}`
    );
  });

  // Test 9: Exactly 60 English questions and 90 raw marks generated
  await runTest("The examination still generates exactly 60 English questions and 90 raw marks", () => {
    const bank = createCompleteMockBank();
    const result = selectEnglishExaminationPaper(bank);
    assert.equal(result.success, true);
    assert.equal(result.questions.length, 60, `Expected 60 questions, got ${result.questions.length}`);
    assert.equal(result.rawTotalMarks, 90, `Expected 90 raw marks, got ${result.rawTotalMarks}`);

    // Check Cloze specific marks: 10 questions @ 2 marks = 20 raw marks
    const clozeQuestions = result.questions.filter((q) => q.section === "cloze" || q.category === "Cloze passage");
    assert.equal(clozeQuestions.length, 10);
    const clozeRawTotal = clozeQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    assert.equal(clozeRawTotal, 20, `Expected 20 raw marks for Cloze, got ${clozeRawTotal}`);
  });

  // Test 10: Comprehension and Reading Text selection remain unaffected
  await runTest("Comprehension and Reading Text selections remain completely unaffected", () => {
    const bank = createCompleteMockBank();
    const result = selectEnglishExaminationPaper(bank);
    assert.equal(result.success, true);

    // Comprehension: exactly 5 questions @ 3 marks = 15 marks
    const compQuestions = result.questions.filter((q) => q.section === "comprehension");
    assert.equal(compQuestions.length, 5, `Comprehension count mismatch: ${compQuestions.length}`);
    const compRaw = compQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    assert.equal(compRaw, 15, `Comprehension marks mismatch: ${compRaw}`);
    // All 5 comprehension questions share the same passage
    const compPassageIds = new Set(compQuestions.map((q) => q.passage_id));
    assert.equal(compPassageIds.size, 1, "Comprehension questions must belong to a single passage");

    // Reading Text: exactly 10 questions @ 1 mark = 10 marks
    const readingTextQuestions = result.questions.filter(
      (q) => q.section === "literature" || (q.category && q.category.includes("Lekki"))
    );
    assert.equal(readingTextQuestions.length, 10, `Reading text count mismatch: ${readingTextQuestions.length}`);
    const readingRaw = readingTextQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
    assert.equal(readingRaw, 10, `Reading text marks mismatch: ${readingRaw}`);
  });

  // Test 11: LIVE DATABASE VERIFICATION against BrainLabCBT-Staging
  await runTest("Live Database Verification against BrainLabCBT-Staging (23 passages, 230 questions)", async () => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("subject", "English")
      .eq("is_active", true);

    assert.equal(error, null, `Database query failed: ${error?.message}`);
    assert.ok(data && data.length > 0, "No active English questions returned from staging database");

    // Filter Cloze questions from live DB
    const liveCloze = data.filter((q) => q.section === "cloze");
    assert.equal(liveCloze.length, 230, `Expected 230 live Cloze questions, found ${liveCloze.length}`);

    // Check passage grouping across all 23 passages
    const groups = new Map<string, typeof liveCloze>();
    for (const q of liveCloze) {
      if (!groups.has(q.passage_id!)) groups.set(q.passage_id!, []);
      groups.get(q.passage_id!)!.push(q);
    }
    assert.equal(groups.size, 23, `Expected 23 distinct Cloze passages, found ${groups.size}`);

    // Check that every live passage has exactly 10 questions and marks = 2
    for (const [pid, pQuestions] of groups.entries()) {
      assert.equal(
        pQuestions.length,
        10,
        `Passage ${pid} does not have exactly 10 questions (has ${pQuestions.length})`
      );
      for (const q of pQuestions) {
        assert.equal(Number(q.marks), 2, `Question ${q.id} in passage ${pid} does not have 2 marks`);
      }
    }

    // Run exam generator against the full live database English bank
    const liveResult = selectEnglishExaminationPaper(data as EngineQuestion[]);
    assert.equal(liveResult.success, true, `Live exam generation failed: ${liveResult.errors.join("; ")}`);
    assert.equal(liveResult.questions.length, 60, `Live paper length mismatch: ${liveResult.questions.length}`);
    assert.equal(liveResult.rawTotalMarks, 90, `Live paper raw marks mismatch: ${liveResult.rawTotalMarks}`);

    // Verify the live generated paper contains exactly one Cloze passage with 10 sequential questions
    const selectedCloze = liveResult.questions.filter((q) => q.section === "cloze");
    assert.equal(selectedCloze.length, 10, "Live paper does not contain 10 Cloze questions");
    const liveSelectedPassageId = selectedCloze[0].passage_id;
    for (const q of selectedCloze) {
      assert.equal(q.passage_id, liveSelectedPassageId, "Live paper mixed questions from multiple Cloze passages");
    }
  });

  console.log("\n-----------------------------------------------------------------");
  console.log(`CLOZE INTEGRATION RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("-----------------------------------------------------------------");
  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
