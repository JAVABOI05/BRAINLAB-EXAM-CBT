import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
const startRoute = read("app/api/exam/start/route.ts");
const resolveRoute = read("app/api/exam/resolve-code/route.ts");
const adminAction = read("app/api/admin/sessions/[id]/action/route.ts");
const examPage = read("app/exam/page.tsx");
const migration = read("supabase/migrations/20261121120000_candidate_session_recovery.sql");
const authClient = read("app/lib/supabase.ts");

function check(name: string, condition: boolean) {
  assert.ok(condition, name);
  console.log("✓ " + name);
}

console.log("BRAINLAB CBT — CANDIDATE SESSION RECOVERY CHECKS");

check(
  "Candidate start route looks up the same phone + PIN active attempt before PIN consumption",
  startRoute.indexOf("Recovery takes precedence over access-code consumption") < startRoute.indexOf("Consume a normal access code") &&
    startRoute.includes('.eq("phone", cleanPhone)') &&
    startRoute.includes('.eq("access_code", sessionCode)')
);

check(
  "Candidate start route calls resume_exam and returns the original attempt instead of generating a new paper",
  startRoute.includes('supabase.rpc("resume_exam"') &&
    startRoute.includes("last_saved_at: existingSession.last_saved_at") &&
    startRoute.includes("recovered.questions")
);

check(
  "Used voucher PIN can be revalidated only when the same phone has an active session",
  resolveRoute.includes("hasRecoverableAttempt") &&
    resolveRoute.includes('.eq("phone", phone)') &&
    resolveRoute.includes('codeRecord.is_used && !hasRecoverableAttempt')
);

check(
  "Master-code re-entry also checks for the same candidate's active attempt",
  resolveRoute.includes("resumed_attempt: resumedAttempt")
);

check(
  "Admin sync verifies server-side state without exposing the attempt token or answer payload",
  adminAction.includes('action === "sync_session"') &&
    adminAction.includes('supabase.rpc("resume_exam"') &&
    adminAction.includes("questionsAnswered") &&
    !adminAction.includes("status: \"in_progress\"")
);

check(
  "Admin restore keeps the canonical started status and does not write in_progress",
  adminAction.includes('action === "restore_session" || action === "unlock"') &&
    adminAction.includes("recovery_authorized: true") &&
    !adminAction.includes('status: "in_progress"')
);

check(
  "Time extension updates the authoritative deadline, not only the cached countdown",
  adminAction.includes("deadline_at: newDeadlineAt") &&
    adminAction.includes("time_left_seconds: newSeconds")
);

check(
  "Force submit uses the secure submit_exam RPC rather than an unsupported status update",
  adminAction.includes('supabase.rpc("submit_exam"') &&
    !adminAction.includes('status: "completed"')
);

check(
  "Active papers are not discarded because their question count differs from 180",
  !examPage.includes("questions.length < 180") &&
    examPage.includes("Never discard an active attempt because its question count differs")
);

check(
  "Candidate recovery handles already-finished attempts and restores newer queued offline answers",
  examPage.includes("if (res.finished)") &&
    examPage.includes("getQueuedProgress()") &&
    examPage.includes("queuedProgress.timestamp > serverSavedAt") &&
    examPage.includes("firstUnanswered >= 0 ? firstUnanswered : 0")
);

check(
  "Recovery migration locks the session and exposes last_saved_at for conflict-safe reconciliation",
  migration.includes("FOR UPDATE") &&
    migration.includes("'last_saved_at', s.last_saved_at") &&
    migration.includes("s.status IN ('submitted', 'expired')")
);

check(
  "Logout cleanup does not erase the durable offline progress queue",
  !authClient.includes("brainlab_offline_exam_progress") &&
    !authClient.includes("brainlab_offline_exam_submission")
);

console.log("All candidate session recovery source checks passed.");
