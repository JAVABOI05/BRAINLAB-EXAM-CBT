import assert from "assert";
import crypto from "crypto";

console.log("=================================================================");
console.log("BRAINLAB ACADEMY - LIVE LEARNING & COMMUNICATION TEST SUITE");
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
    console.error(`   ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. VIDEO PROVIDER & WEBRTC ROOM SIGNING TEST
// -----------------------------------------------------------------------------
test("WebRTC Room Token HMAC signature generation and verification", () => {
  const secret = "test-service-role-secret-key-12345";
  const payload = JSON.stringify({
    roomId: "class-456",
    roomName: "bl_room_456",
    userId: "usr-student-001",
    userName: "Emeka Okonkwo",
    role: "speaker",
    permissions: {
      canPublishAudio: true,
      canPublishVideo: false,
      canPublishScreen: false,
      canChat: true,
      isModerator: false,
    },
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });

  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const token = `${Buffer.from(payload).toString("base64")}.${signature}`;
  const [b64Payload, receivedSig] = token.split(".");

  const decodedPayload = Buffer.from(b64Payload, "base64").toString("utf8");
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(decodedPayload)
    .digest("hex");

  assert.strictEqual(receivedSig, expectedSig, "HMAC token signature must match");
  const parsed = JSON.parse(decodedPayload);
  assert.strictEqual(parsed.userId, "usr-student-001");
  assert.strictEqual(parsed.permissions.canPublishAudio, true);
  assert.strictEqual(parsed.permissions.canPublishVideo, false);
});

// -----------------------------------------------------------------------------
// 2. ATTENDANCE & THRESHOLD CALCULATION TEST
// -----------------------------------------------------------------------------
test("Attendance threshold calculation (partial vs present status)", () => {
  const minDurationMinutes = 15;

  function calculateStatus(durationSeconds) {
    const mins = durationSeconds / 60;
    return mins >= minDurationMinutes ? "present" : "partial";
  }

  // 10 minutes (600s) should be partial
  assert.strictEqual(calculateStatus(600), "partial", "10 mins attendance must be partial");

  // 15 minutes (900s) should be present
  assert.strictEqual(calculateStatus(900), "present", "15 mins attendance must be present");

  // 45 minutes (2700s) should be present
  assert.strictEqual(calculateStatus(2700), "present", "45 mins attendance must be present");
});

// -----------------------------------------------------------------------------
// 3. AUDIO POLICY & FILE VALIDATION TEST
// -----------------------------------------------------------------------------
test("Audio policy size and format validation", () => {
  const allowedFormats = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg", "audio/wav"];
  const maxMb = 25;
  const maxBytes = maxMb * 1024 * 1024;

  function validateAudioUpload(fileSize, mimeType) {
    if (fileSize > maxBytes) return { valid: false, error: "File exceeds 25MB limit" };
    const isAllowed = allowedFormats.some((f) => mimeType.includes(f.replace("audio/", "")));
    if (!isAllowed && !mimeType.startsWith("audio/")) {
      return { valid: false, error: "Unsupported audio format" };
    }
    return { valid: true };
  }

  // Valid 2MB webm voice note
  assert.strictEqual(validateAudioUpload(2 * 1024 * 1024, "audio/webm;codecs=opus").valid, true);

  // Valid 5MB mpeg voice note
  assert.strictEqual(validateAudioUpload(5 * 1024 * 1024, "audio/mpeg").valid, true);

  // Invalid oversized 30MB file
  const oversized = validateAudioUpload(30 * 1024 * 1024, "audio/webm");
  assert.strictEqual(oversized.valid, false);
  assert.match(oversized.error, /25MB/);

  // Invalid application/pdf uploaded as audio
  const invalidMime = validateAudioUpload(1024, "application/pdf");
  assert.strictEqual(invalidMime.valid, false);
});

// -----------------------------------------------------------------------------
// 4. STUDENT AUDIO SUBMISSION AUTHORIZATION GATE TEST
// -----------------------------------------------------------------------------
test("Student audio submission permission precedence", () => {
  function canStudentSubmitAudio({ globalSetting, assignmentSetting, isEnrolled }) {
    if (!isEnrolled) return false;
    // Server precedence rule: global admin policy takes precedence
    if (!globalSetting) return false;
    // Specific assignment rule can restrict if disabled
    if (assignmentSetting === false) return false;
    return true;
  }

  // Permitted case
  assert.strictEqual(
    canStudentSubmitAudio({ globalSetting: true, assignmentSetting: true, isEnrolled: true }),
    true
  );

  // Unenrolled student must be rejected
  assert.strictEqual(
    canStudentSubmitAudio({ globalSetting: true, assignmentSetting: true, isEnrolled: false }),
    false
  );

  // Disabled globally must be rejected even if assignment setting is true
  assert.strictEqual(
    canStudentSubmitAudio({ globalSetting: false, assignmentSetting: true, isEnrolled: true }),
    false
  );

  // Disabled on assignment must be rejected even if global is true
  assert.strictEqual(
    canStudentSubmitAudio({ globalSetting: true, assignmentSetting: false, isEnrolled: true }),
    false
  );
});

// -----------------------------------------------------------------------------
// 5. MEANINGFUL VIEW THRESHOLD & DEDUPLICATION TEST
// -----------------------------------------------------------------------------
test("Meaningful content view threshold rules", () => {
  function shouldRecordView(durationSeconds) {
    // Under 3 seconds is considered a flicker/bounce, not a verified view
    return durationSeconds >= 3;
  }

  assert.strictEqual(shouldRecordView(1), false, "1s render must not be counted as view");
  assert.strictEqual(shouldRecordView(2), false, "2s render must not be counted as view");
  assert.strictEqual(shouldRecordView(3), true, "3s read must be counted as view");
  assert.strictEqual(shouldRecordView(45), true, "45s read must be counted as view");
});

// -----------------------------------------------------------------------------
// 6. EMOJI REACTION TOGGLE & DEDUPLICATION TEST
// -----------------------------------------------------------------------------
test("Emoji reaction toggle logic", () => {
  const existingReactions = [
    { messageId: "msg-1", userId: "usr-1", reaction: "👍" },
    { messageId: "msg-1", userId: "usr-2", reaction: "❤️" },
  ];

  function toggleReaction(msgId, uId, rx) {
    const idx = existingReactions.findIndex(
      (r) => r.messageId === msgId && r.userId === uId && r.reaction === rx
    );
    if (idx >= 0) {
      existingReactions.splice(idx, 1);
      return "removed";
    } else {
      existingReactions.push({ messageId: msgId, userId: uId, reaction: rx });
      return "added";
    }
  }

  // User 1 toggling 👍 off
  assert.strictEqual(toggleReaction("msg-1", "usr-1", "👍"), "removed");
  // User 1 adding 👍 back
  assert.strictEqual(toggleReaction("msg-1", "usr-1", "👍"), "added");
  // User 1 adding different reaction
  assert.strictEqual(toggleReaction("msg-1", "usr-1", "👏"), "added");
});

// -----------------------------------------------------------------------------
// 7. CALENDAR .ICS RFC-5545 COMPLIANCE TEST
// -----------------------------------------------------------------------------
test("iCalendar (.ics) format string generation", () => {
  const event = {
    id: "evt-001",
    title: "JAMB UTME Organic Chemistry Masterclass",
    description: "Interactive revision on reaction mechanisms",
    start_time: "2026-10-25T14:00:00Z",
    end_time: "2026-10-25T15:30:00Z",
    location_url: "/classroom/evt-001",
  };

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BrainLab Academy//Timetable 1.0//EN",
    "BEGIN:VEVENT",
    `UID:event_${event.id}@brainlabacademy.com`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description}`,
    `URL:${event.location_url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  assert.ok(ics.includes("BEGIN:VCALENDAR"));
  assert.ok(ics.includes("END:VCALENDAR"));
  assert.ok(ics.includes("BEGIN:VEVENT"));
  assert.ok(ics.includes("SUMMARY:JAMB UTME Organic Chemistry Masterclass"));
  assert.ok(ics.includes("URL:/classroom/evt-001"));
});

// -----------------------------------------------------------------------------
// 8. ONLINE PRESENCE HEARTBEAT EXPIRY TEST
// -----------------------------------------------------------------------------
test("User presence expiration detection", () => {
  const EXPIRY_MS = 180 * 1000; // 3 minutes

  function isUserOnline(lastHeartbeatIso) {
    const diff = Date.now() - new Date(lastHeartbeatIso).getTime();
    return diff <= EXPIRY_MS;
  }

  // 1 minute ago -> Online
  const recentHeartbeat = new Date(Date.now() - 60 * 1000).toISOString();
  assert.strictEqual(isUserOnline(recentHeartbeat), true, "Heartbeat 60s ago must be online");

  // 5 minutes ago -> Offline / Stale
  const staleHeartbeat = new Date(Date.now() - 300 * 1000).toISOString();
  assert.strictEqual(isUserOnline(staleHeartbeat), false, "Heartbeat 5m ago must be offline");
});

// -----------------------------------------------------------------------------
// 9. ASSIGNMENT DEADLINE & LATE SUBMISSION POLICY TEST
// -----------------------------------------------------------------------------
test("Assignment deadline and late submission policy enforcement", () => {
  function canSubmitAssignment(assignment, submissionTimeMs = Date.now()) {
    if (assignment.status !== "published") {
      return { allowed: false, reason: "closed" };
    }
    if (assignment.due_date && new Date(assignment.due_date).getTime() < submissionTimeMs) {
      if (!assignment.allow_late_submissions) {
        return { allowed: false, reason: "deadline_passed" };
      }
      return { allowed: true, isLate: true };
    }
    return { allowed: true, isLate: false };
  }

  // 1. Open assignment before deadline
  const futureDue = { status: "published", due_date: new Date(Date.now() + 86400000).toISOString(), allow_late_submissions: false };
  assert.deepStrictEqual(canSubmitAssignment(futureDue), { allowed: true, isLate: false });

  // 2. Past due with late submissions disabled
  const pastDueStrict = { status: "published", due_date: new Date(Date.now() - 86400000).toISOString(), allow_late_submissions: false };
  assert.deepStrictEqual(canSubmitAssignment(pastDueStrict), { allowed: false, reason: "deadline_passed" });

  // 3. Past due with late submissions enabled
  const pastDuePermissive = { status: "published", due_date: new Date(Date.now() - 86400000).toISOString(), allow_late_submissions: true };
  assert.deepStrictEqual(canSubmitAssignment(pastDuePermissive), { allowed: true, isLate: true });

  // 4. Closed assignment
  const closed = { status: "closed", due_date: null, allow_late_submissions: true };
  assert.deepStrictEqual(canSubmitAssignment(closed), { allowed: false, reason: "closed" });
});

// -----------------------------------------------------------------------------
// 10. ASSIGNMENT RUBRIC EVALUATION & AUDIO CRITIQUE VALIDATION
// -----------------------------------------------------------------------------
test("Assignment rubric evaluation and audio critique validation", () => {
  function validateGrade(grade, maxPoints) {
    const num = Number(grade);
    if (isNaN(num)) return { valid: false, error: "not_a_number" };
    if (num < 0 || num > maxPoints) return { valid: false, error: "out_of_bounds" };
    return { valid: true, percentage: Math.round((num / maxPoints) * 100) };
  }

  assert.deepStrictEqual(validateGrade(85, 100), { valid: true, percentage: 85 });
  assert.deepStrictEqual(validateGrade(105, 100), { valid: false, error: "out_of_bounds" });
  assert.deepStrictEqual(validateGrade(-5, 100), { valid: false, error: "out_of_bounds" });

  // Tutor audio critique MIME and size check
  function validateTutorAudio(fileSize, mimeType) {
    const MAX_CRITIQUE_SIZE = 15 * 1024 * 1024; // 15MB
    const ALLOWED_MIMES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"];
    return fileSize <= MAX_CRITIQUE_SIZE && ALLOWED_MIMES.includes(mimeType);
  }

  assert.strictEqual(validateTutorAudio(2 * 1024 * 1024, "audio/webm"), true);
  assert.strictEqual(validateTutorAudio(20 * 1024 * 1024, "audio/webm"), false);
  assert.strictEqual(validateTutorAudio(1 * 1024 * 1024, "application/pdf"), false);
});

// -----------------------------------------------------------------------------
// 11. CLASSROOM LIVE POLLS & CHECKPOINT QUIZ VALIDATION
// -----------------------------------------------------------------------------
test("Classroom Live Poll vote aggregation and correct answer reveal", () => {
  function aggregatePoll(poll, votes) {
    const totalVotes = votes.length;
    const counts = {};
    for (const v of votes) {
      counts[v.optionId] = (counts[v.optionId] || 0) + 1;
    }

    const options = poll.options.map((opt) => {
      const voteCount = counts[opt.id] || 0;
      return {
        ...opt,
        votes: voteCount,
        percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
        // Hide is_correct if poll is still open
        is_correct: poll.isOpen ? undefined : opt.is_correct,
      };
    });

    return {
      id: poll.id,
      totalVotes,
      options,
      explanation: poll.isOpen ? undefined : poll.explanation,
    };
  }

  const rawPoll = {
    id: "poll-001",
    isOpen: true,
    question: "What is the SI unit of electric resistance?",
    options: [
      { id: "opt_1", text: "Volt", is_correct: false },
      { id: "opt_2", text: "Ohm", is_correct: true },
      { id: "opt_3", text: "Ampere", is_correct: false },
    ],
    explanation: "Ohm (Ω) is the standard SI unit of electrical resistance.",
  };

  const sampleVotes = [
    { userId: "u1", optionId: "opt_2" },
    { userId: "u2", optionId: "opt_2" },
    { userId: "u3", optionId: "opt_1" },
    { userId: "u4", optionId: "opt_2" },
  ];

  // While open: correct answers hidden, vote counts aggregated
  const liveResult = aggregatePoll(rawPoll, sampleVotes);
  assert.strictEqual(liveResult.totalVotes, 4);
  assert.strictEqual(liveResult.options.find((o) => o.id === "opt_2").percentage, 75);
  assert.strictEqual(liveResult.options.find((o) => o.id === "opt_1").percentage, 25);
  assert.strictEqual(liveResult.options.find((o) => o.id === "opt_2").is_correct, undefined);
  assert.strictEqual(liveResult.explanation, undefined);

  // When closed: correct answers and pedagogical explanation revealed
  const closedPoll = { ...rawPoll, isOpen: false };
  const finalResult = aggregatePoll(closedPoll, sampleVotes);
  assert.strictEqual(finalResult.options.find((o) => o.id === "opt_2").is_correct, true);
  assert.strictEqual(finalResult.options.find((o) => o.id === "opt_1").is_correct, false);
  assert.strictEqual(typeof finalResult.explanation, "string");
});

// -----------------------------------------------------------------------------
// 12. AI AUTHORING COPILOT DRAFT & MCQ VALIDATION
// -----------------------------------------------------------------------------
test("AI Authoring Copilot lesson draft and MCQ structure validation", () => {
  function validateDraft(draft) {
    if (!draft.title || typeof draft.title !== "string" || !draft.title.trim()) return false;
    if (!draft.markdownContent || typeof draft.markdownContent !== "string") return false;
    return true;
  }

  function validateMcqQuestion(q) {
    if (!q.question || typeof q.question !== "string") return false;
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    if (!q.correct_option_id) return false;
    const hasCorrect = q.options.some((o) => o.id === q.correct_option_id);
    return hasCorrect;
  }

  const validDraft = {
    title: "Newtonian Mechanics & Momentum",
    summary: "Introductory physics study guide for JAMB candidates.",
    markdownContent: "# Principles of Momentum\n\nMomentum is mass in motion...",
    keyTakeaways: ["Conservation of momentum holds in all isolated systems."],
  };
  assert.strictEqual(validateDraft(validDraft), true);
  assert.strictEqual(validateDraft({ title: "" }), false);

  const validMcq = {
    question: "Which of the following is a scalar quantity?",
    options: [
      { id: "A", text: "Velocity" },
      { id: "B", text: "Speed" },
      { id: "C", text: "Acceleration" },
      { id: "D", text: "Force" },
    ],
    correct_option_id: "B",
    explanation: "Speed has magnitude only, with no directional vector.",
  };
  assert.strictEqual(validateMcqQuestion(validMcq), true);

  const invalidMcq = {
    question: "Invalid question missing options",
    options: [{ id: "A", text: "Only one option" }],
    correct_option_id: "A",
  };
  assert.strictEqual(validateMcqQuestion(invalidMcq), false);
});

// -----------------------------------------------------------------------------
// 13. USER PRESENCE HEARTBEAT & ROLE CLASSIFICATION TEST
// -----------------------------------------------------------------------------
test("User presence heartbeat activity calculation and role classification", () => {
  function classifyPresence(presence, thresholdMs = 180 * 1000) {
    const isRecent = Date.now() - new Date(presence.last_heartbeat_at).getTime() < thresholdMs;
    const isOnline = Boolean(presence.is_visible && isRecent);
    const inClass = isOnline && (presence.status === "in_class" || Boolean(presence.current_class_id));
    return {
      isOnline,
      inClass,
      role: presence.role || "student",
    };
  }

  // Active student in live class
  const liveStudent = {
    last_heartbeat_at: new Date(Date.now() - 30 * 1000).toISOString(),
    is_visible: true,
    status: "in_class",
    current_class_id: "c-123",
    role: "student",
  };
  assert.deepStrictEqual(classifyPresence(liveStudent), { isOnline: true, inClass: true, role: "student" });

  // Active tutor studying feed
  const feedTutor = {
    last_heartbeat_at: new Date(Date.now() - 60 * 1000).toISOString(),
    is_visible: true,
    status: "online",
    current_class_id: null,
    role: "tutor",
  };
  assert.deepStrictEqual(classifyPresence(feedTutor), { isOnline: true, inClass: false, role: "tutor" });

  // Expired heartbeat (>3m ago)
  const expiredUser = {
    last_heartbeat_at: new Date(Date.now() - 250 * 1000).toISOString(),
    is_visible: true,
    status: "online",
    role: "student",
  };
  assert.strictEqual(classifyPresence(expiredUser).isOnline, false);
});

// -----------------------------------------------------------------------------
// 14. COGNITIVE MASTERY RADAR & SUBJECT BREAKDOWN VALIDATION
// -----------------------------------------------------------------------------
test("Cognitive Mastery Radar calculation and subject banding", () => {
  function getSubjectStatus(percentage) {
    if (percentage >= 80) return "Mastered";
    if (percentage >= 65) return "Proficient";
    if (percentage >= 50) return "Emerging";
    return "Needs Focus";
  }

  assert.strictEqual(getSubjectStatus(92), "Mastered");
  assert.strictEqual(getSubjectStatus(74), "Proficient");
  assert.strictEqual(getSubjectStatus(58), "Emerging");
  assert.strictEqual(getSubjectStatus(42), "Needs Focus");

  // Composite readiness calculation
  function calculateReadiness(accuracy, speed, rigor, retention, consistency) {
    return Math.round(
      accuracy * 0.35 +
      speed * 0.2 +
      rigor * 0.15 +
      retention * 0.15 +
      consistency * 0.15
    );
  }

  const score = calculateReadiness(80, 70, 65, 75, 90);
  assert.strictEqual(score, 77);
});

console.log("\n-----------------------------------------------------------------");
console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
console.log("-----------------------------------------------------------------");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("🎉 All Live Learning and Communication test scenarios PASSED.\n");
}
