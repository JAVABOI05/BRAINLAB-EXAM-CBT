# Candidate Session Recovery

## Scope

This change is prepared on `feat/candidate-session-recovery` for staging review. It does not apply the SQL migration, deploy an application, merge to `main`, or modify production data.

## Recovery flow

1. The candidate returns to the CBT access page and enters the original phone number and PIN.
2. PIN validation checks for an active `exam_sessions` row matching that phone, access code and canonical `started` status.
3. A used PIN is accepted only when that same phone has the matching active attempt.
4. The exam-start API calls `resume_exam` and returns the original paper, attempt token, server-saved answers, original deadline-derived time remaining and server checkpoint timestamp.
5. A newer offline answer queue for that same session is reconciled with the server. A stale queue is discarded in favour of the newer server checkpoint.
6. The candidate resumes at the first unanswered question. If the original deadline has elapsed, the existing server finalisation flow returns the completed result instead of creating a new paper.

## Administrative controls

- **Sync Session** verifies the authoritative server-side session state and reports saved-answer count, time remaining and last save time. It cannot retrieve unsent answers from a disconnected browser.
- **Restore** verifies that the session remains active and records the administrator's recovery authorisation. It does not create a new attempt or change the database status.
- **+15m** updates both `deadline_at` and `time_left_seconds`; the server deadline remains authoritative.
- **Force Submit** uses the `submit_exam` RPC so result creation and session status remain consistent with the database lifecycle.

The active status remains `started`. The current database check constraint does not permit `in_progress`; writing that value is not a valid recovery strategy.

## Staging verification checklist

Use dedicated test candidates and test PINs only.

1. Start a fresh paper and answer several questions; confirm the server checkpoint updates.
2. Sign out / clear the browser's candidate session pointer, then re-enter using the same phone and used PIN.
3. Confirm the same session ID, paper, saved answers and original deadline are returned; confirm no second session is inserted.
4. Confirm the candidate resumes at the first unanswered question.
5. Disconnect the network, answer one or more questions, reconnect and verify the newer queued snapshot is saved.
6. Create a stale queued snapshot and verify it is discarded when the server checkpoint is newer.
7. Repeat after closing and reopening the browser.
8. Repeat with the exam deadline elapsed; confirm finalisation occurs once and no new attempt is created.
9. Verify submitted and cancelled sessions cannot be restored.
10. Verify administrator Sync, Restore, +15m and Force Submit actions and their audit records.
11. Confirm no code path writes unsupported statuses such as `in_progress` or `completed` to `exam_sessions.status`.

## Release gates

- Run `npm run test:session-recovery`, `npm run typecheck`, the existing offline-sync test and the full project verification/build.
- Apply `supabase/migrations/20261121120000_candidate_session_recovery.sql` to **staging only** after reviewing the migration.
- Test the staging application against the staging Supabase project with dedicated test records.
- Inspect the resulting diff and staging test evidence.
- Obtain explicit approval before merging, applying any production migration, or deploying.
