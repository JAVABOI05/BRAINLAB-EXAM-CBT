# CBT access-code and exam-session transaction design

**Status:** Design only — not an applied migration or implementation.
**Scope:** Legacy full-mock CBT launch in `app/api/exam/start/route.ts`.
**Safety:** No live records, privileges, functions, or database objects were changed while preparing this design.

## 1. Verified current launch sequence

The current route performs these operations in separate PostgREST requests:

1. Reads the access policy and validates the submitted code.
2. Generates the 180-question paper and attempt token.
3. Reserves a normal code with a conditional update:
   `UPDATE access_codes SET is_used=true, used_by=cleanPhone WHERE code=cleanCode AND is_used=false RETURNING id`.
4. Inserts `exam_sessions`.
5. If session insertion fails, attempts to reset `is_used=false` and `used_by=null`.
6. Calls `mark_access_code_used(code, usedBy, sessionId)`.
7. If that RPC fails (normally because step 3 already marked the code used), performs fallback updates to attach `used_at` and `exam_session_id`.

The existing migration `20261101230000_access_codes_tracking_and_maintenance_notifications.sql` grants `mark_access_code_used(text,text,uuid)` to `anon`, `authenticated`, and `service_role`. Its SECURITY DEFINER body accepts caller-supplied `p_used_by` and `p_session_id`, does not authenticate the caller, and does not verify that the supplied session exists or belongs to the code. This is not a safe public contract.

## 2. Target invariant

For a normal single-use code, exactly one database transaction must:

- lock and validate the matching unused code;
- create the exam session with the already-generated paper snapshot and attempt token;
- mark the code used and attach the new session ID;
- commit both changes together.

If any step fails, neither the session nor code consumption commits. No compensating HTTP request should be needed. A code must never be consumed by supplying an arbitrary candidate identity or unrelated session ID.

Paper generation remains outside the transaction. It is expensive and does not need to hold a row lock. The transaction should begin only after the route has a complete, validated 180-question paper.

## 3. Proposed server-only RPC contract

Introduce a narrowly scoped function (proposed name: `create_exam_session_and_consume_code`) with explicit parameters for the session fields currently inserted by the route:

- candidate name and phone after server-side normalization;
- selected subject string and elective;
- code value, or an explicit access mode for open/master-code attempts;
- paper question IDs;
- duration and deadline;
- server-generated attempt token;
- master-code flag.

The function should:

1. Reject null/empty required values and malformed payload sizes.
2. For a normal code, normalize the code and select exactly one matching row `FOR UPDATE`.
3. Reject missing or already-used codes with stable machine-readable errors.
4. Insert `exam_sessions` and capture its generated ID.
5. Update the locked code row to `is_used=true`, `used_by`, `used_at=now()`, and `exam_session_id=session.id`.
6. Assert exactly one code row was updated.
7. Return the created session ID and any minimum response metadata required by the route.
8. Let PostgreSQL roll back the session insert and code update together if any statement fails.

For open and master-code launches, do not attempt to lock or consume a normal code. The function must still validate that the requested access mode is allowed by the server-side route policy; the client must not be able to label an arbitrary normal code as a master code.

### Privileges

- Revoke execution from `PUBLIC`, `anon`, and `authenticated`.
- Grant execution only to `service_role` if the route uses its service-role client.
- Keep the function SECURITY DEFINER only if required; pin `search_path` to trusted schemas and schema-qualify all table/function references.
- Do not expose a public function parameter that allows callers to set arbitrary `used_by` values independently of the server-validated candidate data.
- Keep the legacy function until every caller and environment has been reconciled. Then revoke its broad grants in a forward-only migration; do not rewrite an already-applied migration as the sole fix.

## 4. Route changes after the RPC exists

- Keep current policy validation, code validation, paper generation, and existing-attempt recovery.
- Remove the direct code reservation update.
- Replace the standalone `exam_sessions.insert()`, compensating reset, `mark_access_code_used` call, and fallback metadata updates with one call to the new RPC.
- On a known code-used response, return HTTP 409.
- On a missing/invalid code, return the existing invalid-code response.
- On an infrastructure/database failure, return a generic retryable 503/500 response; do not leak SQL internals.
- Preserve the existing registered-user exposure-history write only after the session transaction succeeds.
- Preserve snapshot freezing and question payload generation after the session exists.
- Keep active-attempt recovery ahead of new code consumption so a candidate does not burn a second code when resuming.

## 5. Important edge cases and unresolved design decisions

- **Concurrent launch:** Two requests using one code must serialize on the code row; exactly one may create a session.
- **Session insert failure:** The transaction rolls back without a compensating reset.
- **Code update failure:** The session insert rolls back.
- **Network timeout after commit:** The caller may not know whether the transaction committed. Existing recovery currently looks up a started session by phone and access code. Before implementation, confirm the lookup remains unambiguous for the intended candidate model; consider a server-generated launch idempotency key if retries can create duplicate sessions.
- **Shared master/open attempts:** Existing recovery explicitly refuses phone-only recovery for master/open attempts. Preserve that safety decision unless a separate identity-proof flow is designed.
- **Duplicate code rows:** Verify a unique constraint/index on normalized code values. If the database does not enforce uniqueness, the RPC must reject ambiguous matches rather than arbitrarily consume one.
- **Candidate phone/name:** These are candidate-supplied values in the anonymous CBT path, not verified identity. Store them as supplied candidate labels, not proof of identity.
- **Registered user:** The current `exam_sessions` insert does not include a verified `user_id`; do not silently change attempt ownership semantics in this refactor.
- **Schema drift:** The route has a fallback for deployments missing `used_at` or `exam_session_id`. The new RPC requires a reconciled schema. Inspect staging and production independently before drafting environment-specific migrations; do not preserve a silent fallback that hides schema mismatch.
- **Legacy function callers:** Repository inspection found the route as the application caller. Still check database jobs, external clients, and deployed code before retiring the function.

## 6. Required tests before any database change

Run against an isolated disposable database or CI database, not production and not live student records:

1. One unused normal code creates one session and links the code to that session.
2. Two concurrent calls with the same code produce exactly one successful session and one code-consumed failure.
3. A missing code creates no session.
4. An already-used code creates no session.
5. A forced session insert failure leaves the code unused.
6. A forced code-update failure leaves no session.
7. A mismatched or arbitrary session ID cannot be attached through the legacy RPC after its retirement.
8. Master/open launches do not consume a normal code.
9. Existing started-attempt recovery does not consume a new code.
10. The public roles cannot execute the new RPC or legacy unsafe function.
11. Service-role route invocation succeeds only with server-derived and validated payload.
12. Existing candidate launch, save, resume, submit, and results flows remain unchanged.

## 7. Release sequence

1. Finish call-site and schema inventory for staging and production independently.
2. Verify normalized-code uniqueness and all required session columns/constraints.
3. Implement the RPC and focused integration tests in a disposable database/CI environment.
4. Update the route to use the RPC and remove the old multi-request sequence.
5. Re-test CBT start/recovery/save/submit and all error paths.
6. Prepare a forward-only staging migration with explicit grants and rollback notes.
7. Request explicit approval before applying to staging.
8. Reconcile production schema and migration history separately; request separate approval before any production change.

**No staging migration, production migration, privilege change, merge, or deployment is authorized by this design document.**


## 8. Environment-specific catalog verification — 27 November 2026

Read-only catalog queries were run separately against staging project `eusgwsuoloomphebrepe` and existing production project `bupkyppvtkrmzmluzjmf`. No table rows were read and no database objects or privileges were changed.

### Staging

- `access_codes.used_at` and `access_codes.exam_session_id` exist.
- `exam_sessions` contains the columns currently inserted by the route: candidate name, phone, subject, access code, status, paper IDs, time-left, duration, deadline, attempt token, master-code flag and elective. It also has a non-null `draft_answers` column with a default.
- `access_codes.code` has a unique constraint/index, plus a second unique index on the same raw `code` column and a non-unique lookup index. The duplicate unique indexes are redundant but must not be dropped as part of this repair without a separate index review.
- `mark_access_code_used(text,text,uuid)` exists as SECURITY DEFINER and its ACL includes PUBLIC, anon, authenticated and service_role.

### Existing production project

- `access_codes.used_at` and `access_codes.exam_session_id` do not exist.
- The inspected production catalog has no `mark_access_code_used(text,text,uuid)` function.
- `access_codes.code` has a unique constraint/index and a second unique index on the same raw column.
- The inspected `exam_sessions` columns otherwise include the fields required by the current route, including `attempt_token`, `paper_ids`, `draft_answers`, `duration_seconds`, `deadline_at`, and `is_master_code`.

### Consequences

1. The new transaction migration must be reconciled independently for staging and production. The production migration must add the tracking columns as part of the new transaction contract (or avoid those columns and return linkage another way); it must not assume they already exist.
2. The old `mark_access_code_used` function is a staging-only object in this comparison. A production migration should not attempt to revoke it without an existence guard, and production must not depend on it.
3. Raw-code uniqueness does not prove normalized-code uniqueness. The new function must query all rows matching `upper(trim(code)) = upper(trim(p_code))`, reject zero matches and reject more than one match, and only then lock the single row. A later data/constraint migration may normalize codes only after a duplicate audit and explicit approval.
4. The staging RPC's PUBLIC/anon/authenticated grants are confirmed by its live ACL. Revoke them only after the replacement route is deployed and caller inventory is complete; the replacement function should be executable only by service_role.
5. No data counts or code values were queried. No code was consumed, no session was created, and no student records were inspected.

## 9. Revised migration guardrails

- Use a forward-only migration for each target environment; do not edit the already-applied `20261101230000` migration as the only fix.
- In staging, create the new server-only RPC and retain the old RPC temporarily with its legacy grant only until the route cutover is verified; then revoke the unsafe grants in a separate approved step.
- In the existing production project, add missing tracking columns and create the new RPC only after production's actual migration history and schema baseline have been reconciled. Do not copy staging migration history wholesale.
- Keep the two unique raw-code indexes untouched in this work; redundant-index cleanup is separate.
- Treat this catalog snapshot as valid for the inspection date only. Recheck schema, grants, and deployment environment immediately before any migration.


## 10. Concurrency and retry refinement

The transaction must also close a race in the current preflight recovery lookup:

- Two requests can both perform the route's initial active-session lookup before either creates a session.
- For a normal single-use code, the row lock plus `is_used` check ensures only one transaction creates a session. The second request must return a stable conflict and must not create another session.
- For `OPEN-CBT` and the shared master code, there is no normal code row to serialize requests. The new RPC must acquire a transaction-scoped advisory lock keyed by the access mode, normalized session code, and normalized candidate phone, then recheck for an existing started session before inserting. If one exists, return a conflict such as `active_attempt_exists_identity_required`; do not return its token or allow phone-only recovery.
- This advisory lock is only a duplicate-launch guard. It does not authenticate the candidate and must not weaken the existing rule that shared/open attempts cannot be recovered by phone alone.
- For a normal code, also recheck the active session inside the transaction after locking the code row. This provides a deterministic response if a prior request committed but its HTTP response was lost or if recovery lookup raced.
- A retry after a committed normal-code launch should ordinarily be handled by the existing route recovery path. If the session is no longer recoverable, the code remains consumed and the candidate must be directed to support rather than silently creating a second attempt.

The RPC should return only a compact outcome (`ok`, stable `error` code, and `session_id`) rather than serializing the full session row or exposing its attempt token to any caller other than the trusted server route. The route already generated the attempt token and retains it in memory for the candidate response.


## 11. Additional staging constraints and master-code trigger

A further read-only inspection on 27 November 2026 confirmed the following exact constraints:

- `access_codes.code` has `UNIQUE (code)` and `CHECK (length(trim(code)) > 0)`.
- `exam_sessions` has a primary key, a status check limited to `started`, `submitted`, `expired`, and `cancelled`, and non-negative checks for tab-switch count and time-left seconds.
- `exam_sessions` has lookup indexes on access code, phone, status, started_at and created_at.
- The access-code protection trigger calls `protect_master_code_from_being_used()`. That trigger compares the row's code to `exam_config.master_access_code` and forcibly sets `is_used=false` and `used_by=null` for the configured master code.
- Therefore the new transaction must identify and validate master mode from the server-side configuration and must never update the configured master-code row as if it were a normal single-use code. Otherwise the trigger could silently undo the intended code update.

The trigger's current SECURITY DEFINER function is pinned to `search_path=public`. Do not change or remove it in this work; it protects a separate legacy master-code invariant.

## 12. Migration-history and test-harness reconciliation

The connected migration catalogs were listed read-only on 27 November 2026:

- Staging contains the November access-code tracking migration `20261101230000_access_codes_tracking_and_maintenance_notifications` and many subsequent staging migrations.
- Existing Production's listed history stops at the 30 October tutor-profile sequence and does not include the staging November migration sequence. Its inspected schema also lacks staging's `used_at`, `exam_session_id`, and `mark_access_code_used` objects.

This is stronger evidence that the two migration histories are not interchangeable. Do not copy staging migration versions into Production, and do not assume that a staging migration will be safe to replay against the current Production baseline. The intended Supabase target for the existing Vercel Production deployment must be confirmed before any production schema work.

The dedicated isolated regression specification is now in `docs/sql/cbt-access-code-transaction-test-plan.md`. It expands the original twelve cases to include normalized-code ambiguity, the master-code trigger, open/master concurrency, lost-response retry, role privilege checks, and explicit failure injection. It is a test plan, not an executed test report.

## 13. Current work status

- Read-only schema, function-definition, ACL, trigger, constraint, index, and migration-history inspections completed for the connected staging and existing production projects.
- Added the isolated regression test plan to the repair branch.
- No migration SQL has been applied; no live test records or access codes have been read or changed.
- No route refactor, privilege revocation, merge, or deployment has occurred.
- The next implementation step is to draft the staging-shaped forward-only SQL migration and route contract against the verified schema, then test it only in a disposable database. A separate production migration cannot be finalized until the intended production database target and its migration baseline are reconciled.


## 14. First staging-shaped SQL draft

Added `docs/sql/cbt-access-code-transaction-v1-draft.sql` as a reviewable SQL draft, not an executable instruction for either connected BrainLab project.

The draft now includes:

- A fail-closed preflight that aborts if existing codes collide after `upper(btrim(code))`.
- A unique expression index on `upper(btrim(code))`, required because the existing raw unique index does not prevent concurrent issuance of case/whitespace variants.
- A transaction-scoped advisory lock for normal-code consumers, in addition to row locking.
- A separate advisory lock for open/master attempts keyed by mode, session code, and normalized phone.
- Server-side verification of the configured master code before treating a request as master mode.
- One session insert and one linked code update in the same transaction.
- A compact response containing only `ok`, `error`, and `session_id`.
- Execution revoked from PUBLIC, anon, and authenticated, with execute granted only to service_role.

This remains a first draft. It has not been parsed or executed by PostgreSQL, and the disposable concurrency/failure-injection tests have not run. In particular, review the exact function signature, RPC argument names, index rollout/lock impact, and master-code config representation before promoting it to a migration. The test plan now includes T19 for normalized-code index preflight and issuance-race protection.


## 15. Exact staging column-type cross-check

A further read-only catalog query confirmed the SQL draft's principal parameter and insert types against the live staging catalog:

- `exam_config.config_value` is `jsonb`, so extracting the configured master code with `#>> '{}'` is type-compatible.
- `exam_sessions.paper_ids` is `bigint[]` (`_int8`), matching the draft's `p_paper_ids bigint[]`.
- `exam_sessions.attempt_token` and `id` are UUID; `deadline_at` is `timestamptz`; duration/time-left are integer; `is_master_code` is boolean.
- The selected candidate, subject, access-code, status, elective, and tracking fields are text/boolean/UUID/timestamptz as expected by the draft.

This validates type compatibility only. It does not validate function execution, route behavior, constraints under all inputs, locking behavior, or production compatibility. The draft still requires a disposable database run and code review before it can become a migration.


## 16. Static integration review — 27 November 2026

A read-only comparison of the current `app/api/exam/start/route.ts` with the SQL draft found integration blockers that must be resolved before route refactoring:

1. **Open-code argument mapping:** the current route uses an empty `cleanCode` to represent open access, but persists `OPEN-CBT` in `exam_sessions.access_code`. The RPC draft correctly recognizes open mode from an empty code. The future route must pass the original empty code as `p_code`; the RPC itself should write `OPEN-CBT` as the session label. Do not pass the persisted label as the RPC's normal-code argument.
2. **Code-subject time-of-check/time-of-use race:** the route reads the normal code's configured subject before paper generation. The draft locks and consumes the code later but does not verify that the locked row still has the subject used to generate the paper. Add a separate expected-code-subject argument and compare it null-safely against the locked row. On mismatch, return a stable conflict and make no session or code mutation. Keep paper generation outside the row lock.
3. **Paper identity:** validating that `p_paper_ids` contains 180 entries does not prove the IDs are distinct. Confirm the generator's uniqueness invariant and reject duplicates in the RPC if uniqueness is part of the server/database contract.
4. **Payload completeness:** the draft should define validation for non-empty subject data and the relationship between `p_duration_seconds` and `p_deadline_at`. These must be specified before the RPC is considered production-ready.
5. **Lost-response handling:** the current route already has an active-session recovery path before new launch work. The RPC's duplicate-attempt conflict must not disclose an existing attempt token. Preserve the current recovery rules and do not blindly retry create after an uncertain commit.

The regression plan has been expanded with T20–T23 for stale subject settings, open-access argument mapping, exact PostgREST signature matching, and paper-ID integrity. The SQL draft has since been revised to add the expected raw code-subject parameter, null-safe subject comparison, non-empty subject validation, future-deadline validation, and distinct 180-question-ID validation. These are static draft changes only; the SQL has not been parsed or executed.

### Zero-cost validation decision

The repository already declares `@electric-sql/pglite` as a development dependency, but the existing GitHub Actions workflows do not currently run this transaction's SQL regression suite. PGlite may be a candidate for a local/CI-only PostgreSQL-compatible harness, but compatibility for advisory transaction locks, PL/pgSQL, expression indexes, and role/privilege checks must be verified rather than assumed. No workflow was triggered and no hosted database branch was created. Do not use either connected BrainLab Supabase project as a substitute.


## 17. Revised SQL draft after static integration review

The SQL draft was revised after comparing it with the current route:

- Added `p_expected_code_subject text`. For normal codes, the function compares this exact raw value with the locked `access_codes.subject` using `IS DISTINCT FROM`. The route must pass the raw subject it observed before paper generation, not the filtered `preconfiguredSubject` value. A mismatch returns `code_subject_changed` without inserting a session or consuming the code.
- Added non-empty `p_subject` validation and a future-deadline check.
- Added a distinct-ID count check so a paper array must contain exactly 180 distinct question IDs, not merely 180 array elements.
- Updated the function signature and matching REVOKE/GRANT statements to include the new text parameter.
- Clarified that open access must pass an empty original code to the RPC; the RPC persists `OPEN-CBT` as the session label.

The route has not been refactored to call this function. The SQL draft remains unparsed and unexecuted. The current working container has no local PostgreSQL, psql, or Docker runtime available, and no hosted resource has been created. The repository already declares PGlite as a development dependency, so its support for PL/pgSQL, advisory transaction locks, expression indexes, and role/privilege checks is the next compatibility question. Do not install or trigger anything that incurs a charge, create a paid branch, or run this against connected BrainLab databases.


## 18. Zero-cost local test harness and audit-label alignment

- Added `scripts/test-cbt-access-code-transaction-pglite.ts`, which creates only synthetic in-memory tables/roles and loads the SQL draft. It does not read environment variables or connect to Supabase.
- Added `npm run test:cbt-transaction:pglite` to invoke it.
- Expanded its intended checks to include draft installation, normalized case-variant uniqueness, missing/used codes, service-role-only grants, normal success, stale subject rejection, OPEN-CBT session-label mapping and duplicate-open-attempt rejection, master-code mode validation, duplicate question IDs, and forced rollback at both insert/update failure points.
- The repository lockfile pins PGlite `0.2.17`. PGlite is an embedded PostgreSQL build, but it operates as a single-session database in this harness. It can be used for syntax and single-connection transaction checks if the script passes; it cannot establish real concurrent-request behavior. Keep separate multi-connection PostgreSQL tests as a release gate.
- Aligned `used_by` formatting in the SQL draft with the route's current placeholder-phone behavior: normal phones are recorded as `Candidate Name (phone)`; the known placeholder phone records only the candidate name.

**Execution status:** the harness and command are committed but have not been run. The current container has Node.js but no repository checkout, installed project dependencies, `psql`, PostgreSQL server, or Docker. No package installation, CI run, hosted branch, or database connection was initiated. Therefore no SQL syntax, PGlite compatibility, rollback, or privilege result is being claimed.
