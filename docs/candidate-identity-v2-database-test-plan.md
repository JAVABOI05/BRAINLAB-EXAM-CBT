# Candidate identity v2 database test plan

Date: 27 November 2026.

## Draft artifacts

- SQL implementation draft: `docs/sql/candidate-identity-v2-draft.sql`
- Validator test draft: `docs/sql/candidate-identity-v2-validator-tests.sql`

These are review artifacts, not Supabase migrations. No database has been modified.

## Design choices

1. The audited live start RPC is renamed to an internal function rather than re-created from a hand-edited copy. This preserves its question selection, snapshot generation, access-code checks and return shape.
2. The existing public RPC becomes a compatibility wrapper. It continues to start assessments whose identity policy is NULL, but refuses configured assessments so old clients cannot bypass identity collection.
3. The new `start_organisation_assessment_v2` wrapper takes a transaction-scoped advisory lock keyed by assessment + authenticated user, validates candidate identity, invokes the preserved implementation, and inserts identity against the returned attempt ID. All operations share one PostgreSQL transaction.
4. The compatibility wrapper takes the same per-user/per-assessment advisory lock before delegating. This serializes starts only for the same candidate and assessment, while allowing different candidates to start concurrently.
5. Candidate identity is stored in a separate table with no direct grants to anon, authenticated or service_role. RLS is enabled without client policies. A separate, permission-checked admin reporting endpoint/RPC is still required.
6. The identity payload is never added to the start response, answer JSON, question snapshot or URL.

## Important review gates

- Confirm the original function owner and all existing ACLs before running the rename. The wrapper must execute as the same trusted database owner.
- Confirm whether any other database routines call the start RPC by name. Calls should resolve to the compatibility wrapper; direct execution of the renamed internal function is revoked from API roles.
- Verify the `learning_private` schema is not in the exposed Data API schema list. Its policy validator has only a boolean result; the payload normalizer is not executable by client roles.
- Review PostgREST schema-cache refresh behaviour after adding the v2 function.
- The original function's legacy global `access_codes` fallback remains untouched in this draft. It is known to be production-incompatible because production lacks `used_at` and `cohort_assessment_id`; production requires a separate implementation and must not receive this staging-oriented draft unchanged.
- The current runner still calls the original two-argument RPC. It must be switched to v2 in the same release as the schema change, while legacy assessment calls remain compatible.
- Admin create/update routes and UI are not yet wired to `candidate_identity_config`.
- This draft does not yet provide an admin-only identity reporting endpoint.

## Required isolated-clone integration tests

- Existing NULL-config assessment starts through the old RPC and v2 preserve current paper shape.
- Configured assessment starts through old RPC return `candidate_identity_required` and create no attempt.
- v2 accepts valid identity in both custom/CSV and question-bank branches.
- Missing required, hidden, unknown, malformed, and overlength values create no attempt.
- Candidate identity insert failure rolls back the attempt and exposure-history trigger effects.
- Two concurrent starts for one user/assessment cannot exceed `max_attempts`.
- Starts for different assessments remain independent.
- Scoped code expiry, revocation, max redemptions and repeat-redemption behaviour remain unchanged.
- Candidate response and public assessment metadata contain no candidate PII.
- anon/authenticated/service_role cannot directly select or mutate candidate identity rows.
- Admin reporting is allowed only to the assessment's authorized manager and cannot cross assessment boundaries.

## Verification status

The SQL drafts have not been applied or executed. The SQL validator script uses plain PostgreSQL `DO` assertions because pgTAP is not installed in staging. The TypeScript validation test added earlier is also not yet executed. No staging or production writes, merge or deployment have occurred.


## Ownership refinement — 27 November 2026

The SQL draft now stores only `attempt_id` as the identity row's ownership link. It no longer duplicates `assessment_id` or `user_id`; both values are authoritative on `learning_practice_attempts` and should be obtained by joining the attempt row in any future reporting query. This avoids a second set of foreign keys and prevents identity metadata from being associated with a different candidate or assessment through inconsistent duplicated values. The insert path remains inside the trusted v2 start wrapper. Re-review table constraints, query indexes and cascade behaviour against an isolated clone before migration generation.
