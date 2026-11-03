import fs from "fs";
import { createClient } from "@supabase/supabase-js";

// Load .env.local into process.env if not set
if (fs.existsSync(".env.local")) {
  const envText = fs.readFileSync(".env.local", "utf8");
  for (const line of envText.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { resolveUtme4Subjects, isAcademicSubject } from "../app/lib/examEngine/subjectResolver.ts";
import { generateExamPaper } from "../app/lib/examEngine/index.ts";
import { markExamAttempt } from "../app/lib/examEngine/markingEngine.ts";

async function main() {
  console.log("=== BRAINLAB CBT UTME SUBJECT COMBINATION & 400-POINT SCORING TEST ===\n");

  // TEST 1: Subject Resolver Logic
  console.log("Test 1: Subject Resolver Verification");
  
  // 1a: Biology selected as elective (Medical Science track)
  const bioCombo1 = resolveUtme4Subjects({ primaryElective: "Biology" });
  console.log("  1a (Elective=Biology):", bioCombo1);
  if (bioCombo1.includes("Mathematics")) throw new Error("FAIL: Mathematics was included for Biology student!");
  if (!bioCombo1.includes("Chemistry")) throw new Error("FAIL: Chemistry was omitted for Biology student!");
  if (!bioCombo1.includes("Physics")) throw new Error("FAIL: Physics was omitted for Biology student!");
  if (bioCombo1[0] !== "English") throw new Error("FAIL: Slot 1 is not English!");
  if (bioCombo1.length !== 4) throw new Error("FAIL: Subject count is not 4!");

  // 1b: Access code with "UTME Standard" + Biology elective
  const bioCombo2 = resolveUtme4Subjects({ preconfiguredSubject: "UTME Standard", primaryElective: "Biology" });
  console.log("  1b (Code=UTME Standard, Elective=Biology):", bioCombo2);
  if (bioCombo2.includes("UTME Standard")) throw new Error("FAIL: UTME Standard was added as a subject!");
  if (bioCombo2.includes("Mathematics")) throw new Error("FAIL: Mathematics was forced!");
  if (!bioCombo2.includes("Chemistry")) throw new Error("FAIL: Chemistry was omitted!");

  // 1c: Mathematics selected as elective (Engineering/Physical Science track)
  const mathCombo = resolveUtme4Subjects({ primaryElective: "Mathematics" });
  console.log("  1c (Elective=Mathematics):", mathCombo);
  if (!mathCombo.includes("Mathematics")) throw new Error("FAIL: Mathematics missing!");
  if (!mathCombo.includes("Physics")) throw new Error("FAIL: Physics missing!");
  if (!mathCombo.includes("Chemistry")) throw new Error("FAIL: Chemistry missing!");

  // 1d: Custom 4 subjects from candidate (e.g. English, Biology, Chemistry, Physics)
  const customCombo = resolveUtme4Subjects({
    candidateSubjects: ["English", "Biology", "Chemistry", "Physics"],
  });
  console.log("  1d (Custom 4 subjects):", customCombo);
  if (customCombo.join(", ") !== "English, Biology, Chemistry, Physics") {
    throw new Error("FAIL: Custom subjects were altered!");
  }

  // 1e: Check non-academic blacklist
  if (isAcademicSubject("UTME Standard")) throw new Error("FAIL: 'UTME Standard' recognized as academic!");
  if (isAcademicSubject("Speed Mock")) throw new Error("FAIL: 'Speed Mock' recognized as academic!");
  if (!isAcademicSubject("Biology")) throw new Error("FAIL: 'Biology' not recognized as academic!");
  if (!isAcademicSubject("Chemistry")) throw new Error("FAIL: 'Chemistry' not recognized as academic!");
  console.log("  => Test 1 PASSED: Subject resolver correctly enforces medical & engineering combinations without forcing Math or omitting Chemistry.\n");

  // TEST 2: Paper Generation (Medical: English, Biology, Chemistry, Physics)
  console.log("Test 2: Generating Medical UTME Paper (English, Biology, Chemistry, Physics)...");
  const testSessionId1 = "test-session-bio-" + Date.now();
  const testToken1 = "test-token-bio-" + Date.now();
  const genBio = await generateExamPaper({
    sessionId: testSessionId1,
    token: testToken1,
    subjects: ["English", "Biology", "Chemistry", "Physics"],
    durationSeconds: 7200,
  });

  if (!genBio.success) {
    throw new Error("FAIL: generateExamPaper failed: " + genBio.errors.join("; "));
  }
  console.log("  Generated questions count:", genBio.paperIds.length);
  console.log("  Client questions count:", genBio.clientQuestions.length);
  if (genBio.paperIds.length !== 180) {
    throw new Error(`FAIL: Expected 180 questions, got ${genBio.paperIds.length}`);
  }

  // Question counts by subject in generated paper
  const subjCounts = {};
  genBio.clientQuestions.forEach((q) => {
    subjCounts[q.subject] = (subjCounts[q.subject] || 0) + 1;
  });
  console.log("  Questions breakdown by subject:", subjCounts);
  if (subjCounts["English"] !== 60) throw new Error("FAIL: English questions count is not 60!");
  if (subjCounts["Biology"] !== 40) throw new Error("FAIL: Biology questions count is not 40!");
  if (subjCounts["Chemistry"] !== 40) throw new Error("FAIL: Chemistry questions count is not 40!");
  if (subjCounts["Physics"] !== 40) throw new Error("FAIL: Physics questions count is not 40!");
  if (subjCounts["Mathematics"] !== undefined) throw new Error("FAIL: Mathematics questions present in Medical paper!");
  console.log("  => Test 2 PASSED: Exactly 180 questions generated (English 60, Biology 40, Chemistry 40, Physics 40).\n");

  // TEST 3: Paper Generation (Engineering: English, Mathematics, Physics, Chemistry)
  console.log("Test 3: Generating Engineering UTME Paper (English, Mathematics, Physics, Chemistry)...");
  const testSessionId2 = "test-session-math-" + Date.now();
  const testToken2 = "test-token-math-" + Date.now();
  const genMath = await generateExamPaper({
    sessionId: testSessionId2,
    token: testToken2,
    subjects: ["English", "Mathematics", "Physics", "Chemistry"],
    durationSeconds: 7200,
  });

  if (!genMath.success) {
    throw new Error("FAIL: generateExamPaper failed: " + genMath.errors.join("; "));
  }
  console.log("  Generated questions count:", genMath.paperIds.length);
  const mathSubjCounts = {};
  genMath.clientQuestions.forEach((q) => {
    mathSubjCounts[q.subject] = (mathSubjCounts[q.subject] || 0) + 1;
  });
  console.log("  Questions breakdown by subject:", mathSubjCounts);
  if (mathSubjCounts["English"] !== 60) throw new Error("FAIL: English count != 60");
  if (mathSubjCounts["Mathematics"] !== 40) throw new Error("FAIL: Mathematics count != 40");
  if (mathSubjCounts["Physics"] !== 40) throw new Error("FAIL: Physics count != 40");
  if (mathSubjCounts["Chemistry"] !== 40) throw new Error("FAIL: Chemistry count != 40");
  console.log("  => Test 3 PASSED: Exactly 180 questions generated (English 60, Mathematics 40, Physics 40, Chemistry 40).\n");

  // TEST 4: Scoring Model (100 per subject cap, 400 total cap)
  console.log("Test 4: Authoritative Marking & Scoring Standard (100/subject, 400 total)...");
  // Let's create dummy answers where all questions are correct to test maximum score cap
  const perfectAnswers = {};
  for (const q of genBio.snapshot.questions_snapshot) {
    perfectAnswers[q.id] = q.correct_answer;
  }
  const markingResult = markExamAttempt(genBio.snapshot.questions_snapshot, perfectAnswers, genBio.snapshot);
  console.log("  Subject scores on 100% correct answers:", markingResult.subject_scores);
  console.log("  Displayed aggregate score:", markingResult.displayed_score, "/", markingResult.total_possible);
  
  for (const [subj, score] of Object.entries(markingResult.subject_scores)) {
    if (score !== 100) throw new Error(`FAIL: Subject ${subj} score is not capped at 100 (got ${score})`);
  }
  if (markingResult.displayed_score !== 400) throw new Error(`FAIL: Total score is not 400 (got ${markingResult.displayed_score})`);
  if (markingResult.total_possible !== 400) throw new Error(`FAIL: Total possible is not 400 (got ${markingResult.total_possible})`);
  console.log("  => Test 4 PASSED: Each subject capped at 100, aggregate total capped at 400.\n");

  console.log("ALL TESTS PASSED WITH 100% SUCCESS!");
}

main().catch((err) => {
  console.error("\nTEST SUITE FAILED:", err);
  process.exit(1);
});
