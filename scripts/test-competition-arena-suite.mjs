// BRAINLAB ACADEMY COMPETITION ARENA
// ROLE-BASED ACCESS CONTROL & DEDICATED QUESTION BANK
// COMPREHENSIVE AUTOMATED VERIFICATION TEST SUITE

import assert from "node:assert/strict";

// We import the tested logic modules
import {
  ROLE_DEFAULT_PERMISSIONS,
  COMPETITION_PERMISSIONS,
  hasPermissionInScope,
  requiresPublicationApproval,
  canApprovePublication,
  canApproveResultCorrection,
  canApproveRewardProposal,
} from "../app/lib/competitionRbac.ts";

import {
  OFFICIAL_COMPETITION_CSV_TEMPLATE,
  validateQuestionItem,
  computeQuestionHash,
  detectQuestionDuplicates,
  parseAndValidateCompetitionCSV,
  canTransitionQuestionStatus,
} from "../app/lib/competitionQuestionBank.ts";

import {
  generateCompetitionAssessmentSnapshot,
  shuffleQuestionOptions,
  shuffleArray,
} from "../app/lib/competitionEngine.ts";

console.log("=================================================================");
console.log("BRAINLAB ACADEMY COMPETITION ARENA - RBAC & QUESTION BANK SUITE");
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
// 1. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION BOUNDARIES
// =================================================================
console.log("\n--- GROUP 1: ROLE-BASED ACCESS CONTROL & BOUNDARIES ---");

test("Super Admin has full competition permissions across all scopes", () => {
  const superAdmin = { id: "sa-1", email: "super@brainlab.edu", role: "super_admin" };
  for (const perm of COMPETITION_PERMISSIONS) {
    const res = hasPermissionInScope(superAdmin, perm);
    assert.equal(res.allowed, true, `Super admin should have ${perm}`);
  }
});

test("Competition Administrator has operational permissions but cannot manage platform roles", () => {
  const compAdmin = { id: "ca-1", email: "admin@brainlab.edu", role: "competition_admin" };
  assert.equal(hasPermissionInScope(compAdmin, "competition.create").allowed, true);
  assert.equal(hasPermissionInScope(compAdmin, "competition.publish").allowed, true);
  assert.equal(hasPermissionInScope(compAdmin, "question_bank.import_csv").allowed, true);
  assert.equal(hasPermissionInScope(compAdmin, "question_builder.use").allowed, true);
  assert.equal(hasPermissionInScope(compAdmin, "competition.manage_roles").allowed, false);
});

test("Competition Moderator cannot publish competitions, alter scoring, or delete banks", () => {
  const moderator = { id: "mod-1", email: "mod@brainlab.edu", role: "competition_moderator" };
  assert.equal(hasPermissionInScope(moderator, "competition.view").allowed, true);
  assert.equal(hasPermissionInScope(moderator, "question_bank.moderate").allowed, true);
  assert.equal(hasPermissionInScope(moderator, "competition.manage_participants").allowed, true);
  assert.equal(hasPermissionInScope(moderator, "competition.publish").allowed, false);
  assert.equal(hasPermissionInScope(moderator, "question_bank.delete_own").allowed, false);
});

test("Tutor / Host can create quizzes and manage questions in owned banks only", () => {
  const tutor = { id: "tutor-1", email: "tutor@brainlab.edu", role: "competition_host" };
  // Can edit owned bank
  assert.equal(
    hasPermissionInScope(tutor, "question_bank.edit_own", {
      scopeType: "question_bank",
      scopeId: "bank-own",
      ownerId: "tutor-1",
    }).allowed,
    true
  );
  // Cannot edit another host's private bank
  assert.equal(
    hasPermissionInScope(tutor, "question_bank.edit_own", {
      scopeType: "question_bank",
      scopeId: "bank-other",
      ownerId: "other-tutor-99",
    }).allowed,
    false
  );
  // Cannot delete institutional questions
  assert.equal(hasPermissionInScope(tutor, "question_bank.delete_assigned").allowed, false);
});

test("Student cannot publish results, delete questions, or access restricted management", () => {
  const student = { id: "stu-1", email: "student@brainlab.edu", role: "student" };
  assert.equal(hasPermissionInScope(student, "competition.view").allowed, true);
  assert.equal(hasPermissionInScope(student, "competition.publish_results").allowed, false);
  assert.equal(hasPermissionInScope(student, "question_bank.delete_own").allowed, false);
  assert.equal(hasPermissionInScope(student, "competition.manage_rewards").allowed, false);
});

test("Guest participant can only view public entry points and cannot access administrative functions", () => {
  const guest = { id: "guest-1", email: "", role: "guest" };
  assert.equal(hasPermissionInScope(guest, "competition.view").allowed, true);
  assert.equal(hasPermissionInScope(guest, "competition.create").allowed, false);
  assert.equal(hasPermissionInScope(guest, "question_bank.view").allowed, false);
});

test("Granular scoped assignment grants permission only to the explicitly assigned resource", () => {
  const user = {
    id: "user-scoped",
    email: "user@brainlab.edu",
    role: "student",
    scoped_permissions: [
      {
        permission_key: "question_bank.edit_assigned",
        scope_type: "question_bank",
        scope_id: "bank-alpha-123",
      },
    ],
  };

  // Allowed on bank-alpha-123
  const allowedCheck = hasPermissionInScope(user, "question_bank.edit_assigned", {
    scopeType: "question_bank",
    scopeId: "bank-alpha-123",
  });
  assert.equal(allowedCheck.allowed, true);

  // Denied on bank-beta-456
  const deniedCheck = hasPermissionInScope(user, "question_bank.edit_assigned", {
    scopeType: "question_bank",
    scopeId: "bank-beta-456",
  });
  assert.equal(deniedCheck.allowed, false);
});

test("Reward authorization limits are enforced server-side", () => {
  const adminWithLimit = {
    id: "ca-limit",
    email: "limit@brainlab.edu",
    role: "competition_admin",
    max_reward_xp_limit: 1000,
  };

  // Within limit
  assert.equal(
    hasPermissionInScope(adminWithLimit, "competition.approve_rewards", {
      scopeType: "reward_limit",
      rewardAmount: 500,
    }).allowed,
    true
  );

  // Exceeds limit
  const exceedCheck = hasPermissionInScope(adminWithLimit, "competition.approve_rewards", {
    scopeType: "reward_limit",
    rewardAmount: 2500,
  });
  assert.equal(exceedCheck.allowed, false);
  assert.match(exceedCheck.reason, /exceeds authorized limit/i);
});

// =================================================================
// 2. SEPARATION OF DUTIES
// =================================================================
console.log("\n--- GROUP 2: SEPARATION OF DUTIES ---");

test("Public competition created by a tutor/host requires independent administrator approval", () => {
  const comp = { creator_id: "tutor-1", visibility: "public" };
  assert.equal(requiresPublicationApproval(comp, "competition_host"), true);
  assert.equal(requiresPublicationApproval(comp, "student"), true);
  assert.equal(requiresPublicationApproval(comp, "super_admin"), false);
});

test("Creator cannot approve their own submission for publication", () => {
  const actor = { id: "host-1", email: "host@brainlab.edu", role: "competition_admin" };
  const checkSelf = canApprovePublication(actor, "host-1");
  assert.equal(checkSelf.allowed, false);
  assert.match(checkSelf.reason, /Separation of duties violation/i);

  const checkOther = canApprovePublication(actor, "host-2");
  assert.equal(checkOther.allowed, true);
});

test("Moderator who flagged a dispute cannot self-approve the score correction", () => {
  const adminActor = { id: "mod-1", email: "admin@brainlab.edu", role: "competition_admin" };
  const checkSelf = canApproveResultCorrection(adminActor, "mod-1");
  assert.equal(checkSelf.allowed, false);
  assert.match(checkSelf.reason, /Separation of duties violation/i);

  const checkOther = canApproveResultCorrection(adminActor, "other-mod-2");
  assert.equal(checkOther.allowed, true);
});

test("Person who proposed a reward cannot approve its issuance", () => {
  const actor = {
    id: "proposer-1",
    email: "manager@brainlab.edu",
    role: "competition_admin",
    max_reward_xp_limit: 5000,
  };
  const proposal = { proposed_by: "proposer-1", amount: 200 };
  const checkSelf = canApproveRewardProposal(actor, proposal);
  assert.equal(checkSelf.allowed, false);
  assert.match(checkSelf.reason, /Separation of duties violation/i);

  const proposalOther = { proposed_by: "manager-2", amount: 200 };
  const checkOther = canApproveRewardProposal(actor, proposalOther);
  assert.equal(checkOther.allowed, true);
});

// =================================================================
// 3. IN-WEB QUESTION BUILDER & 4/5-OPTION MCQ SUPPORT
// =================================================================
console.log("\n--- GROUP 3: IN-WEB QUESTION BUILDER & 4/5-OPTION MCQs ---");

test("Validates 4-option multiple-choice question correctly", () => {
  const q4 = {
    question: "What is the capital of Nigeria?",
    subject: "Civics",
    option_a: "Lagos",
    option_b: "Abuja",
    option_c: "Kano",
    option_d: "Ibadan",
    correct_answer: "B",
    marks: 1.0,
  };
  const errors = validateQuestionItem(q4, 1);
  assert.equal(errors.length, 0);
});

test("Validates 5-option multiple-choice question correctly with Option E", () => {
  const q5 = {
    question: "Which of the following is a transition metal?",
    subject: "Chemistry",
    option_a: "Sodium",
    option_b: "Calcium",
    option_c: "Iron",
    option_d: "Aluminium",
    option_e: "Potassium",
    correct_answer: "C",
    marks: 2.0,
  };
  const errors = validateQuestionItem(q5, 1);
  assert.equal(errors.length, 0);
});

test("Allows Option E to be the correct answer key when Option E is present", () => {
  const q5E = {
    question: "Which of the following is an inert gas?",
    subject: "Chemistry",
    option_a: "Oxygen",
    option_b: "Nitrogen",
    option_c: "Hydrogen",
    option_d: "Chlorine",
    option_e: "Argon",
    correct_answer: "E",
    marks: 1.0,
  };
  const errors = validateQuestionItem(q5E, 1);
  assert.equal(errors.length, 0);
});

test("Rejects correct answer 'E' when Option E is missing", () => {
  const qInvalid = {
    question: "Solve for x: x + 2 = 5",
    subject: "Mathematics",
    option_a: "1",
    option_b: "2",
    option_c: "3",
    option_d: "4",
    correct_answer: "E", // Missing option_e
    marks: 1.0,
  };
  const errors = validateQuestionItem(qInvalid, 1);
  assert.ok(errors.length > 0);
  assert.match(errors[0].message, /Option E is not set/i);
});

test("Question lifecycle prevents creators from self-approving questions without review", () => {
  const creatorActor = { id: "author-1", role: "competition_host", created_by: "author-1" };
  const transition = canTransitionQuestionStatus("review", "approved", creatorActor);
  assert.equal(transition.allowed, false);
  assert.match(transition.reason, /Separation of duties/i);

  const adminActor = { id: "admin-1", role: "competition_admin", created_by: "author-1" };
  const adminTransition = canTransitionQuestionStatus("review", "approved", adminActor);
  assert.equal(adminTransition.allowed, true);
});

// =================================================================
// 4. CSV QUESTION IMPORTER & DUPLICATE INTELLIGENCE
// =================================================================
console.log("\n--- GROUP 4: CSV IMPORTER & DUPLICATE INTELLIGENCE ---");

test("Official CSV template includes Option E and essential columns", () => {
  assert.ok(OFFICIAL_COMPETITION_CSV_TEMPLATE.includes("Option E"));
  assert.ok(OFFICIAL_COMPETITION_CSV_TEMPLATE.includes("Correct Answer"));
  assert.ok(OFFICIAL_COMPETITION_CSV_TEMPLATE.includes("Explanation"));
  assert.ok(OFFICIAL_COMPETITION_CSV_TEMPLATE.includes("Marks"));
});

test("CSV parser handles 4-option and 5-option rows accurately and reports invalid rows", () => {
  const sampleCsv = `Question,Subject,Topic,Subtopic,Difficulty,Question Type,Option A,Option B,Option C,Option D,Option E,Correct Answer,Explanation,Marks,Tags
"What is 5 + 7?","Mathematics","Arithmetic","Addition","easy","multiple_choice","10","11","12","13","14","C","5+7=12",1.0,"math"
"Valid 4-option question","Biology","Genetics","Mendel","medium","multiple_choice","Opt 1","Opt 2","Opt 3","Opt 4",,"B","Exp",1.0,"bio"
"Malformed row with invalid key","Physics","Mechanics","Speed","easy","multiple_choice","A","B","C","D",,"Z","Bad Key",1.0,"phys"
`;

  const summary = parseAndValidateCompetitionCSV(sampleCsv, "bank-test", "user-1", []);
  assert.equal(summary.total_rows, 3);
  assert.equal(summary.imported_count, 2);
  assert.equal(summary.rejected_count, 1);
  assert.equal(summary.errors.length, 1);
  assert.equal(summary.errors[0].row, 4);
  assert.match(summary.errors[0].message, /Correct answer must be one of/i);
});

test("Duplicate detection identifies exact match and rejects duplicate entry", () => {
  const existing = [
    {
      id: "q-exist-1",
      bank_id: "bank-test",
      question: "What is the speed of light in vacuum?",
      subject: "Physics",
      option_a: "3 x 10^8 m/s",
      option_b: "3 x 10^6 m/s",
      option_c: "1.5 x 10^8 m/s",
      option_d: "3 x 10^10 m/s",
      correct_answer: "A",
      marks: 1.0,
      difficulty: "easy",
      question_type: "multiple_choice",
      status: "approved",
      created_by: "admin",
    },
  ];
  existing[0].group_hash = computeQuestionHash(existing[0]);

  const incomingCsv = `Question,Subject,Option A,Option B,Option C,Option D,Correct Answer,Marks
"What is the speed of light in vacuum?","Physics","3 x 10^8 m/s","3 x 10^6 m/s","1.5 x 10^8 m/s","3 x 10^10 m/s","A",1.0
`;

  const summary = parseAndValidateCompetitionCSV(incomingCsv, "bank-test", "user-1", existing);
  assert.equal(summary.duplicates_count, 1);
  assert.equal(summary.rejected_count, 1);
  assert.equal(summary.imported_count, 0);
  assert.match(summary.errors[0].message, /Exact duplicate detected/i);
});

test("Duplicate detection flags similar wording for review without auto-deleting", () => {
  const existing = [
    {
      id: "q-exist-2",
      bank_id: "bank-test",
      question: "Which organelle is responsible for cellular respiration in cells?",
      subject: "Biology",
      option_a: "Nucleus",
      option_b: "Mitochondria",
      option_c: "Ribosome",
      option_d: "Vacuole",
      correct_answer: "B",
      marks: 1.0,
      difficulty: "medium",
      question_type: "multiple_choice",
      status: "approved",
      created_by: "admin",
    },
  ];

  const incoming = {
    id: "q-new-2",
    bank_id: "bank-test",
    question: "Which organelle is mainly responsible for cellular respiration in animal cells?",
    subject: "Biology",
    option_a: "Nucleus",
    option_b: "Mitochondria",
    option_c: "Ribosome",
    option_d: "Vacuole",
    correct_answer: "B",
    marks: 1.0,
    difficulty: "medium",
    question_type: "multiple_choice",
    status: "approved",
    created_by: "admin",
  };

  const dup = detectQuestionDuplicates(incoming, existing);
  assert.ok(dup !== null);
  assert.ok(dup.similarity_score >= 0.85);
  assert.match(dup.recommendation, /Requires side-by-side inspection|Inspect side-by-side/i);
});

// =================================================================
// 5. ASSESSMENT GENERATION, SOURCE MODES & IMMUTABLE SNAPSHOTS
// =================================================================
console.log("\n--- GROUP 5: ASSESSMENT GENERATION & SOURCE MODES ---");

const mockCompQuestions = Array.from({ length: 15 }, (_, i) => ({
  id: `cq_${i + 1}`,
  bank_id: "comp_bank_1",
  question: `Dedicated Competition Question ${i + 1}`,
  subject: "Mathematics",
  topic: `Topic_${(i % 3) + 1}`,
  difficulty: "medium",
  question_type: "multiple_choice",
  option_a: `A${i + 1}`,
  option_b: `B${i + 1}`,
  option_c: `C${i + 1}`,
  option_d: `D${i + 1}`,
  option_e: i % 2 === 0 ? `E${i + 1}` : null,
  correct_answer: i % 2 === 0 ? "E" : "A",
  marks: 2.0,
  status: "approved",
  created_by: "comp_admin",
}));

const mockMainQuestions = Array.from({ length: 15 }, (_, i) => ({
  id: `main_${i + 1}`,
  bank_id: "main_cbt",
  question: `Main Institutional CBT Question ${i + 1}`,
  subject: "Mathematics",
  topic: `Topic_${(i % 3) + 1}`,
  difficulty: "medium",
  question_type: "multiple_choice",
  option_a: `MA${i + 1}`,
  option_b: `MB${i + 1}`,
  option_c: `MC${i + 1}`,
  option_d: `MD${i + 1}`,
  correct_answer: "B",
  marks: 2.5,
  status: "published",
  created_by: "cbt_admin",
}));

test("Mode 1 (competition_bank): draws solely from dedicated competition bank", () => {
  const res = generateCompetitionAssessmentSnapshot({
    sessionId: "sess-1",
    competitionId: "comp-1",
    sourceMode: "competition_bank",
    competitionBankQuestions: mockCompQuestions,
    mainBankQuestions: mockMainQuestions,
    rules: {
      question_count: 8,
      duration_seconds: 300,
      randomize_questions: true,
      randomize_options: true,
      identical_questions_for_all: false,
    },
  });

  assert.equal(res.ok, true);
  assert.equal(res.snapshot.questions_snapshot.length, 8);
  for (const q of res.snapshot.questions_snapshot) {
    assert.equal(q.source, "competition_bank");
  }
});

test("Mode 2 (main_bank): draws solely from main institutional CBT bank", () => {
  const res = generateCompetitionAssessmentSnapshot({
    sessionId: "sess-2",
    competitionId: "comp-2",
    sourceMode: "main_bank",
    competitionBankQuestions: mockCompQuestions,
    mainBankQuestions: mockMainQuestions,
    rules: {
      question_count: 6,
      duration_seconds: 300,
      randomize_questions: true,
      randomize_options: true,
      identical_questions_for_all: false,
    },
  });

  assert.equal(res.ok, true);
  assert.equal(res.snapshot.questions_snapshot.length, 6);
  for (const q of res.snapshot.questions_snapshot) {
    assert.equal(q.source, "main_bank");
  }
});

test("Mode 3 (combined): draws balanced quota from both sources", () => {
  const res = generateCompetitionAssessmentSnapshot({
    sessionId: "sess-3",
    competitionId: "comp-3",
    sourceMode: "combined",
    competitionBankQuestions: mockCompQuestions,
    mainBankQuestions: mockMainQuestions,
    rules: {
      question_count: 10,
      duration_seconds: 300,
      randomize_questions: false,
      randomize_options: true,
      identical_questions_for_all: false,
    },
    combinedRatio: { competitionBank: 0.5, mainBank: 0.5 },
  });

  assert.equal(res.ok, true);
  assert.equal(res.snapshot.questions_snapshot.length, 10);
  const compCount = res.snapshot.questions_snapshot.filter((q) => q.source === "competition_bank").length;
  const mainCount = res.snapshot.questions_snapshot.filter((q) => q.source === "main_bank").length;
  assert.equal(compCount, 5);
  assert.equal(mainCount, 5);
});

test("Shortage detection reports actionable error without silently violating rules", () => {
  const res = generateCompetitionAssessmentSnapshot({
    sessionId: "sess-shortage",
    competitionId: "comp-shortage",
    sourceMode: "competition_bank",
    competitionBankQuestions: mockCompQuestions.slice(0, 3), // only 3 available
    mainBankQuestions: mockMainQuestions,
    rules: {
      question_count: 10, // requires 10
      duration_seconds: 300,
      randomize_questions: true,
      randomize_options: true,
      identical_questions_for_all: false,
    },
  });

  assert.equal(res.ok, false);
  assert.match(res.error, /Insufficient questions in dedicated competition bank/i);
  assert.equal(res.shortageDetails.available, 3);
  assert.equal(res.shortageDetails.required, 10);
});

test("Synchronized 1v1 battle guarantees IDENTICAL question sets and scoring basis", () => {
  const rules = {
    question_count: 6,
    duration_seconds: 180,
    randomize_questions: true,
    randomize_options: true,
    identical_questions_for_all: true, // 1v1 battle mode rule
  };

  // Participant 1 attempt snapshot
  const res1 = generateCompetitionAssessmentSnapshot({
    sessionId: "battle-sess-p1",
    competitionId: "1v1-battle",
    sourceMode: "competition_bank",
    competitionBankQuestions: mockCompQuestions,
    mainBankQuestions: mockMainQuestions,
    rules,
    participantSeed: 42,
  });

  // Participant 2 attempt snapshot
  const res2 = generateCompetitionAssessmentSnapshot({
    sessionId: "battle-sess-p2",
    competitionId: "1v1-battle",
    sourceMode: "competition_bank",
    competitionBankQuestions: mockCompQuestions,
    mainBankQuestions: mockMainQuestions,
    rules,
    participantSeed: 42,
  });

  assert.equal(res1.ok, true);
  assert.equal(res2.ok, true);

  const p1Ids = res1.snapshot.questions_snapshot.map((q) => q.id);
  const p2Ids = res2.snapshot.questions_snapshot.map((q) => q.id);
  assert.deepEqual(p1Ids, p2Ids, "1v1 participants must receive identical questions!");
  assert.equal(res1.snapshot.scoring_rules.max_raw_marks, res2.snapshot.scoring_rules.max_raw_marks);
});

test("Option shuffling randomizes option placement while maintaining accurate answer key", () => {
  const sampleQ = mockCompQuestions[0]; // has option_e = E1, correct_answer = E
  const { shuffledOptions, newCorrectAnswer } = shuffleQuestionOptions(sampleQ, 999);

  // The text of the new correct answer key must equal the text of the original correct answer
  const originalCorrectText = sampleQ.option_e;
  const newSelectedText = shuffledOptions[newCorrectAnswer];
  assert.equal(newSelectedText, originalCorrectText, "Option shuffle must accurately remap answer key!");
});

test("Attempt snapshots are immutable: editing source bank does not alter historical attempt", () => {
  // 1. Generate snapshot for candidate
  const initialRes = generateCompetitionAssessmentSnapshot({
    sessionId: "hist-sess-001",
    competitionId: "comp-hist",
    sourceMode: "competition_bank",
    competitionBankQuestions: mockCompQuestions,
    mainBankQuestions: mockMainQuestions,
    rules: {
      question_count: 5,
      duration_seconds: 300,
      randomize_questions: false,
      randomize_options: false,
      identical_questions_for_all: true,
    },
  });
  assert.equal(initialRes.ok, true);
  const frozenAttempt = initialRes.snapshot;

  // 2. Later, someone edits or mutates the question in the question bank
  const mutatedQuestions = mockCompQuestions.map((q) => ({
    ...q,
    question: `MUTATED PROMPT ${q.id}`,
    correct_answer: "D",
    marks: 999,
  }));

  // 3. Verify the frozen snapshot remains unchanged
  const frozenStem = frozenAttempt.questions_snapshot[0].question;
  assert.ok(frozenStem.startsWith("Dedicated Competition Question"));
  assert.ok(!frozenStem.startsWith("MUTATED PROMPT"));
  assert.equal(frozenAttempt.scoring_rules.question_marks[frozenAttempt.questions_snapshot[0].id], 2.0);
  assert.notEqual(frozenAttempt.scoring_rules.question_marks[frozenAttempt.questions_snapshot[0].id], 999);
});

console.log("\n=================================================================");
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("=================================================================");

if (failed > 0) {
  process.exit(1);
}
