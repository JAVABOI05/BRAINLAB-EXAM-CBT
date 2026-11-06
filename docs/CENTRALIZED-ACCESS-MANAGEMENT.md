# BrainLab Centralized Access Management

**Status:** Implementation design, branch-only.  
**Branch:** `feature/centralized-access-management`  
**Production:** No changes.  
**Database:** Read-only inspection only; no migrations applied.

## Goals

Replace UUID-copying role administration with a secure People & Access Management Centre. Super Admins and explicitly delegated access managers search registered accounts by email/name, select a person, and grant one or more fixed or custom roles. The same permission model must be enforced by server code and Supabase RLS.

## Verified current-state findings

- `app/admin/users/page.tsx` is a client-side page that asks an administrator to paste a Supabase Auth UUID, validates it in the browser, then calls `set_admin_role(target_user_id, new_role)`.
- The same page lists raw user UUIDs in its administrator table.
- `supabase/migrations/20261018135606_admin_role_hierarchy.sql` creates a single-role `admin_profiles.role` constraint and implements `admin_has_permission(text)` with a hardcoded CASE expression.
- Staging's `admin_profiles_role_check` currently includes fourteen values: the eleven in the migration plus `competition_admin`, `competition_moderator`, and `competition_host`. The checked-in migration and staging schema therefore differ.
- `app/lib/adminRoles.ts` contains a broader permission catalogue than the SQL migration, including Competition Arena and STEM Studio permissions.
- `app/lib/adminAuth.ts` accepts only the fixed `ADMIN_ROLES` list as an admin session role. This must be changed before custom role names can be used safely.
- Existing academic structures include `tutor_profiles` (with nullable `user_id`, subject slugs and approval status) and `learning_subject_memberships` (user, subject and membership role). These are resource/teaching assignments, not substitutes for platform role assignments.
- Existing `audit_logs` is used by role-management functions. Existing tutor RLS policies depend on `admin_has_permission('learning.content.manage')` and tutor-specific ownership/approval predicates.

## Target model

Keep authentication identity, platform roles, resource scopes, and subscription entitlements separate.

### Fixed system roles

Seed protected system roles for existing supported roles, including Super Admin, Platform Admin, CBT Admin, AI & Learning Admin, Community Moderator, Analytics Admin, School Admin, Teacher, Content Reviewer, Finance Admin, Read-only Auditor, Competition Admin, Competition Moderator, and Competition Host.

Fixed roles are not deletable. Their identity keys are stable. Permission editing is limited by policy; Super Admin is an immutable platform capability, never a normal assignable permission.

### Custom roles

An authorised role manager can create a custom role with:
- Human-readable name and stable generated key.
- Description and optional module/category.
- Individual permissions from a centrally maintained permission catalogue.
- Optional resource scopes (for example assigned subjects, classes, cohorts, competitions, or departments).
- Active/inactive state.
- Created/updated metadata and audit history.

Custom role names are labels, not executable permissions. A role only grants capabilities through explicit permission records. Custom roles must not grant Super Admin, security-root, or role-governance capabilities unless a separately authorised policy explicitly permits that delegation. The default is deny.

### Multiple role assignments

A person may hold multiple roles. Each assignment records:
- Auth user identity (internal only).
- Role.
- Scope JSON validated against known scope types.
- Assigning actor.
- Start/expiry timestamps.
- Active/revoked status and reason.

Effective permissions are the union of active role grants, constrained by each role's resource scope. Removing one assignment must not remove other roles or the learner account.

## Proposed data structures

Names are provisional and must be reconciled against the live schema before migration:

- `access_roles`: fixed/custom role catalogue and lifecycle.
- `access_permissions`: canonical permission registry (module, action, description, sensitivity).
- `access_role_permissions`: many-to-many role-to-permission grants.
- `access_user_role_assignments`: multiple user-role assignments, scope, expiry and revocation.
- `access_invitations`: optional invitation lifecycle for not-yet-registered people; invitations do not create Auth identities until verified acceptance.

Do not duplicate `profiles`, `admin_profiles`, `tutor_profiles`, or `learning_subject_memberships`. Keep a compatibility bridge during migration and remove it only after every consumer is migrated and tested.

## Account lookup and assignment UX

The browser must never ask for or display a Supabase UUID. Use authenticated server-side operations:
1. Search by normalized email or display name.
2. Return only minimum necessary display fields (name, email, account status, existing roles); never return auth secrets.
3. Select an account and a role.
4. Submit the email/account selection and role key to a server-side RPC/route which resolves the identity internally.
5. Re-check the actor's permissions and delegation ceiling at mutation time.
6. Record an audit event atomically with the assignment.

Email search must not become a public account-enumeration endpoint. Require an authorised access-management permission, rate-limit it, and return generic responses where appropriate. Use verified Auth identity for actual assignment. Do not create accounts as a side effect of role assignment.

## Permission enforcement

- Central permission catalogue with explicit action-level keys (view/create/edit/delete/approve/publish/export/manage).
- Server-side authorization for every sensitive route/action.
- Supabase RLS remains authoritative for direct database access.
- A permission helper must fail closed and support resource-aware checks; a generic boolean check alone cannot enforce subject/class/competition scopes.
- Never trust client caches, JWT user metadata, hidden buttons, or route visibility as authorization.
- Do not put service-role credentials in client code.
- Keep Super Admin as a protected root capability with last-super-admin and self-escalation safeguards.
- Custom role managers may only assign permissions and roles within their own delegation ceiling.

## Tutor integration

Granting a Tutor role must not fabricate a public tutor profile or bypass tutor approval. Role assignment and teaching assignment are separate:
- Platform role: authorises tutor workspace capabilities.
- Tutor profile: public/teaching identity and approval lifecycle.
- Subject/class memberships: scopes the tutor's actual teaching access.

The workflow should offer to create/link a tutor profile only when needed, then assign subjects/classes through the existing membership model. Existing tutor RLS and public approved-profile rules must remain intact.

## Safe rollout sequence

1. Complete inventory of all role checks, permission RPC consumers, middleware, route handlers, RLS policies and role-specific UI.
2. Reconcile staging schema versus checked-in migrations, including the three Competition roles.
3. Add additive role/permission/assignment tables and seed a canonical permission catalogue.
4. Backfill existing fixed roles into assignments without changing effective access.
5. Implement dynamic permission evaluation and a compatibility layer; compare old/new decisions for every existing role.
6. Update server auth/session resolution to recognise permission-bearing custom roles without trusting arbitrary role labels.
7. Build People Directory, Role Builder, assignment/scope editor, invitations and audit history.
8. Migrate RLS policies and server routes module by module; preserve existing student/tutor/subscription behaviour.
9. Test positive and negative cases, scope boundaries, expiry/revocation, last Super Admin, privilege escalation, and all existing role regressions.
10. Stage only after explicit approval; verify CI, TypeScript, build, RLS tests and preview. No production merge/deploy without explicit approval.

## Known implementation blockers to resolve before migration

- Inventory every consumer of `get_admin_role()`, `admin_has_permission()`, `is_admin()`, `is_super_admin()`, and direct `admin_profiles` reads.
- Confirm the actual public profile table and safe display-name source for account search.
- Inspect the actual staging definitions and grants for security-definer RPCs, including function search paths and execute privileges.
- Reconcile the permission catalogue in TypeScript with SQL policies; do not silently omit Arena/STEM permissions.
- Determine whether the existing legacy `admin_users` table is still used by any login or route. Never merge it with Supabase Auth identities without proof.

## Non-goals / safeguards

- No separate authentication system.
- No duplicate tutor records.
- No automatic premium/subscription grants.
- No broad access based only on frontend role labels.
- No production schema/data mutation during design or staging development without explicit approval.


## Expanded authorization dependency audit (2026-11-06)

A broader repository search found that the permission engine is a shared security dependency, not a self-contained admin feature.

### Additional verified consumers

- `get_admin_role()` is consumed by login/account routing, the operator-gate endpoint, admin session resolution, Coming Soon route gating, tutor pages, dashboards, subscription helpers, AI monitoring/model routes, and multiple API handlers.
- `admin_has_permission(text)` is referenced by many RLS policies and security-definer RPCs across CBT, access codes, notifications, question media, Learning Hub and tutor profile management.
- Numerous route handlers read `admin_profiles` directly. Some also inspect the legacy `admin_users` table. Examples include assignments grading, audio upload, classroom classes/attendance, Learning Hub media upload, recordings, communications, and AI model routes.
- `resolveAdminRole()` in `app/lib/supabaseServer.ts` checks the RPC, then `admin_profiles`, then legacy `admin_users` by id/email. This compatibility chain must be inventoried and migrated deliberately.
- `app/api/auth/operator-gate/route.ts` currently grants the private-entry cookie to any account for which `get_admin_role()` returns a non-empty string. That remains a role-presence gate, not a fine-grained permission check.
- `app/lib/adminAuth.ts` can accept role strings from Auth metadata before checking the database. Client-side role caches are also used for navigation. These may improve UX but must never become authoritative for protected actions.
- `app/lib/subscriptionEntitlements.ts` currently treats any administrator role as an all-feature VIP entitlement. This is a separate product-entitlement policy and must be reviewed so custom staff roles do not accidentally receive paid student entitlements or conflate staff access with learner subscriptions.
- The latest checked-in migration `20261106040000_grant_instructor_academic_permissions.sql` overrides the earlier permission CASE mapping. It adds academic/authoring grants for `teacher` and `competition_host`, STEM permissions and Competition-related permissions. The final seed mapping must be derived from the latest effective function and the TypeScript catalogue, not only the earlier migration.

### Critical migration implications

1. Do not change `get_admin_role()` semantics in isolation. Many existing consumers expect one fixed role string and use equality checks such as `role === 'teacher'` or membership in a fixed role list.
2. Introduce a new authoritative permission/session contract (for example `get_access_context()`) that can return staff status, role assignments and permission keys without leaking internal Auth UUIDs to the UI. Keep `get_admin_role()` as a compatibility shim while consumers are migrated.
3. Replace direct `admin_profiles` checks with central server-side permission checks only after classifying each route as governance admin, instructor/tutor, moderator, or ordinary learner.
4. Preserve resource-level checks in Learning Hub and classroom membership. A custom role's broad module permission must not bypass assigned subject/class boundaries.
5. Audit and remove trust in user-editable `user_metadata.role` as an authorization source. JWT metadata may be used only if it is set exclusively by a trusted server and is promptly invalidated on role changes; database authorization remains authoritative.
6. Treat `admin_users` as legacy until every consumer is identified and its purpose is verified. Do not assume its `id` is a Supabase Auth user id.
7. The custom Role Builder must not grant broad permissions simply because a role name contains words such as `admin`, `teacher`, or `moderator`. Names are display labels only.
