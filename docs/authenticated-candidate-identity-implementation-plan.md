# Authenticated candidate identity — implementation slice

Status: implementation plan only. Prepared after inspecting the current admin assessment API, candidate landing page, and runner on 27 November 2026. No database or application behaviour is changed by this document.

## Scope of the first release

The first release collects candidate details for signed-in candidates only. Every existing assessment remains login-required. Guest mode is not selectable and is not inferred from missing identity data.

The first release is limited to academic/general learning assessments. Organisation quizzes and competitions keep their current membership, code, and identity rules until their separate admin and reporting workflows are reviewed.

## Admin configuration

The assessment editor will eventually expose an identity section with four allowlisted fields: full name, candidate number, phone, and email. Each field has one of three states: hidden, optional, required.

Defaults for existing assessments must preserve current behaviour until a migration/backfill is reviewed. New assessments must receive an explicit validated configuration from the API; do not let a browser submit arbitrary JSON.

The API must validate exact keys and enum values, enforce field-specific length/format limits, reject unknown fields, and reject a configuration with no visible identifier. The UI must not show a setting until the database migration and API validation are deployed together.

## Candidate flow

1. The assessment landing page remains accessible according to the existing publication policy.
2. Before the runner begins, the candidate signs in (current behaviour) and sees only configured identity fields.
3. Required values are validated in the browser for usability and again on the server for enforcement.
4. The start request submits candidate details with the access code.
5. The server resolves the assessment policy itself, creates the attempt using the existing authenticated start path, and binds the normalized candidate identity to that attempt.
6. If identity persistence fails, the start operation must not leave an orphaned usable attempt. The preferred implementation is a single database transaction/RPC that creates the attempt and identity row atomically.
7. Candidate details are never written to the browser URL, analytics, generic attempt JSON, question snapshots, or application logs.

## Data model proposal

Add a dedicated one-to-one table, provisionally learning_assessment_candidate_identities:
- attempt_id uuid primary key referencing learning_practice_attempts(id) on delete cascade
- assessment_id uuid not null referencing learning_assessments(id) on delete cascade
- full_name, candidate_number, phone, email as nullable text fields
- display_label text not null
- created_at and updated_at timestamptz not null default now()

Add an index on (assessment_id, created_at desc) for authorized assessment reporting. Add a unique constraint on (assessment_id, candidate_number) only if the product explicitly requires candidate numbers to be unique; do not assume that requirement.

RLS is enabled. No direct anon or authenticated table access is granted. Writes go through the start RPC. Candidate reads, if needed, go through an ownership-checking RPC. Admin reporting uses the existing assessment-management permission checks and returns only the fields the admin screen needs.

display_label is a derived, privacy-conscious label (for example, candidate number when present, otherwise a masked name). It is not a substitute for the underlying identity fields and must not be exposed in public result payloads until result/leaderboard release policy permits it.

## Transaction and RPC contract

Do not create the attempt in one request and then make a best-effort identity insert in a second request. Extend or wrap the existing authenticated start function so that one transaction authenticates via auth.uid(), resolves and locks the assessment row, verifies publication/schedule/type/access-code/max-attempt rules, validates identity configuration and payload, creates the attempt using existing question-selection/snapshot logic, inserts the normalized identity row, and returns the existing start payload without candidate PII.

Preserve question selection, question exposure trigger behaviour, attempt-token semantics, and competition-specific handling. A replacement function must be derived from the exact current staging definition and reviewed against production drift; do not reconstruct it from application code or an older migration.

## Required tests before enabling the UI

- Existing assessments without new configuration still start exactly as before.
- Missing required name is rejected server-side.
- Hidden fields are rejected or discarded server-side; they are never stored.
- Optional blank values normalize to null.
- Malformed email/phone and oversized values are rejected.
- Candidate identity cannot be read by anon or another authenticated user.
- An authenticated candidate cannot attach identity to another user's attempt.
- Identity insert failure rolls back attempt creation.
- Max-attempt concurrency and access-code redemption semantics remain unchanged.
- Admin can read identities only for assessments they are authorized to manage.
- Candidate PII is absent from logs, public discovery, generic attempt responses, and question snapshots.

## Release sequencing

1. Confirm exact current staging function definitions and all triggers/RPC consumers.
2. Draft a forward-only migration against staging schema and separately reconcile the production schema; never replay the full staging migration chain.
3. Add isolated-clone SQL tests and RLS/privilege tests.
4. Implement server validation and atomic start behaviour.
5. Implement the admin configuration UI and candidate details UI.
6. Run typecheck, lint, focused tests, and full CI.
7. Deploy to staging only after review; keep guest mode disabled.
8. Promote schema/data only after explicit approval and a production compatibility review.

## Explicit non-goals

- No nullable learning_practice_attempts.user_id.
- No fake Supabase Auth users for guests.
- No reuse of attempt_token as a guest bearer credential.
- No guest mode for organisation quizzes or competitions in this slice.
- No public candidate directory or leaderboard.
- No change to score/correction release policy in this slice.
- No staging or production database writes as part of this plan.