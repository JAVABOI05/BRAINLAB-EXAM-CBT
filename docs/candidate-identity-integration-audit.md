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
- The first SQL draft duplicated `assessment_id` and `user_id` in the identity table, which could drift from the authoritative attempt row. The draft has now been refined to store only `attempt_id` as its ownership link; assessment and user context must be derived by joining `learning_practice_attempts`. This removes the mismatch class instead of adding a redundant composite FK. The updated SQL remains unexecuted and still needs isolated-clone validation.
- The candidate identity table intentionally revokes direct privileges from all API roles. Keep it that way; a later reporting endpoint should use a narrowly scoped, permission-checked server path and must not add the table to broad assessment GET responses.
- `getAdminSession` resolves whether the caller holds an administrator role; it does not by itself establish a per-feature permission such as assessment management or candidate-PII access. The existing assessment route handlers also lack an explicit permission check. Do not extend those handlers to write identity policy or return identity values until the project's actual permission RPC/key contract is inspected and enforced server-side.

### SQL draft review status

The draft is not ready to become a migration. The next review must explicitly resolve the assessment/attempt relationship invariant, validate function ownership and ACLs after rename/wrapper creation, confirm that `learning_private` is not exposed through the Supabase Data API, and test the compatibility wrapper against every existing start caller. No SQL was applied and no tests were executed in this follow-up.


## Permission-contract verification — 27 November 2026

Read-only inspection of the current staging `public.admin_has_permission(text)` confirms its argument name is `permission_key` and it is a `STABLE SECURITY DEFINER` function with a pinned `public, pg_temp` search path. Existing server handlers call it using the caller's JWT-bound Supabase client (not the service-role client) before performing a narrowly scoped service-role write. The branch should follow that pattern.

The current staging permission matrix grants `learning.content.manage` to `super_admin`, `platform_admin`, `ai_learning_admin`, and `teacher`; it does not grant it to `cbt_admin`. The assessment workspace is currently exposed in the admin shell under `learning.content.manage`, so use that key for assessment-policy management only if that is the intended product authorization. There is no dedicated candidate-PII permission in the current `ADMIN_PERMISSION_KEYS` catalogue or the inspected staging RPC. Do not silently treat `learning.content.manage` as blanket permission to inspect personal candidate details; define and approve a narrower reporting permission before building identity-value reporting.

This verification is specific to the connected staging project. Production's authorization implementation is known to differ and must not be overwritten or assumed equivalent during any later environment migration.


## Server authorization and data-exposure review — 27 November 2026

A further source-level check of `app/lib/adminAuth.ts` and `app/lib/supabaseServer.ts` confirms that `getAdminSession(request)` authenticates the caller and resolves an administrator role, but does not evaluate a feature permission. Assessment handlers must not treat a non-null admin session as sufficient authorization for assessment management or candidate identity data. Reuse the existing permission-check pattern with the request's JWT-bound Supabase client; do not call `admin_has_permission` through the service-role client because that would not carry the caller's permission context.

The current `GET /api/admin/assessments/[id]` response selects `user_id` for up to 100 attempts. This is not candidate identity data, but it is an unnecessary personal identifier in a broad assessment-detail response. Review whether the endpoint needs raw user IDs; prefer aggregate or pseudonymous candidate identifiers unless an explicitly authorized workflow requires account linkage. Never add candidate identity values to this endpoint or its broad `select(*)` assessment response.

The POST and PATCH assessment routes use the server client helper, which selects the service-role key when configured. Any permission check must run first using a client bound to the caller's bearer token, followed by a narrowly scoped service-role write only after authorization succeeds. Role authentication and feature authorization are separate gates.

The SQL policy validator compares `p_config->>'version'` with text `'1'`, accepting both JSON number `1` and JSON string `"1"`; TypeScript accepts only numeric `1`. Align the contracts before migration by requiring `jsonb_typeof(p_config->'version') = 'number'` in SQL.

No application code, database, deployment, or production environment was changed in this review.


## SQL validator hardening — 27 November 2026

The SQL draft's policy validator was tightened after a manual three-valued-logic review. In PL/pgSQL, a missing JSON key can make a comparison evaluate to SQL NULL; an IF condition that is NULL does not enter the rejection branch. The version and fields type checks now use `IS DISTINCT FROM`, and the version must be the JSON numeric value `1`, not the string `"1"`. The plain-PostgreSQL validator test draft now includes string-version, missing-version and missing-fields regression cases. These are source-level corrections only; the SQL test file has not been executed against a database.

The guest-attempt contract was also aligned with the revised identity schema: the identity table stores only the attempt FK, with assessment/user context derived from the attempt; retention policy remains unresolved and is a release gate. No guest capability is implemented by the authenticated v2 work.


## Route-by-route authorization findings — 27 November 2026

A direct re-read of the current branch's assessment handlers confirms the following:

- `GET /api/admin/assessments`, `POST /api/admin/assessments`, and the assessment detail `GET`, `PATCH`, and `DELETE` handlers call `getAdminSession(request)` but do not call `admin_has_permission` or another feature-level authorization check.
- `getAdminSession(request)` is an administrator identity/role gate only. It does not imply permission to manage assessment content or inspect candidate information.
- `getSupabaseServerClient()` selects `SUPABASE_SERVICE_ROLE_KEY` when configured. Consequently, route-level feature authorization must happen before any query or write made with that privileged client.
- `getUserFromRequest(request)` can resolve the caller from a bearer token or the supported auth-cookie formats. However, `getAdminSession` only passes an explicitly supplied Authorization bearer token into `resolveAdminRole`; when the user is resolved from a cookie, role lookup can fall back to service-role table checks. A new permission helper must independently recover the request's verified access token and construct an anon/publishable-key Supabase client with that token as its Authorization header. If a valid caller JWT cannot be recovered, the permission check must fail closed.
- The connected staging `admin_has_permission(text)` function reads `admin_profiles` using `auth.uid()`. Calling it with the service-role client would not evaluate the requesting administrator's permission and is prohibited for this purpose.

### Permission boundary to implement

- Assessment configuration and assessment lifecycle operations need a dedicated `learning.assessments.manage` permission, rather than silently relying on administrator role membership or treating general learning-content authoring as equivalent.
- Candidate identity values require a distinct `learning.candidates.identity.read` permission and a separate narrow reporting endpoint. No current permission key or staging RPC mapping grants this capability.
- The assessment-detail endpoint should stop returning `user_id` in its general attempt list. Its `select("*")` assessment read should be replaced with an explicit field allowlist; candidate identity configuration can be included only after the assessment-management permission is enforced.
- The list endpoint currently fetches all attempt rows and computes aggregates in application memory. This should be bounded/aggregated server-side before scaling; it must not become a route for raw candidate-level data.
- POST, PATCH and DELETE must perform the feature check using the caller-JWT client before constructing or using the service-role client. The API should return 403 for an authenticated administrator who lacks the required permission, and 401 only when the administrator session itself is invalid.
- Permission catalogue changes in TypeScript alone are insufficient. The staging and production `admin_has_permission` implementations and their role mappings must be reconciled independently; do not overwrite production's more capable implementation with staging's function.

### Current implementation decision

No permission helper or route mutation has been made yet. The correct next slice is to add and test request-token extraction plus a caller-JWT permission helper, define the new permission keys and role matrix, then add the corresponding reviewed SQL migration draft. Only after that contract is stable should the five assessment handlers be changed. Candidate-PII reporting remains a later, separate slice. This review did not execute a migration, change either database, trigger a deployment, or alter production.


## Frontend authorization compatibility check — 27 November 2026

The assessment admin page was checked against the route-authentication patterns before selecting an implementation:

- The page's initial workspace gate calls the browser-side `adminHasPermission("institution.manage")` or `adminHasPermission("learning.content.manage")`. This is a UI gate only; it does not protect the API routes.
- The page loads organisations, assessments, question catalog and assessment access-code metadata directly through the browser Supabase client. It also toggles publication directly against `learning_assessments`. Those operations rely on database grants/RLS and must be checked against the actual staging policies; adding API route checks alone will not secure the direct-client path.
- The create request currently sends only `Content-Type: application/json`; it does not explicitly attach a bearer token. `getAdminSession(request)` can authenticate supported auth cookies, but the existing `exam-access-policy` route's granular permission pattern requires an explicit bearer token and returns 401 without one. Therefore, copying that route's token-only pattern into the assessment routes without changing the frontend would break cookie-authenticated calls.
- The safe implementation choices are either (a) a tested request-token extractor that supports the exact Supabase cookie formats used by this app and fails closed, or (b) updating every assessment API caller to send the current session access token and verifying all callers. Do not assume that `getUser()` returns the access token; use the session API when choosing option (b).
- The page's direct table operations need their own RLS permission enforcement or should be moved behind the same permission-checked API boundary. Candidate identity configuration should not be added to the direct browser update path.

This is a source audit only. No route, UI, RLS policy, or database object was changed in this step.


## Staging RLS review of direct assessment-admin paths — 27 November 2026

Read-only inspection of `pg_policies` and the helper function definitions found that the browser-direct assessment access path has broad existing authorization:

- `learning_assessments_manage_admin` is an authenticated `ALL` policy whose predicate accepts any caller with a row in `admin_users` where `admin_users.id = auth.uid()`. It does not check a feature permission or a particular role.
- `learning_assessments_manage_scoped` is another permissive `ALL` policy. It allows `learning_can_manage_all()` or an active organisation owner/admin for the assessment's organisation. Because PostgreSQL permissive policies are OR-combined, satisfying either policy is sufficient.
- `learning_can_manage_all()` returns true for `super_admin`, `platform_admin`, and `ai_learning_admin`.
- `learning_access_codes_manage_scoped` also permits `learning_can_manage_all()`, `cbt.codes.manage` for assessment-scoped codes, or scoped organisation ownership/admin.
- The page's direct assessment and code reads/writes therefore have a separate policy surface from the assessment API. A new API-only permission check would not close that path.

### Required follow-up before identity UI

1. Inspect all consumers and intended role semantics of `learning_can_manage_all()`, `learning_can_manage_organisation()`, and the existing assessment/access-code policies before changing them. These functions may be relied on by other Learning Hub flows.
2. Decide whether the assessment admin page should use the existing organisation-scoped permission model, the new dedicated assessment-management permission, or both. Make the same decision consistently for API routes and direct-client RLS.
3. Remove or narrow the `admin_users` existence shortcut only after checking every affected workflow; do not make an isolated policy edit that unexpectedly blocks existing admins.
4. Keep candidate identity table access fully separate from assessment configuration access. No direct authenticated table privileges should be added for identity values.
5. Verify policies with positive and negative role tests (including a generic admin row, teacher, CBT admin, AI learning admin, platform admin, organisation owner/admin, and unrelated authenticated user) on an isolated database clone.

This inspection was read-only. It did not modify RLS, helper functions, grants, application code, or data.
