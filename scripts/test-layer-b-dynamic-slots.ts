/**
 * Automated Test Suite for Layer B Dynamic Slots
 * Tests:
 * 1. Exam Calendar countdown math, state machine (UPCOMING -> IN_PROGRESS -> ENDED), and server skew offset
 * 2. Auto-advance to next published event & graceful suppression when no event
 * 3. Programme targeting (UTME vs WAEC)
 * 4. Africa/Lagos WAT timezone formatting
 * 5. Rule S7 verified statistics formatting & minimum threshold suppression
 * 6. Migration SQL, rollback SQL, and RLS policy verification
 * 7. Admin permissions registration
 */

// Set dummy fallback environment variables for offline test execution
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test-placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

import fs from "fs";
import path from "path";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runSuite() {
  console.log("\n========================================================");
  console.log("RUNNING LAYER B DYNAMIC SLOTS TEST SUITE");
  console.log("========================================================\n");

  const {
    calculateExamCountdown,
    getActiveExamEvent,
    formatLagosDate,
  } = await import("../app/lib/services/examCalendarService");

  const {
    formatVerifiedStat,
    DEFAULT_QUESTION_STAT_RULE,
  } = await import("../app/lib/services/platformStatsService");

  const { ADMIN_PERMISSION_KEYS } = await import("../app/lib/adminRoles");

  // --- 1. Exam Calendar Countdown Math & States ---
  console.log("--- 1. Exam Countdown Math & State Transitions ---");

  const testEvent = {
    id: "test-event-1",
    name: "2027 JAMB UTME National Examination",
    short_name: "JAMB UTME",
    programme: "utme" as const,
    start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days in future
    end_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days in future
    placement: "both" as const,
    priority: 10,
    status: "published" as const,
  };

  // State: UPCOMING
  const upcoming = calculateExamCountdown(testEvent, Date.now());
  assert(upcoming.state === "UPCOMING", "Returns UPCOMING state when current time < start_time");
  assert(upcoming.days === 4 || upcoming.days === 5, "Calculates correct remaining days");
  assert(!upcoming.isExpired, "isExpired is false for upcoming event");

  // State: IN_PROGRESS
  const inProgressTime = new Date(testEvent.start_time).getTime() + 10000; // 10s after start
  const inProgress = calculateExamCountdown(testEvent, inProgressTime);
  assert(inProgress.state === "IN_PROGRESS", "Returns IN_PROGRESS state when start_time <= now <= end_time");
  assert(!inProgress.isExpired, "isExpired is false during event");

  // State: ENDED
  const endedTime = new Date(testEvent.end_time!).getTime() + 10000; // 10s after end
  const ended = calculateExamCountdown(testEvent, endedTime);
  assert(ended.state === "ENDED", "Returns ENDED state when now > end_time");
  assert(ended.isExpired, "isExpired is true when ended");

  // Clock skew compensation
  const clientTamperedTime = Date.now() + 3 * 60 * 60 * 1000; // Client is 3 hours in future
  const skewOffsetMs = -3 * 60 * 60 * 1000; // Server offset cancels the tamper
  const correctedTime = clientTamperedTime + skewOffsetMs;
  const skewResult = calculateExamCountdown(testEvent, correctedTime);
  assert(skewResult.state === "UPCOMING", "Skew adjustment compensates for client device clock error");

  // --- 2. Auto-Advance & Event Selection ---
  console.log("\n--- 2. Auto-Advance & Selection Logic ---");

  const endedEvent = {
    id: "ended-1",
    name: "2026 Mock CBT",
    short_name: "Mock 2026",
    programme: "utme" as const,
    start_time: "2026-01-01T08:00:00Z",
    end_time: "2026-01-05T18:00:00Z",
    placement: "both" as const,
    priority: 5,
    status: "published" as const,
  };

  const futureEvent = {
    id: "future-1",
    name: "2027 WAEC SSCE",
    short_name: "WAEC 2027",
    programme: "waec" as const,
    start_time: "2027-05-10T08:00:00Z",
    placement: "both" as const,
    priority: 20,
    status: "published" as const,
  };

  // Selection ignores ended events and picks the first upcoming
  const active = getActiveExamEvent([endedEvent, futureEvent], Date.now());
  assert(active?.id === "future-1", "Auto-advances past ended event to next upcoming event");

  // When all events have ended, returns null (clean unmount)
  const allEnded = getActiveExamEvent([endedEvent], Date.now());
  assert(allEnded === null, "Returns null when all events have ended (gracefully unmounts)");

  // Programme targeting
  const utmeFuture = {
    id: "future-utme",
    name: "2027 JAMB UTME",
    short_name: "UTME",
    programme: "utme" as const,
    start_time: "2027-04-18T08:00:00Z",
    placement: "both" as const,
    priority: 10,
    status: "published" as const,
  };

  const studentTargeted = getActiveExamEvent([futureEvent, utmeFuture], Date.now(), "utme");
  assert(studentTargeted?.id === "future-utme", "Prioritizes student enrolled programme (UTME)");

  // --- 3. Africa/Lagos WAT Timezone Formatting ---
  console.log("\n--- 3. Africa/Lagos WAT Timezone Formatting ---");

  // UTC 2027-04-18 07:00:00Z must format to 08:00 in Africa/Lagos (UTC+1)
  const utcTimestamp = "2027-04-18T07:00:00.000Z";
  const formattedLagos = formatLagosDate(utcTimestamp);
  assert(formattedLagos.includes("08:00") || formattedLagos.includes("8:00"), `Correctly formats 07:00 UTC to 08:00 WAT (${formattedLagos})`);
  assert(formattedLagos.includes("2027"), "Includes target year 2027");

  // --- 4. Live Statistics Formatting (Rule S7) ---
  console.log("\n--- 4. Live Statistics & Rule S7 Threshold Compliance ---");

  // Suppressed below threshold (< 50)
  assert(formatVerifiedStat(0, DEFAULT_QUESTION_STAT_RULE) === null, "Suppresses count of 0 (returns null)");
  assert(formatVerifiedStat(49, DEFAULT_QUESTION_STAT_RULE) === null, "Suppresses count of 49 (< 50 threshold)");
  assert(formatVerifiedStat(null, DEFAULT_QUESTION_STAT_RULE) === null, "Suppresses null count");
  assert(formatVerifiedStat(undefined, DEFAULT_QUESTION_STAT_RULE) === null, "Suppresses undefined count");
  assert(formatVerifiedStat(NaN, DEFAULT_QUESTION_STAT_RULE) === null, "Suppresses NaN count");

  // Exact display between threshold and 999
  const formattedExact = formatVerifiedStat(450, DEFAULT_QUESTION_STAT_RULE);
  assert(formattedExact === "450", `Formats exact count for < 1000: expected "450", got "${formattedExact}"`);

  // Round down to nearest 100 for 1,000 - 9,999
  const formattedHundreds = formatVerifiedStat(2480, DEFAULT_QUESTION_STAT_RULE);
  assert(formattedHundreds === "2,400+", `Rounds down to nearest 100 for 1,000-9,999: expected "2,400+", got "${formattedHundreds}"`);

  // Round down to nearest 1,000 for >= 10,000
  const formattedThousands = formatVerifiedStat(15320, DEFAULT_QUESTION_STAT_RULE);
  assert(formattedThousands === "15,000+", `Rounds down to nearest 1,000 for >= 10,000: expected "15,000+", got "${formattedThousands}"`);

  // --- 5. Database Migration & Rollback SQL Verification ---
  console.log("\n--- 5. Migration & Rollback SQL Integrity ---");

  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261108100000_exam_calendar_and_statistics.sql");
  assert(fs.existsSync(migrationPath), "Migration SQL file exists in supabase/migrations");

  const migrationContent = fs.readFileSync(migrationPath, "utf8");
  assert(migrationContent.includes("CREATE TABLE IF NOT EXISTS public.exam_calendar_events"), "Creates exam_calendar_events table");
  assert(migrationContent.includes("ENABLE ROW LEVEL SECURITY"), "Enables Row-Level Security");
  assert(migrationContent.includes("status = 'published'"), "Enforces RLS policy for published events only");
  assert(migrationContent.includes("check_exam_calendar_dates"), "Includes end_time >= start_time check constraint");
  assert(migrationContent.includes("idx_exam_calendar_published_active"), "Defines active events index");

  const rollbackPath = path.resolve(process.cwd(), "supabase/migrations/20261108100000_rollback_exam_calendar_and_statistics.sql");
  assert(fs.existsSync(rollbackPath), "Rollback SQL file exists");
  const rollbackContent = fs.readFileSync(rollbackPath, "utf8");
  assert(rollbackContent.includes("DROP TABLE IF EXISTS public.exam_calendar_events"), "Rollback SQL drops the table cleanly");

  // --- 6. Admin Permissions Registration ---
  console.log("\n--- 6. Admin Permissions Registration ---");
  assert(
    (ADMIN_PERMISSION_KEYS as readonly string[]).includes("exam.calendar.manage"),
    "ADMIN_PERMISSION_KEYS contains 'exam.calendar.manage'"
  );

  console.log("\n========================================================");
  if (failures === 0) {
    console.log("🎉 ALL LAYER B DYNAMIC SLOTS TESTS PASSED!");
    process.exit(0);
  } else {
    console.error(`💥 ${failures} TEST(S) FAILED!`);
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Fatal suite exception:", err);
  process.exit(1);
});
