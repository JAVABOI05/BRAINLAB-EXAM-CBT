# Assessment start RPC trace — candidate identity readiness

Audit date: 27 November 2026. Target inspected: BrainLab staging project `eusgwsuoloomphebrepe`. Read-only inspection only; no SQL writes or migration application occurred.

## Exact live start path

The current `public.start_organisation_assessment(uuid,text)` is `SECURITY DEFINER` with pinned `search_path` (`public`, `pg_temp`). Its live execute grants are authenticated, service_role, and postgres; anon was not present in the inspected routine privilege result.

The function:
- obtains the candidate from `auth.uid()` and rejects a null user;
- loads a published assessment and checks start/end times;
- checks active organisation and membership where applicable;
- validates an assessment-scoped access code and calls `redeem_learning_access_code` for a scoped code;
- counts the user's previous attempts and enforces `max_attempts`;
- builds a custom/CSV or question-bank snapshot;
- inserts `learning_practice_attempts` and returns attempt ID, attempt token, deadline and candidate-facing questions.

## Trigger and transaction implications

`learning_practice_attempts` has one non-internal trigger: `learning_attempt_question_exposure`, an AFTER INSERT trigger invoking `record_learning_attempt_question_exposure()`.

The trigger records selected question exposure for the new attempt. An identity row inserted by the same start RPC, in the same PostgreSQL transaction, would commit or roll back together with the attempt and its exposure-history writes. This is the correct atomicity boundary; a second client request is not.

The attempt table currently requires `user_id uuid NOT NULL` referencing `auth.users(id) ON DELETE CASCADE`. Its checks also require organisation_quiz/competition attempts to have an assessment ID. This confirms guest mode must not be implemented by simply making `user_id` nullable.

## Important existing start-path risks to address before extending it

1. **Attempt-limit concurrency:** the current function counts prior attempts but does not lock the assessment row or take a per-user/per-assessment advisory lock before counting. Concurrent start requests could both observe the same count and exceed the configured limit. The identity migration should not silently worsen this; the RPC revision should serialize the attempt-number/max-attempt decision and be concurrency-tested.

2. **Legacy access-code fallback:** the current function contains a fallback that updates `public.access_codes.used_at`. The production schema audit previously found that column absent, and production also lacks `cohort_assessment_id`. This path must be removed or made schema-compatible in a separately reviewed production release; do not add unrelated legacy columns merely to preserve the fallback.

3. **Access-code association:** the fallback path does not populate `learning_access_codes` row `c`, so `v_attempt.access_code_id` remains null. Candidate identity work should preserve the current intended code policy but must not pretend the legacy fallback creates an assessment-scoped redemption record.

4. **Function replacement size:** the live function contains the full question-selection, snapshot, code, schedule, organisation and competition logic. Do not replace it with a shortened reconstructed implementation. Fetch and preserve the exact current definition as the migration base, then apply the smallest reviewed changes.

5. **Production schema drift:** production does not yet have the Learning Assessments tables and has a materially different `questions` schema. A staging migration cannot be replayed wholesale against production.

## Candidate identity integration contract

Use a dedicated one-to-one identity table keyed by `attempt_id`, with a second `assessment_id` foreign key for authorized reporting. Keep it inaccessible through direct anon/authenticated table grants; use RLS as defence in depth and narrow RPCs for reads. The start function validates the assessment's allowlisted field configuration and candidate payload, creates the attempt, then inserts normalized identity in the same transaction.

Do not return candidate PII in the start response. Do not place it in question snapshots, answers, URLs, telemetry, or logs. Admin reporting must check the same assessment-management permission boundary as existing assessment administration.

Do not add a unique candidate-number constraint until the product explicitly defines its scope (per assessment, per organisation, or globally).

## Next engineering sequence

1. Retrieve the exact migration/source definition of the current staging function and compare it with the live definition, including all helper dependencies.
2. Design the per-assessment identity configuration column and backfill policy without changing existing assessment behaviour.
3. Draft a forward-only SQL migration that creates the identity table, locks down grants/RLS, and updates the start RPC atomically.
4. Add tests for required/hidden fields, ownership, PII isolation, transaction rollback, access-code handling, and concurrent max-attempt enforcement.
5. Only then implement the admin and candidate forms.

## Explicitly not done

- No table, column, function, trigger, grant, policy, or data was changed in staging or production.
- No candidate identity form was exposed in the UI.
- Guest attempts remain unsupported.
- No merge or deployment occurred.