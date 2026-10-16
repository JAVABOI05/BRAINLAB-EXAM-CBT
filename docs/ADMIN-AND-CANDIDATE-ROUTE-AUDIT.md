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
