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