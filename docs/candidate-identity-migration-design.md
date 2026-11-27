# Candidate identity migration design — reviewed against live start RPC

Date: 27 November 2026. This is a migration design, not executable SQL. It was prepared from the live staging definition of `public.start_organisation_assessment(uuid,text)`. No database objects or data were changed.

## Confirmed live RPC behaviour

The live function is `SECURITY DEFINER`, pins `search_path` to `public, pg_temp`, and is executable by `authenticated`, `service_role`, and `postgres`. It authenticates with `auth.uid()`, reads a published assessment, checks schedule and organisation membership, validates access codes, counts prior attempts, selects questions, inserts an attempt, and returns a candidate-facing paper.

The function has two question-source branches: `custom_builder`/`csv_import` and the main question bank. Both insert into `learning_practice_attempts`. The main-bank branch also uses `question_exposure_history` and `_paper_json()`.

The attempt insert fires `learning_attempt_question_exposure` AFTER INSERT. PostgreSQL executes this trigger in the same transaction as the RPC, so a subsequent identity insert in that RPC can be atomic with attempt creation and exposure recording.

## Migration objects proposed

### 1. Assessment identity configuration

Add a nullable JSONB column `candidate_identity_config` to `learning_assessments`. NULL means legacy behaviour: collect no additional identity and preserve the current runner. Non-null values use a strict versioned allowlist, for example:

`{"version":1,"fields":{"full_name":"required","candidate_number":"hidden","phone":"hidden","email":"hidden"}}`

Allowed field states are exactly `hidden`, `optional`, `required`. Reject unknown keys, unsupported versions, malformed JSON shape, and a configuration with no visible identifier. API and database validation must agree. Do not backfill all existing assessments to require a name: that would change current assessment behaviour unexpectedly. New assessments can receive an explicit default only after product approval.

### 2. Candidate identity table

Create `learning_assessment_candidate_identities` with:
- `attempt_id uuid PRIMARY KEY REFERENCES learning_practice_attempts(id) ON DELETE CASCADE`
- `assessment_id uuid NOT NULL REFERENCES learning_assessments(id) ON DELETE CASCADE`
- nullable `full_name`, `candidate_number`, `phone`, `email` text columns
- `display_label text NOT NULL`
- `created_at` and `updated_at` timestamptz NOT NULL DEFAULT now()

Add an index on `(assessment_id, created_at DESC)`. Add a composite FK `(attempt_id, assessment_id)` only if a matching unique constraint on the parent attempt table is deliberately introduced; otherwise enforce consistency in the trusted RPC and admin query. Do not assume candidate numbers are unique.

Enable RLS and revoke direct table access from `PUBLIC`, `anon`, and `authenticated`. Grant no broad direct read/write. The security-definer start RPC inserts. A narrowly scoped admin reporting RPC may read identities only after calling the existing assessment-management authorization helper. Do not expose PII through published-assessment discovery or candidate start/resume payloads.

## Required changes to the start RPC

Keep the existing two-argument RPC signature to avoid breaking current clients. Add an optional third JSONB argument only if PostgREST overload resolution and all callers are audited; safer alternative is a separately named v2 RPC, with an explicit application rollout. Do not silently replace a public RPC signature.

For a minimal compatible v2:
1. Authenticate via `auth.uid()` exactly as today.
2. Load the assessment row with `FOR UPDATE` so concurrent starts for the same assessment serialize before max-attempt counting. This is a coarse lock but is simple and correct for the first pass. If throughput later requires finer-grained locking, use a stable advisory lock keyed by `(assessment_id,user_id)` and retain concurrency tests.
3. Preserve publication, schedule, organisation, membership, code, max-attempt, question selection and snapshot checks.
4. Validate candidate JSON against the assessment's stored allowlist. Reject unknown fields; reject values for hidden fields; enforce required fields and strict length/format limits. Normalize blank optional fields to NULL.
5. In both question-source branches, insert attempt and then identity row in the same transaction. Any identity insert error must raise/abort, not return a success payload.
6. Keep candidate PII out of the RPC return object. Return the existing attempt metadata and questions unchanged.
7. Keep question-exposure trigger semantics unchanged.

## Existing access-code defect requiring separate correction

The live staging function's legacy fallback updates `public.access_codes.used_at`, but production's inspected `access_codes` schema does not contain `used_at` or `cohort_assessment_id`. In addition, the fallback leaves `c.id` null, so the created attempt does not retain an assessment-scoped `access_code_id`. This is a correctness and production-compatibility issue, not a candidate-identity feature.

Do not solve this by adding legacy columns blindly. Prefer removing the cross-table fallback from the assessment start path and accepting only `learning_access_codes` rows scoped to the assessment, after confirming the intended code issuance path and existing student impact. If backward compatibility is required, write a separate, schema-aware migration with explicit tests and data reconciliation.

## Data consistency and security tests

- Legacy NULL identity config starts exactly as before.
- Both custom/CSV and main-question-bank branches save identity atomically.
- Missing required fields, supplied hidden fields, unknown keys, invalid email/phone and oversized strings are rejected.
- Empty optional strings normalize to NULL.
- A failed identity insert rolls back attempt creation and exposure history.
- Concurrent starts cannot exceed max_attempts.
- An identity row cannot be associated with a different assessment or attempt.
- anon and ordinary authenticated users cannot query identity table rows directly.
- Admin reporting checks the assessment-specific management permission.
- Candidate PII never appears in start response, question snapshot, answer JSON, public assessment discovery, logs or URLs.
- Scoped access-code redemption, expiry, revocation, max redemptions and retry behaviour remain correct.

## Rollout order

1. Keep the current start RPC untouched while migration SQL is drafted.
2. Confirm every application call site and the admin permission helper against the live staging schema.
3. Draft a forward-only staging migration and SQL regression tests.
4. Apply only to an isolated clone first; inspect grants, policies, function ACLs and trigger behaviour.
5. Implement the v2 RPC and server API, then admin config and candidate form.
6. Run typecheck, lint, focused integration tests and full CI.
7. Request approval before applying to staging. Production requires a separate schema reconciliation; do not replay staging migrations wholesale.

## Explicitly out of scope

- No nullable `learning_practice_attempts.user_id` and no fake Auth accounts.
- No guest access in this migration.
- No changes to organisation or competition identity policy.
- No result/correction release or leaderboard changes.
- No production or staging database writes.