# Assessment authorization hardening — environment reconciliation

Date: 27 November 2026  
Branch: `fix/assessment-auth-repair-on-current-production`  
Status: design/audit only. No SQL, application code, database, deployment, or production state was changed.

## Decision applied for this work

Use the conservative candidate-identity policy:

- Candidate identity values are readable only by a Super Admin or a reviewer explicitly assigned to that specific assessment.
- A Platform Administrator does **not** receive candidate-identity access merely by holding the Platform Administrator role.
- General assessment management and candidate-identity reporting are separate permissions and separate API paths.
- Reviewer access is assessment-scoped, revocable, and checked server-side on every read. UI hiding is not an authorization boundary.
- No candidate identity value is included in general assessment list/detail responses, broad attempt queries, analytics payloads, or configuration audit logs.

This is a proposed access contract, not an implemented permission change.

## Fresh read-only environment verification

### Staging project: `eusgwsuoloomphepe`

The live `public.admin_has_permission(text)` function is a `STABLE SECURITY DEFINER` SQL function with pinned `search_path = public, pg_temp`. It reads the caller's role from `public.admin_profiles` using `auth.uid()`.

The current role mapping includes:

- `super_admin`: returns true for every permission key, including unknown keys.
- `platform_admin`: explicit allow-list including `learning.content.manage` and `institution.manage`.
- `ai_learning_admin`: includes `learning.content.manage`.
- `teacher`: includes `learning.content.manage`.
- `cbt_admin`: no learning-assessment-specific permission in the inspected allow-list.

The staging `learning_assessments` RLS policies are permissive and OR-combined:

1. `learning_assessments_manage_admin` grants ALL when `learning_can_manage_all()` is true **or any row exists in `admin_users` with `id = auth.uid()`**.
2. `learning_assessments_manage_scoped` grants ALL when `learning_can_manage_all()` is true or the caller can manage the assessment's organisation.
3. The published-read policy also allows any matching `admin_users` row to read assessments.

Because these policies are PERMISSIVE, narrowing only the second policy would not close the first policy's broad grant. The broad admin shortcut must be removed/replaced as part of a reviewed staging RLS change, after the intended management workflows have been mapped.

The `learning_access_codes_manage_scoped` policy separately grants assessment-scoped code management through `learning_can_manage_all()`, `cbt.codes.manage`, or organisation management. It needs its own explicit review; do not assume that changing assessment RLS automatically secures code management.

Staging currently has no `learning_assessment_reviewers` assignment table. The previously queried centralized `access_permissions` catalogue is also absent. Do not write migration SQL that assumes either exists.

### Production project: `bupkyppvtkrmzmluzjmf`

Production's `public.admin_has_permission(text)` is materially more capable than staging's version. It has a different role matrix and additional capabilities for STEM and question-bank operations. It must not be replaced with the staging function or copied wholesale from staging.

Production has no `learning_assessments`, `learning_practice_attempts`, `learning_access_codes`, organisation assessment tables, or candidate identity table in the inspected public schema. Therefore, assessment authorization SQL cannot be applied to production as a standalone patch. Production requires a separately designed additive schema rollout and authorization reconciliation, after the target production data model is approved.

The two projects' `admin_has_permission` definitions are both caller-context functions based on `admin_profiles.user_id = auth.uid()`. Any route permission check must use a client carrying the requesting user's verified JWT. A service-role client is not a substitute for the caller's authorization context.

## Required permission boundaries

### 1. Assessment configuration and lifecycle

Introduce a dedicated key such as `learning.assessments.manage`. Its role matrix must be explicit and separately reviewed. It must not be inferred from the current broad `learning.content.manage` permission.

Organisation-scoped managers may manage only assessments belonging to organisations they actively manage. Platform-level assessment managers may manage platform-owned assessments according to the explicit role matrix. The existing `learning_can_manage_all()` semantics used by other Learning Hub features must not be globally changed as a shortcut.

### 2. Candidate identity values

Introduce a distinct permission such as `learning.candidates.identity.read`, but do not grant it to all Platform Administrators or all content managers.

Authorization predicate for a candidate identity read:

- caller has a verified Supabase JWT and a valid administrator session; and
- caller is a Super Admin **or** has an active reviewer assignment for the exact assessment; and
- the requested attempt belongs to that assessment; and
- the assessment/attempt is within the reviewer's active assignment scope.

Reviewer assignment records should include at least assessment ID, reviewer user ID, active/revoked state, grantor, grant timestamp, and optional expiry. Only Super Admins should create/revoke identity-review assignments in the first iteration. Assignment history should be auditable without copying candidate values into logs.

The candidate identity table must remain inaccessible by direct browser table access to `anon` and `authenticated`. Use a narrow server endpoint that validates the caller JWT and reviewer scope, then performs the minimum privileged read. The endpoint must paginate, return only approved identity fields, and audit access metadata (who, which assessment/attempt, when) without logging the values themselves.

### 3. Public / candidate-facing data

Public assessment landing and runner endpoints must expose only fields required by candidates. Do not return `user_id`, candidate identity values, private answer keys, or internal admin metadata. Candidate identity configuration can be returned to the runner only as a validated field policy (hidden/optional/required), never as stored candidate values.

## Application changes required before identity UI is wired

1. Add robust request-scoped Supabase access-token extraction for the actual Supabase cookie formats used by this app, or explicitly attach the current session access token from every browser assessment API caller. Do not accept an unverified cookie string as a JWT.
2. Fail closed if a verified caller JWT cannot be recovered for a feature permission check.
3. Add a caller-JWT Supabase client helper using the public/anon key and the verified caller token.
4. Call the feature permission RPC with that caller-JWT client before creating or using the service-role client for privileged reads/writes.
5. Add server-side `learning.assessments.manage` checks to assessment list/create/detail/update/delete routes. Return 401 for invalid authentication and 403 for an authenticated admin without the permission.
6. Replace the broad assessment detail `select(*)` and remove `user_id` from its general attempt list. Use explicit field allow-lists.
7. Move browser-direct assessment reads/writes and publish toggles behind the same permission-checked API, or ensure their RLS policies enforce the identical boundary. API checks alone do not protect direct Supabase browser calls.
8. Keep candidate identity reporting in a separate endpoint protected by the assessment-scoped reviewer predicate. Never append identity data to the general assessment endpoint.
9. Do not implement guest attempts by making `user_id` nullable. Current attempt schema is authenticated-user based; guest identity needs a distinct ownership/token, expiry, anti-abuse, and retention design.

## Database migration sequencing — draft only

Do not generate a single cross-environment migration and do not apply this design to either project yet.

### Staging
- Add reviewer-assignment schema and least-privilege helper functions.
- Add a dedicated assessment-management permission contract.
- Replace the broad `learning_assessments_manage_admin` policy; verify every intended admin and organisation workflow before removing the legacy shortcut.
- Review and align the published-read and access-code policies separately.
- Keep identity values inaccessible to direct API roles.
- Test policy behavior under real authenticated JWTs for Super Admin, Platform Admin, scoped organisation manager, assigned reviewer, unassigned reviewer, teacher, CBT Admin, and ordinary candidate.
- Test both USING and WITH CHECK paths for SELECT/INSERT/UPDATE/DELETE.

### Production
- First reconcile and approve the required assessment schema additively.
- Preserve the production `admin_has_permission` role matrix and unrelated STEM/question-bank capabilities.
- Add assessment permission keys explicitly to the production function only after a complete role matrix is approved.
- Do not replay staging migration history wholesale.
- No production SQL is ready or authorized from this audit.

## Release gates

- [ ] Final assessment-management role matrix approved.
- [ ] Reviewer assignment lifecycle and expiry rules approved.
- [ ] Candidate identity retention/deletion period approved.
- [ ] Staging migration tested in an isolated database clone.
- [ ] RLS tests cover all role and scope combinations, including permissive-policy OR behavior.
- [ ] Caller-JWT permission helper and all assessment route callers tested.
- [ ] Direct browser table access removed or proven to enforce equivalent RLS.
- [ ] Candidate PII endpoint reviewed for pagination, audit trail, and data minimization.
- [ ] Guest-attempt design handled separately.
- [ ] Production schema reconciliation and production-specific permission migration reviewed separately.
- [ ] CI/typecheck/focused tests pass.
- [ ] Explicit approval obtained before any staging migration, merge, or deployment; separate explicit approval before production changes.

## Current status

This document records read-only source and database catalog verification plus the conservative access decision. No migration SQL has been applied, no candidate data has been read, no application authorization code has been changed, no tests/builds have been run, and no deployment or merge has occurred.


## Additional route and RPC audit — 27 November 2026

The following application files were inspected on the repair branch:

### Admin assessment API

- `app/api/admin/assessments/route.ts`: GET and POST require only `getAdminSession()`. The route then uses `getSupabaseServerClient()`, which selects the service-role key when configured. No feature-level permission RPC is called. GET returns aggregate attempt counts/scores; POST creates the assessment, optionally inserts an assessment access code, and writes a configuration audit event.
- `app/api/admin/assessments/[id]/route.ts`: GET, PATCH, and DELETE also require only an administrator session before using the service-role client. GET uses `select("*")` for assessment configuration and returns the latest 100 attempts including `user_id`. This is a direct identity correlation leak into the general admin detail endpoint, even though it does not return candidate names or phone numbers. PATCH/DELETE have no explicit assessment feature permission check.
- `app/api/admin/assessments/[id]/code/route.ts`: GET, POST, and DELETE require only an administrator session before service-role operations. They expose code metadata and permit code lifecycle changes without a dedicated assessment-code permission check. POST revokes existing active codes, inserts a replacement, and enables `access_code_required`; these are privileged writes and need explicit authorization and atomicity review.

### Browser-direct admin access

- `app/admin/organised-assessments/page.tsx`: reads organisations, assessments, the question catalogue, and assessment access-code metadata directly from the browser Supabase client. Its UI gate checks `institution.manage` OR `learning.content.manage`, but those checks are not a substitute for database RLS. The publish toggle directly updates `learning_assessments`. The create flow calls the admin API and currently does not explicitly attach an Authorization bearer token.
- `app/admin/academy-results/page.tsx`: reads the assessment list directly from the browser client and invokes `get_organisation_assessment_results`. Its UI gate checks analytics/results/institution permissions, but the database RPC must be treated as the real security boundary.
- `app/admin/academy-access/page.tsx`: directly reads organisations, assessments, and access-code rows; it also directly updates code revocation and organisation status. It invokes database RPCs for code creation and entitlement operations. UI-level role checks do not protect those direct calls; each RPC and table policy must enforce its own permission and scope.

### Result-reporting RPC is an independent authorization boundary

The checked-in migration `20261018143242_assessment_attempt_limits_and_admin_results.sql` defines `public.get_organisation_assessment_results(uuid)` as `SECURITY DEFINER`. It returns every attempt for the selected assessment, including `user_id`, and has no pagination.

Its authorization currently accepts any of:

- `learning_can_manage_all()`;
- organisation management for the assessment's organisation;
- `admin_has_permission('analytics.read')`; or
- `admin_has_permission('cbt.results.read')`.

This means a role with broad analytics or CBT-results permission can read attempt-level identifiers across assessments, independently of the page's UI gate. That is broader than the selected candidate-identity policy. The RPC should be split into (a) aggregate/score reporting with no user identifier by default and (b) a separately audited, assessment-scoped identity-review endpoint. If identifiable result review is genuinely needed for a non-Super Admin, it should require an active reviewer assignment to the exact assessment. Any export path must apply the same server-side check.

The result RPC's current `jsonb_agg` returns the entire attempt set in one response. Add bounded pagination and stable ordering in a revised API/RPC contract; do not simply add a page-size parameter while retaining an unbounded aggregate internally.

### Key conclusion

The existing security boundary is not just three admin route handlers. It includes:

1. Assessment list/create/detail/update/delete API routes.
2. Assessment access-code GET/create/revoke API routes.
3. Browser-direct reads/writes in the organised-assessment admin page.
4. Browser-direct reads/writes and security-definer RPCs in the Academy Access page.
5. The security-definer results RPC and any CSV export fed by its output.
6. Candidate-facing public assessment reads, which should remain limited to published safe fields.

Do not implement a partial patch that secures only the admin API while leaving the browser/RPC paths unchanged.

### Explicitly deferred implementation

No application authorization changes are included in this commit. The current repository has no `@supabase/ssr` dependency; the existing request auth helper manually inspects cookie strings and does not robustly reconstruct chunked/base64 Supabase SSR cookies. A safe first implementation should either:
- pass the verified current access token explicitly from every browser caller to these APIs and fail closed when absent; or
- add and configure the supported Supabase SSR cookie integration across the app, with tests for chunked cookie reconstruction and token verification.

Do not treat a raw cookie value longer than 20 characters as a verified bearer token. A token must be verified by Supabase Auth before it is used for role/permission checks.


## Additional live staging SECURITY DEFINER inventory — 27 November 2026

A read-only catalog inventory was run against staging for public functions with assessment, organisation, entitlement, and access-code names. Function execute grants are part of the attack surface: RLS does not protect operations performed inside a `SECURITY DEFINER` function. The following findings require separate treatment from the candidate identity work.

### Critical: unauthenticated legacy access-code consumption

Live staging exposes `public.mark_access_code_used(text,text,uuid)` to `anon`, `authenticated`, and `service_role`. It is `SECURITY DEFINER` with `search_path = public, pg_temp`.

Its body:
- accepts an access code and caller-supplied `p_used_by`;
- locks a matching legacy `public.access_codes` row;
- if unused, marks it used and stores the caller-supplied identity;
- does not require `auth.uid()`, verify an exam session, verify a candidate phone, or prove that the caller has authority to consume that code.

This is a potential unauthenticated denial-of-service / code-poisoning path: anyone able to call the RPC and obtain/guess a valid code can consume it and set the recorded `used_by`. Do not test this against live data. The repair should revoke execute from `anon` immediately in a separately approved staging change, then review whether authenticated callers still need this legacy function. If a legitimate candidate flow depends on it, replace it with a server-controlled operation bound to a validated exam session and verified candidate identity. Do not leave a public caller-supplied `p_used_by` parameter as the authority.

### Other public or broadly executable functions needing review

- `check_access_code(text,text)` is `SECURITY DEFINER` and executable by `anon` and `authenticated`. It validates a supplied legacy code/phone pair and returns whether the code is valid, including a master-code success type. It has throttling through phone-based helpers, but the public exposure should be explicitly justified and rate-limited at the edge. Never return the master code itself. Do not remove it until the candidate CBT flow dependency is mapped.
- `create_learning_access_code(...)` has a legacy 9-argument overload executable by `authenticated` and a newer 10-argument overload executable by `authenticated`. Both require `auth.uid()` and perform internal role/scope checks. The 10-argument overload resolves an assigned email to an auth user, then delegates to the 9-argument function. Verify that the 9-argument overload cannot be abused to bypass assigned-account binding for permanent codes; its body enforces one redemption but does not accept `assigned_user_id`. Prefer to revoke the legacy overload after caller inventory confirms it is unused.
- `create_learning_organisation(text,text)` is `SECURITY DEFINER`, authenticated-only, and requires `learning_can_manage_all()`. This means the live helper currently permits platform and AI learning admins, not only a narrowly scoped organisation-management permission. Align that policy with the approved role matrix before changing it.
- `redeem_learning_access_code(text)` is authenticated-only, but first checks legacy `public.access_codes` and delegates matching codes to `redeem_plan_voucher`. This creates a cross-system redemption path with subscription/plan side effects. Assessment-only access codes should not be routed through plan-voucher redemption; a dedicated assessment-only code path is required before relying on this RPC for the new assessment experience.
- `list_learning_entitlements(uuid)` is authenticated-only and returns `user_id` and entitlement details. Its body allows global learning managers or qualifying organisation managers. Treat this as a restricted identity-bearing admin endpoint, not a general learning-content read. Its organisation branch should be tested for cross-organisation leakage, especially when `p_organisation_id` is null.
- `revoke_learning_entitlement(uuid)` is authenticated-only and checks global learning management or organisation management before revoking. Verify its scope against the entitlement's organisation and assessment, and ensure it cannot revoke assessment access outside the caller's scope.
- `export_fresh_access_codes(integer)`, `generate_access_codes(integer)`, and `reset_used_access_codes_preserve_master()` are `SECURITY DEFINER` functions that call `_require_admin()`; retain their server-side guard and confirm execute grants remain limited to authenticated/service roles.
- `validate_published_learning_assessment()` is a trigger function, not an application RPC; it is not a public user-facing operation.
- Assessment attempt RPCs (`start_organisation_assessment`, `resume_organisation_assessment`, `save_organisation_assessment_progress`, `submit_organisation_assessment`) are `SECURITY DEFINER` and executable by authenticated users. Their attempt-token and ownership checks must remain intact; do not revoke or alter them as part of admin authorization work without separately testing candidate start/resume/save/submit behavior.

### Prioritised remediation order

1. **P0 — `mark_access_code_used`:** prepare a narrowly scoped privilege-revocation patch for `anon` and verify whether any live candidate flow depends on it. Do not execute the patch without explicit approval and a rollback plan.
2. **P1 — Results and entitlement identity exposure:** split aggregate reporting from identifiable candidate review; paginate both; require assessment-scoped reviewer assignment for identity-bearing outputs.
3. **P1 — Legacy voucher cross-over:** isolate assessment-only redemption from `redeem_plan_voucher` and subscription side effects.
4. **P2 — Legacy function overloads:** inventory callers and retire unused overloads with explicit execute grants.
5. **P2 — Admin feature permissions:** replace broad role assumptions with explicit permission checks while preserving legitimate organisation owner/admin scope.
6. **P2 — Public candidate code validation:** retain only if required by the current CBT UX; add edge rate limits, abuse monitoring, and a documented public threat model.

This catalog inventory was read-only. No RPC was invoked against live records, no code was consumed, and no privileges or function definitions were changed.
