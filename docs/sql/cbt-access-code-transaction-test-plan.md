# CBT access-code transaction — isolated regression test plan

**Status:** Test specification only. No SQL has been applied and no test has been run against either connected BrainLab database.

## 1. Test boundary

Run these tests only against a newly created disposable Supabase branch/project or a CI Postgres database built from the exact migration set under test. Do not point the harness at either BrainLab Staging (`eusgwsuoloomphebrepe`) or existing Production (`bupkyppvtkrmzmluzjmf`). Do not use real access codes, candidate details, question IDs, or exam sessions.

The harness must create synthetic fixtures with unique test prefixes and destroy the entire disposable database after the run. A transaction rollback is useful for single-call tests but is not sufficient for concurrency tests, because concurrent connections need committed fixtures visible to each other.

## 2. Staging-specific facts the harness must model

The 27 November 2026 read-only catalog audit confirmed:

- `access_codes` has `id`, `code`, `is_used`, `used_by`, `used_at`, and `exam_session_id`.
- `access_codes.code` has a raw unique constraint and a second redundant raw unique index. Neither guarantees uniqueness after `upper(trim(code))`.
- `exam_sessions` has all fields currently inserted by `app/api/exam/start/route.ts`; `draft_answers` and `attempt_token` are NOT NULL but have defaults.
- `exam_sessions.status` permits only `started`, `submitted`, `expired`, and `cancelled`.
- `exam_sessions.time_left_seconds` must be null or non-negative.
- Trigger `trg_protect_master_code_on_access_codes` invokes `protect_master_code_from_being_used()`. If the updated access-code value equals the configured master code, the trigger forces `is_used=false` and `used_by=null`. The replacement must never try to consume a configured master code as a normal code.
- The current legacy `mark_access_code_used(text,text,uuid)` is SECURITY DEFINER and executable by PUBLIC, anon, authenticated, and service_role. It accepts caller-provided identity/session values without proving the session-code relationship.
- The current `check_access_code(text,text)` is separately used by the candidate flow; it remains a distinct public validation contract and is not to be removed as part of this transaction change.

The existing production project is materially different: it does not have `used_at`, `exam_session_id`, or the legacy `mark_access_code_used` function in its inspected catalog. Its migration history also does not contain the staging-only November migration sequence. A staging test pass must not be represented as production schema compatibility.

## 3. Contract under test

The server route generates and validates the paper before calling the database. The new RPC receives only the server-prepared session payload and returns a compact result: `ok`, stable `error`, and `session_id`. It must not return the attempt token or a complete session row.

For a normal code, the migration must first reject existing normalized duplicates and create a unique expression index on `upper(btrim(code))`. The transaction then takes an advisory lock for the normalized code, locks the matching row, rejects zero or multiple matches, rejects an already-used code, rechecks an active session, inserts the session, updates exactly that one code row with usage metadata and the new session ID, and commits both changes together.

For open/master access, it must take a transaction-scoped advisory lock keyed by access mode + normalized session code + normalized phone, then recheck for an active session before inserting. It must validate master-code status against the server-side `exam_config.master_access_code`; a caller-supplied boolean must never be sufficient proof. Open/master attempts must not consume any normal code row. The advisory lock prevents duplicate launches; it does not authenticate the candidate or authorize phone-only recovery.

The function must be callable only by `service_role`, with execution revoked from PUBLIC, anon, and authenticated. If SECURITY DEFINER is required, use a fixed trusted search path and schema-qualified object references. Keep the legacy function until caller inventory and route cutover are complete; revoke its public grants only in a separately reviewed forward-only step.

## 4. Required isolated regression cases

| ID | Scenario | Required assertion |
|---|---|---|
| T01 | Valid unused normal code | One session inserted; code marked used; `used_at` and `exam_session_id` point to that session |
| T02 | Two concurrent calls with same normal code | Exactly one succeeds; exactly one session exists; loser receives stable already-consumed/active-attempt conflict |
| T03 | Missing normal code | Stable not-found result; no session and no code mutation |
| T04 | Already-used normal code | Stable conflict; no second session |
| T05 | Forced session insert failure | Whole transaction rolls back; code remains unused and unlinked |
| T06 | Forced code update failure | Whole transaction rolls back; no session remains |
| T07 | Two rows matching normalized code | Reject as ambiguous; neither row consumed; no session |
| T08 | Caller tries to claim arbitrary master mode | Rejected unless supplied code exactly matches the current server-side master-code configuration |
| T09 | Configured master code / OPEN-CBT | Session inserted with correct master/open semantics; no normal code row consumed |
| T10 | Two concurrent OPEN-CBT launches for same normalized phone | One session maximum; loser receives identity-required/active-attempt conflict without token |
| T11 | Existing active normal-code attempt | No new session and no second code consumption; route recovery path remains responsible for resuming |
| T12 | Existing active master/open attempt | No new session; no phone-only recovery or token disclosure |
| T13 | PUBLIC, anon, authenticated execute privileges | Direct RPC execution denied for all three roles |
| T14 | service_role invocation | Server-only invocation succeeds with valid server-prepared payload |
| T15 | Candidate-controlled `used_by` / session linkage tampering | Function derives or validates values from the payload/session insert; arbitrary unrelated session IDs cannot be attached |
| T16 | Existing CBT lifecycle | Start, save, resume, submit, result retrieval, and question exposure behavior remain unchanged |
| T17 | Lost HTTP response after successful commit | Retry does not create a second attempt; normal-code retry resolves through the existing recovery path |
| T18 | Master-code trigger interaction | No attempt is made to mark the configured master-code row used; trigger cannot silently produce a successful-looking but unconsumed normal-code transaction |
| T19 | Normalized-code unique index | Migration preflight rejects pre-existing case/whitespace collisions; after index creation, concurrent issuance cannot create two rows with the same normalized code |
| T20 | Access-code subject changes after pre-read | RPC compares the locked row's raw subject with the exact raw subject observed by the route using null-safe equality; any change rejects the stale launch without inserting a session or consuming the code |
| T21 | Open-access RPC argument mapping | Route passes an empty original code to the RPC for open access; `OPEN-CBT` is assigned as the persisted session label inside the transaction, not passed as if it were a normal code |
| T22 | Exact PostgREST RPC signature | Route argument names, SQL parameter names, PostgreSQL types, nullable values, and returned JSON keys match exactly; a contract test catches drift before route cutover |
| T23 | Paper payload integrity | Reject null/empty subject data, malformed paper payloads, and any 180-item paper array containing null or duplicate IDs; exactly 180 distinct IDs are required by the revised SQL draft |

## 5. Failure injection

Use disposable-only test hooks or fixture constraints to force failures at two exact points:

1. A test-only constraint/trigger rejects the session insert after the code row has been locked.
2. A test-only trigger rejects the code tracking update after the session insert.

Verify state from a separate connection after each failed call. Both tables must match their pre-call state. Do not add permanent production test hooks or alter live triggers to simulate these failures.

## 6. Concurrency execution

Use two independent database connections and a barrier so both requests attempt the same code at nearly the same time. Assert one success and one session row. Repeat for OPEN-CBT/master with identical normalized phone, then with distinct phones to prove the lock key does not serialize unrelated candidates.

Do not simulate concurrency by sequential SQL statements in one transaction; that does not test the race.

## 7. Privilege verification

In the disposable database, inspect `has_function_privilege` for PUBLIC/anon/authenticated/service_role after migration. Also attempt direct calls under each role. The application route must use its server-side service-role client; no browser code may call the new RPC. The service-role key must never be included in a client bundle.

## 8. Environment and release gates

- Rebuild and test against the exact staging migration snapshot first, without applying anything to BrainLab Staging.
- Reconcile the existing Production baseline separately. Its migration history currently stops at a much earlier sequence and its table/function catalog differs; do not replay staging migrations wholesale.
- Confirm which Supabase project the existing Vercel Production deployment is intended to use before any production-specific migration or route rollout.
- Run the full test suite and CBT lifecycle tests after the route cutover.
- Require explicit approval before applying any migration, changing privileges, merging, or deploying.

## 9. Static-review findings — 27 November 2026

These are code-review findings, not database test results:

1. **Open-access argument mismatch:** the current route persists `OPEN-CBT` as the session's `access_code`, while the draft RPC infers open mode from an empty `p_code`. The future route must pass the original empty code to the RPC. The RPC should assign `OPEN-CBT` only to the inserted session row. Passing `OPEN-CBT` as `p_code` would route it through normal-code lookup and fail or behave incorrectly.
2. **Stale code-subject race:** the route reads `access_codes.subject` before paper generation, but the draft RPC does not currently receive or verify that observed value. Add a dedicated expected-code-subject parameter (separate from the complete selected-subject string) and compare it with the locked row using null-safe equality. If it changed, return a stable conflict and do not insert a session or consume the code. Do not hold a row lock while generating the 180-question paper.
3. **Paper-ID uniqueness:** cardinality 180 does not prove 180 distinct question IDs. Confirm the generator's invariant and enforce it in the RPC if the database contract is intended to defend against malformed server payloads.
4. **Subject/payload validation:** the draft currently validates candidate name, phone, paper count, duration, deadline presence, and attempt token, but it does not validate non-empty subject text or the relationship between duration and deadline. Define the intended contract before treating the RPC as production-ready.
5. **Retry semantics:** a committed transaction followed by a lost HTTP response must be reconciled with the route's existing recovery lookup. Do not blindly retry the create RPC, particularly for OPEN/master access, because the draft intentionally returns a conflict for an existing active attempt rather than disclosing its token.

The SQL draft remains unparsed and unexecuted. These findings must be resolved in the draft and then tested in an isolated, zero-cost CI Postgres environment before route refactoring. No connected BrainLab database may be used as a test target.


## 10. Zero-cost local harness added

A local-only PGlite harness now exists at `scripts/test-cbt-access-code-transaction-pglite.ts`, with command:

```bash
npm run test:cbt-transaction:pglite
```

It builds a synthetic schema in memory, reads the SQL draft from the repository, and checks draft installation, function grants, normal-code success/consumption, duplicate use, stale-subject rejection, OPEN-CBT mapping, master-code validation, duplicate paper IDs, and rollback under injected session-insert/code-update failures. It does not read environment variables and does not connect to Supabase.

**Not yet executed.** The current working environment does not contain the repository checkout/dependencies, and no install or CI job has been triggered. PGlite is single-session, so this harness cannot prove two independent requests serialize correctly. A separate real-PostgreSQL multi-connection test remains required for T02 and T10.
