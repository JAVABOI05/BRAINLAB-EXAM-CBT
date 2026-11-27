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
