# Candidate identity integration audit — admin and runner

Date: 27 November 2026. Read-only source audit on `fix/assessment-auth-repair-on-current-production`. No application code or database was changed in this step.

## Existing integration points

### Assessment creation

`app/admin/organised-assessments/page.tsx` creates assessments through `POST /api/admin/assessments`. It currently collects title, description, instructions, assessment type, subjects/categories, question count, duration, attempts, schedule, access-code and result-release settings. It does not collect candidate identity rules.

`app/api/admin/assessments/route.ts` normalizes the request and inserts an explicit `payload` into `learning_assessments`. A new `candidate_identity_config` property must be validated server-side and added to that payload only after the database migration is installed. Until then, adding it to the UI would result in a failed or silently ignored configuration.

### Assessment updates

`app/api/admin/assessments/[id]/route.ts` PATCH currently builds an allowlisted `updates` object and writes to `learning_assessments`. It has no candidate identity handling. Add the same shared validator used by POST; do not accept arbitrary JSON config or trust client-side validation.

The PATCH and GET handlers check `getAdminSession`, but this source file does not perform an assessment-specific permission check. Before exposing identity configuration or candidate PII, verify that `getAdminSession` itself enforces the required permission boundary or add the appropriate `institution.manage` / `learning.content.manage` check. Do not assume authentication alone grants access to candidate records.

### Candidate runner

`app/assessments/[id]/take/page.tsx` currently calls `supabase.rpc('start_organisation_assessment', {p_assessment_id,p_access_code})` directly from the browser. The runner requires an authenticated Supabase user before loading assessment metadata, and its start RPC call has no candidate identity argument.

Candidate identity must be collected after the candidate has seen the assessment instructions and before the attempt starts. The UI should render only configured fields. The submit action must send the validated identity payload through the new versioned start RPC. Do not put candidate details in query parameters, local storage, logs, or the attempt answer map.

## Recommended API contract

Use a new RPC name rather than overloading the existing function signature. Proposed shape:

```ts
supabase.rpc('start_organisation_assessment_v2', {
  p_assessment_id: assessment.id,
  p_access_code: accessCode.trim() || null,
  p_candidate_identity: {
    full_name: 'Candidate name',
    candidate_number: null,
    phone: null,
    email: null,
  },
});
```

The example is illustrative; the actual JSON must contain only visible configured fields. The database remains authoritative for required/hidden validation. The existing RPC stays available for legacy callers during a controlled transition, but it must not be a bypass for assessments whose identity policy is required. For such assessments, either make the old RPC reject with `candidate_identity_required` or route all starts through v2 after verifying all clients have migrated.

## Required shared validation

Implement a server-side TypeScript parser (and equivalent database validation) with:
- strict allowlist of `version`, `fields`, and supported field names
- only `hidden | optional | required` values
- bounded configuration size and no unknown keys
- full name: trim, normalize whitespace, reasonable maximum length
- candidate number: trim, max length, permitted character set defined by product requirements
- email: normalize case and validate a conservative email format if visible
- phone: normalize and validate international format only if phone collection is explicitly enabled
- reject supplied values for hidden fields
- reject missing required fields
- optional blank values become null
- do not infer identity from Supabase email or profile unless the candidate is explicitly told that is the source
- no candidate data in errors; errors should identify the field, not echo the submitted value
- audit logs record that policy changed, but never store candidate values

## Important existing API risks to resolve

1. The current admin assessment GET endpoint returns the assessment row and up to 100 attempts including `user_id`. Candidate identity should not be added to this broad response. Use a separate, permission-checked reporting endpoint and return only the columns needed by the caller.
2. The existing PATCH handler accepts a broad set of assessment updates and uses `getAdminSession` only in this file. Confirm permission enforcement before extending it with identity configuration.
3. The browser runner directly invokes the existing RPC. Keep the current RPC signature intact; introduce a v2 RPC and migrate the runner in the same release as the backend.
4. The create form currently creates a draft; identity settings must be saved even while draft, then frozen or versioned once attempts exist. Changing required fields after candidates have started could make reporting inconsistent. Recommended rule: disallow identity policy edits once the first attempt exists, unless a future versioned policy model is explicitly implemented.

## Next implementation sequence

1. Draft SQL migration and database regression tests from the previously reviewed design.
2. Add shared TypeScript identity-config validator and unit tests.
3. Add config to POST and PATCH routes, with explicit admin permission checks and an attempts-exist immutability guard.
4. Add the identity settings section to the assessment creation/editing interface.
5. Add identity metadata to the runner's assessment select and render the pre-start form.
6. Add `start_organisation_assessment_v2`, preserving both existing question-source branches and returning the same paper shape.
7. Switch the runner to v2 only when the schema and RPC migration are present; keep legacy compatibility for old assessments.
8. Run focused tests and CI. No staging or production deployment until separately approved.

## Follow-up verification — 27 November 2026

- Re-read the live staging `start_organisation_assessment(uuid,text)` definition. It returns JSONB with `ok` and `attempt_id` on success, and delegates errors to `public._err(text,text)`, which also returns JSONB. The proposed wrapper's response parsing is consistent with this exact implementation.
- Confirmed the original RPC is `SECURITY DEFINER`, owned by `postgres`, with pinned `search_path = public, pg_temp`; its current execute grants are `postgres`, `service_role`, and `authenticated`.
- Confirmed `learning_practice_attempts.user_id` is NOT NULL and references an authenticated user. Therefore, the current v2 proposal is authenticated-only. It does not implement guest attempts and must not be marketed or configured as guest-capable.
- Confirmed pgTAP is not installed in the staging project. The validator regression script was changed to plain PostgreSQL `DO` assertions so it does not require installing an extension. It has not been executed.
- Confirmed the current browser runner still invokes the legacy `start_organisation_assessment` RPC. Candidate identity is not yet wired end-to-end.
- Reconfirmed the assessment GET/PATCH/DELETE API handlers call `getAdminSession` but do not perform a granular permission check in those handlers. The identity configuration and candidate PII reporting work must add server-side permission enforcement; client-side page gating is not sufficient.
- The SQL remains a review draft. No migration has been generated or applied, and no staging or production data has been modified.


## Additional schema and authorization review — 27 November 2026

A read-only inspection of the staging table constraints confirms:

- `learning_practice_attempts` has a type check requiring `assessment_id` for `organisation_quiz` and `competition` attempts, and its `user_id` foreign key is non-null by design. This reinforces that guest support needs a separate attempt ownership model rather than a nullable-user shortcut.
- The proposed identity table stores both `attempt_id` and `assessment_id`, but its current draft foreign keys do not prove that the referenced attempt actually belongs to that assessment. The wrapper supplies matching values, but the database should enforce this invariant too (for example, with a composite unique key/FK if compatible with existing indexes, or a narrowly scoped constraint trigger). Add a regression test for mismatched attempt/assessment IDs before calling the migration review-complete.
- The candidate identity table intentionally revokes direct privileges from all API roles. Keep it that way; a later reporting endpoint should use a narrowly scoped, permission-checked server path and must not add the table to broad assessment GET responses.
- `getAdminSession` resolves whether the caller holds an administrator role; it does not by itself establish a per-feature permission such as assessment management or candidate-PII access. The existing assessment route handlers also lack an explicit permission check. Do not extend those handlers to write identity policy or return identity values until the project's actual permission RPC/key contract is inspected and enforced server-side.

### SQL draft review status

The draft is not ready to become a migration. The next review must explicitly resolve the assessment/attempt relationship invariant, validate function ownership and ACLs after rename/wrapper creation, confirm that `learning_private` is not exposed through the Supabase Data API, and test the compatibility wrapper against every existing start caller. No SQL was applied and no tests were executed in this follow-up.
