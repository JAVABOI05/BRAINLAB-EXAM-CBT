# Admin and candidate route security audit

Date: 2026-10-16
Branch: `feature/brainlab-academy-upgrade`

This is a source-level review plus read-only production catalog/policy inspection. It is not a penetration test; catalog findings do not prove exploitation. No database changes or deployments were performed for this audit.

## Summary

**Release status: blocked.** CI passes, but build success is not evidence of secure authorization or correct CBT behavior. Production still has broad public/anonymous policies on sensitive legacy tables and functions. The candidate-facing app also depends on a newer RPC contract that has not been reconciled with production.

## Findings

### P0 — Production database access policies

The production check found broad anonymous/public table privileges and permissive policies involving sensitive objects, including `access_codes`, `admin_users`, `answers`, `audit_logs`, `exam_config`, `exam_sessions`, `questions`, `results`, `settings`, and summary views. Examples include public read policies using `USING (true)`, unrestricted public update checks, and an `ALL` policy on results.

Some privileged function grants have been restricted according to the current production migration history, but other legacy functions remain callable by `anon` and `authenticated`, including exam-configuration and access-code management functions. A `SECURITY DEFINER` function must enforce authorization inside its body.

**Required action:** prepare an object-by-object containment plan; confirm how the live legacy admin UI works; test changes in staging; review production rollout and rollback steps. Do not run blanket revokes without this plan.

### P0 — Production/frontend RPC contract mismatch

The review branch uses candidate-facing RPCs for public settings, attempt creation/resumption, progress persistence, tab-switch recording, submission, and result lookup. The latest production function-catalog inspection did not find the complete expected RPC set, while staging contains newer functions.

**Required action:** verify exact RPC arguments, return shapes, authorization, transaction behavior, duplicate-submit behavior, timing, and result-release behavior in staging. Do not point the upgrade branch at production until the schema/API contract is reconciled.

### P1 — Admin pages use client-side Supabase operations

Active admin pages issue Supabase queries/RPCs from the browser:
- `app/admin/dashboard/page.tsx`: settings and aggregate counts.
- `app/admin/codes/page.tsx`: access-code reads and management RPCs.
- `app/admin/config/page.tsx`: exam configuration reads/updates.
- `app/admin/questions/manage/page.tsx` and `app/admin/questions/page.tsx`: question reads/writes.
- `app/admin/results/page.tsx`: results, sessions, answers and audit-log operations.
- `app/admin/sessions/page.tsx`: exam-session reads.

The shared helper checks Supabase Auth and `is_admin()`, and the proxy gate requires a server-issued cookie after operator verification. These are useful layers, but browser-side checks are not the final authorization boundary. Every database operation still needs tested RLS and/or narrowly scoped server-side handlers. `localStorage.admin_user` must be presentation-only, never authorization.

**Required action:** test every operation as anonymous and ordinary authenticated users in staging; move sensitive mutations behind server-side handlers where practical; ensure database policies independently reject non-admin access; audit destructive operations.

### P1 — Candidate result/review release behavior needs end-to-end proof

The result and corrections pages consume cached browser state, while the documented server lookup currently returns a summary-only response. The scenario where a candidate submits while results are hidden and results are released later has not been proven end to end.

**Required action:** test hidden-result submission, later release, correct candidate lookup, wrong identity/code, repeated lookup, and cross-candidate access in staging. Do not expose answer keys/explanations before release is permitted.

### P1 — Admin entry checks need negative testing

The private entry path is defense-in-depth only; it does not replace Supabase Auth, role checks, or database authorization. Test direct `/admin/**` access without the gate cookie, expired/invalid sessions, a normal account, a valid admin, sign-out, and cookie expiry. The browser-stored `admin_user` must remain presentation-only.

## Release checklist

- [ ] Production backup and rollback plan documented.
- [ ] Staging schema/RPC inventory compared with production.
- [ ] Anonymous and non-admin table/RPC tests recorded for sensitive objects.
- [ ] All admin mutations tested as non-admin and admin.
- [ ] Timed attempt, resume, autosave, timeout and duplicate submission regression passes.
- [ ] Result-release/corrections flow passes with results initially hidden.
- [ ] Cross-candidate result lookup is denied.
- [ ] No service-role key or private secret is exposed to browser code.
- [ ] CI passes for the exact final review commit.
- [ ] Founder approval obtained before production deployment or further production database changes.

## Changes made during this audit

Documentation only. No production SQL, schema, Auth, DNS, merge, or deployment action was performed.

## Fresh production catalog verification — 2026-10-16

A follow-up read-only catalog query was run against production project `bupkyppvtkrmzmluzjmf` after the review-branch CI passed. This confirms the release blockers are not just historical notes.

### Candidate-facing RPC contract

The following review-branch RPC names were not present in the production function catalog returned by this check: `get_public_settings`, `check_access_code`, `start_exam`, `resume_exam`, `save_progress`, `record_tab_switch`, `submit_exam`, and `lookup_result`. This is a direct API/schema mismatch for the current frontend. Do not configure this branch against production until the expected RPC contract is deliberately deployed and verified in staging first.

### Sensitive table policies and grants

The following production tables have RLS enabled, but RLS alone does not protect rows when permissive public policies exist:

- `access_codes`: public UPDATE policy named `public can update access codes`, with unrestricted USING and WITH CHECK expressions.
- `exam_config`: public UPDATE policy named `public can update exam config`, unrestricted USING and WITH CHECK.
- `exam_sessions`: public INSERT and UPDATE policies with unrestricted checks.
- `questions`: public INSERT and SELECT policies, including `Allow public read access` and `public can read questions`.
- `results`: public ALL policy `Allow all operations`, plus public INSERT policies.
- `answers` and `audit_logs`: public INSERT policies.
- `admin_users`: RLS is enabled, but no policies were returned in the catalog query. Table ACLs still grant table operations to anon/authenticated, so verify effective behavior and remove excess grants/policies through a reviewed plan.

The query also showed table-level ACLs granting anon/authenticated operations on these legacy tables. Policy/grant changes must be designed together: removing one policy is not a substitute for verifying all effective access paths.

### Publicly executable legacy functions

The catalog query returned public/anon/authenticated EXECUTE grants for these functions:

- `insert_result_after_submit()`
- `set_question_marks()`
- `use_access_code(input_code text, candidate_phone text)`
- `validate_access_code(input_code text)`
- `validate_and_use_access_code(input_code text, input_phone text, input_subject text)`

`validate_and_use_access_code` is marked SECURITY DEFINER. The function definitions and callers must be reviewed before any grant change; no function was called and no grants were changed during this check.

Some previously flagged configuration-management functions now showed explicit grants only to postgres/service_role in this catalog query. Therefore, treat current ACL output—not older notes—as the source of truth for each object and repeat the inventory immediately before any remediation.

**Disposition:** production remains a no-go for the upgrade branch. This was a read-only catalog inspection only; no SQL writes, schema changes, Auth configuration changes, merges, or deployments were performed.

## Staging-versus-production RPC contract matrix — 2026-10-16

A second read-only comparison queried function signatures, return types, SECURITY DEFINER flags, and ACLs in both Supabase projects.

| Candidate API | Staging | Production |
|---|---|---|
| `get_public_settings()` | Present; JSONB | Not found |
| `check_access_code(p_code text, p_phone text)` | Present; JSONB | Not found |
| `start_exam(p_code text, p_name text, p_phone text, p_elective text)` | Present; JSONB | Not found |
| `resume_exam(p_session uuid, p_token uuid)` | Present; JSONB | Not found |
| `save_progress(p_session uuid, p_token uuid, p_answers jsonb)` | Present; JSONB | Not found |
| `record_tab_switch(p_session uuid, p_token uuid)` | Present; JSONB | Not found |
| `submit_exam(p_session uuid, p_token uuid, p_answers jsonb, p_auto boolean, p_flagged jsonb)` | Present; JSONB | Not found |
| `lookup_result(p_phone text, p_code text)` | Present; JSONB | Not found |
| `get_leaderboard(p_limit integer)` | Present; JSONB | Not found |

The staging signatures align with the typed wrappers in `app/lib/examApi.ts`. All listed staging candidate RPCs are SECURITY DEFINER and have anon/authenticated EXECUTE grants. This is expected for the public candidate flow only if the function bodies strictly validate untrusted inputs, scope each attempt to its session token, avoid exposing answer keys before release, and enforce rate limits and result-release rules. The read-only signature query did not prove every body meets those requirements; staging end-to-end tests remain required.

The legacy production functions `use_access_code(input_code text, candidate_phone text)`, `validate_access_code(input_code text)`, and `validate_and_use_access_code(input_code text, input_phone text, input_subject text)` still have PUBLIC/anon/authenticated EXECUTE grants in production. In staging, the first two were limited to postgres/service_role; `validate_and_use_access_code` had no PUBLIC/anon/authenticated grant. Production still lacks the candidate API names expected by this branch, so switching the app to production would both break the new flow and leave the old exposed API surface in place.

### Required next verification

Before proposing any migration, inspect the full definitions of the three production legacy access-code functions and all callers. Prepare a staged, reversible migration that aligns grants and policies with intended callers, then verify both allowed candidate operations and denied unauthenticated/admin-only operations using staging test accounts. Do not copy staging schema blindly to production or apply this remediation without explicit approval.

## Legacy production access-code function body review — 2026-10-16

A read-only `pg_get_functiondef` inspection was completed for the three publicly executable legacy functions:

- `use_access_code(input_code text, candidate_phone text)` directly updates `access_codes` to mark a matching unused code as consumed and sets `used_by` to the caller-supplied phone. The function is not SECURITY DEFINER, but the current production table ACL and unrestricted public UPDATE policy make the operation a serious candidate for unauthorized code consumption or `used_by` tampering. Validate effective role behavior with a controlled staging test before changing policy/grants.
- `validate_access_code(input_code text)` returns the matching row's `id`, `code`, and `is_used`. It is not SECURITY DEFINER. The function body itself does not filter the returned fields; whether rows are visible is affected by the caller's RLS policy, so confirm effective behavior as anon rather than assuming the function is safe or exploitable from its definition alone.
- `validate_and_use_access_code(input_code text, input_phone text, input_subject text)` is SECURITY DEFINER. It validates input lengths, checks the master code, locks a normal code row, checks use/subject, and marks normal codes consumed. It does not return the master code, but its public execution and privileged table access mean its full threat model—including master-code attempts, throttling, auditing, and concurrent use—must be tested.

All three function definitions set `search_path` to `public, pg_temp`, which is preferable to an uncontrolled search path but does not resolve the over-broad public API surface. No function was invoked, no access-code rows were read, and no production policy, grant, function, or data was changed.

**Priority:** plan and verify the `access_codes` table grants/policies and these function grants together. Do not simply revoke every candidate-facing function until the replacement `check_access_code`/`start_exam` flow is confirmed and regression-tested in staging.

## Staging candidate RPC body spot-check — 2026-10-16

Read-only function-definition inspection of staging `check_access_code`, `start_exam`, and `lookup_result` found:

- `check_access_code` checks the exam-enabled setting, access-code-required setting, input presence, and a phone-based throttling helper; it checks the master code and otherwise looks up the candidate code. It logs failed attempts. It is SECURITY DEFINER and publicly executable, so helper behavior and function-level rate-limit robustness are part of the security boundary.
- `start_exam` validates name/phone and restricts elective to Biology or Mathematics; checks the exam-enabled setting; checks access code and throttling; locks a normal code row; resumes a matching active attempt before creating a new one; builds the paper server-side; and consumes a normal code when starting. The `EXCEPTION WHEN OTHERS` handler currently returns `sqlerrm` in the `paper_unavailable` response. **Recommendation:** change this to a generic public error and retain detailed diagnostics only in server-side logs, so database/internal error details are not exposed to candidates. This should be prepared and tested as a staging migration, not patched directly in production.
- `lookup_result` checks the result-release setting, requires phone and access code, applies the phone throttle, and matches both against the session before returning a result summary. It logs failed lookups. Confirm the throttle cannot be bypassed by rotating phone values and that the release toggle is enforced after submission.

This is a targeted source-definition review, not proof that all helper functions or flows are secure. The staging DB was not modified, and no candidate attempts were created or submitted during the inspection.
