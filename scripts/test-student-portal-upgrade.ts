/**
 * BrainLab CI: Student Portal Upgrade Verification Suite
 *
 * Verifies:
 * 1. Database migration & rollback DDL for student portal (quiet hours, timezone, active membership index)
 * 2. Access control & safe return-path flow (same-origin relative paths only, open-redirect prevention)
 * 3. Unified groups and membership model (retire sample Study Groups data, localStorage mock removed)
 * 4. Notification preferences & quiet hours logic (timezone-aware window calculation)
 * 5. Dashboard redesign integrity (zero hardcoded scores like 260/65%, honest empty states, authoritative queries)
 */

import fs from "fs";
import { sanitizeRedirectUrl } from "../app/lib/authRedirect";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isInQuietHours,
  type NotificationPreferences,
} from "../app/lib/notificationPreferences";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log("\n=========================================================================");
console.log("  BRAINLAB CI: STUDENT PORTAL UPGRADE VERIFICATION SUITE");
console.log("=========================================================================\n");

// 1. MIGRATION & ROLLBACK DDL
console.log("1. DATABASE MIGRATION & ROLLBACK DDL");
const migrationPath = "supabase/migrations/20261108170000_student_portal_upgrade.sql";
const rollbackPath = "supabase/migrations/20261108170000_rollback_student_portal_upgrade.sql";

assert(fs.existsSync(migrationPath), `${migrationPath} exists`);
assert(fs.existsSync(rollbackPath), `${rollbackPath} exists`);

if (fs.existsSync(migrationPath)) {
  const sql = fs.readFileSync(migrationPath, "utf8");
  assert(sql.includes("quiet_hours_start TIME WITHOUT TIME ZONE DEFAULT '22:00'"), "Adds quiet_hours_start to notification_preferences");
  assert(sql.includes("quiet_hours_end TIME WITHOUT TIME ZONE DEFAULT '07:00'"), "Adds quiet_hours_end to notification_preferences");
  assert(sql.includes("timezone TEXT NOT NULL DEFAULT 'Africa/Lagos'"), "Adds timezone to notification_preferences");
  assert(sql.includes("idx_group_memberships_active_student"), "Creates performance index on active student memberships");
}

if (fs.existsSync(rollbackPath)) {
  const rollbackSql = fs.readFileSync(rollbackPath, "utf8");
  assert(rollbackSql.includes("DROP INDEX IF EXISTS public.idx_group_memberships_active_student"), "Rollback drops active membership index");
  assert(rollbackSql.includes("DROP COLUMN IF EXISTS quiet_hours_start"), "Rollback removes quiet hours columns");
}

// 2. SAFE RETURN-PATH & OPEN-REDIRECT MITIGATION
console.log("\n2. ACCESS CONTROL & SAFE RETURN-PATH HARDENING");
assert(sanitizeRedirectUrl("/assignments") === "/assignments", "Accepts safe relative path /assignments");
assert(sanitizeRedirectUrl("/dashboard?tab=overview") === "/dashboard?tab=overview", "Accepts safe relative path with query parameters");
assert(sanitizeRedirectUrl("//evil.com") === "/dashboard", "Rejects protocol-relative //evil.com");
assert(sanitizeRedirectUrl("/\\evil.com") === "/dashboard", "Rejects backslash bypass /\\evil.com");
assert(sanitizeRedirectUrl("https://evil.com/phish") === "/dashboard", "Rejects absolute URL https://evil.com/phish");
assert(sanitizeRedirectUrl("javascript:alert(1)") === "/dashboard", "Rejects javascript scheme");
assert(sanitizeRedirectUrl("/path\0evil") === "/dashboard", "Rejects null byte injection");

const loginCode = fs.readFileSync("app/login/page.tsx", "utf8");
assert(loginCode.includes("sanitizeRedirectUrl"), "app/login/page.tsx sanitizes candidate redirect targets");
assert(loginCode.includes('searchParams.get("redirect") || searchParams.get("next")'), "app/login/page.tsx synchronizes redirect and next parameters");

const callbackCode = fs.readFileSync("app/auth/callback/page.tsx", "utf8");
assert(callbackCode.includes("sanitizeRedirectUrl"), "app/auth/callback/page.tsx sanitizes OAuth return destinations");
assert(callbackCode.includes('params.get("next") || params.get("redirect")'), "app/auth/callback/page.tsx synchronizes next and redirect parameters");

// 3. UNIFIED GROUPS MODEL & RETIRED SAMPLE DATA
console.log("\n3. UNIFIED GROUPS MODEL & RETIRED SAMPLE DATA");
const studyGroupsPage = fs.readFileSync("app/study-groups/page.tsx", "utf8");
assert(!studyGroupsPage.includes("STUDY_CIRCLES"), "app/study-groups/page.tsx has retired hardcoded sample circles");
assert(!studyGroupsPage.includes("LOCAL_JOINED_CIRCLES_KEY") && !studyGroupsPage.includes("localStorage.setItem"), "app/study-groups/page.tsx removes fake localStorage mock persistence");
assert(studyGroupsPage.includes('/community'), "app/study-groups/page.tsx forwards learners to canonical /community hub");

// 4. NOTIFICATION PREFERENCES & QUIET HOURS
console.log("\n4. NOTIFICATION PREFERENCES & QUIET HOURS LOGIC");
assert(DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours_start === "22:00", "Default quiet hours start set to 22:00");
assert(DEFAULT_NOTIFICATION_PREFERENCES.quiet_hours_end === "07:00", "Default quiet hours end set to 07:00");
assert(DEFAULT_NOTIFICATION_PREFERENCES.timezone === "Africa/Lagos", "Default timezone set to Africa/Lagos");

const testPrefs: NotificationPreferences = {
  email: "test@example.com",
  exam_results: true,
  classroom_alerts: true,
  streak_reminders: true,
  assignments: true,
  marketing_announcements: false,
  sms_alerts: false,
  unsubscribed_all: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "07:00",
  timezone: "Africa/Lagos",
};

// 23:30 in Lagos is during quiet hours
const midnightLagos = new Date("2026-11-08T22:30:00.000Z"); // 23:30 in UTC+1
assert(isInQuietHours(testPrefs, midnightLagos) === true, "isInQuietHours returns true at 23:30 local time");

// 14:00 in Lagos is outside quiet hours
const afternoonLagos = new Date("2026-11-08T13:00:00.000Z"); // 14:00 in UTC+1
assert(isInQuietHours(testPrefs, afternoonLagos) === false, "isInQuietHours returns false at 14:00 local time");

const settingsCode = fs.readFileSync("app/settings/SettingsClient.tsx", "utf8");
assert(settingsCode.includes("quiet_hours_start"), "Settings client binds quiet_hours_start state");
assert(settingsCode.includes("quiet_hours_end"), "Settings client binds quiet_hours_end state");
assert(settingsCode.includes("timezone"), "Settings client binds student timezone");

// 5. DASHBOARD REDESIGN & AUTHORITATIVE DATA INTEGRITY
console.log("\n5. DASHBOARD REDESIGN & ZERO-PLACEHOLDER INTEGRITY");
const dashboardCode = fs.readFileSync("app/dashboard/page.tsx", "utf8");
assert(!dashboardCode.includes("readiness ? readiness.predictedJambScore : 260"), "Eliminated hardcoded 260 predicted JAMB placeholder");
assert(!dashboardCode.includes("readiness ? readiness.predictedWaecPercent : 65"), "Eliminated hardcoded 65% predicted WAEC placeholder");
assert(!dashboardCode.includes('localStorage.getItem("exam_summary")'), "Eliminated unauthoritative localStorage exam_summary fallback");
assert(dashboardCode.includes("learning_test_attempts"), "Dashboard queries authoritative learning_test_attempts from database");
assert(dashboardCode.includes("community_group_memberships"), "Dashboard queries authoritative enrolled academic cohorts");
assert(dashboardCode.includes("ExamCountdownBanner"), "Dashboard renders authoritative ExamCountdownBanner near the top");
assert(dashboardCode.includes('href="/community"'), "Dashboard links to canonical /community ecosystem");

console.log("\n=========================================================================");
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=========================================================================\n");

if (failed > 0) {
  process.exit(1);
}
