# Centralized Access Management — Compatibility Audit

**Status:** Staged audit; no runtime authorization cutover approved  
**Branch:** `feature/centralized-access-management`  
**Scope:** Existing application consumers that must be reconciled before custom roles or multi-role assignments become authoritative.

## Executive finding

The additive access catalogue and People & Access UI can remain staged, but the platform is not ready to replace its legacy single-role contract. Authorization is currently distributed across database RPCs, direct profile lookups, hard-coded role comparisons, metadata checks, module-specific RBAC helpers, and subscription bypass logic. Changing only `get_admin_role()` or `admin_has_permission()` would cause inconsistent access and could widen privileges.

The latest staged preview builds successfully. The four access migrations remain unapplied. Existing production and staging authorization behavior has not been changed by this feature branch.

## Confirmed compatibility surfaces

### 1. Core identity and session resolution

- `app/lib/adminAuth.ts` returns a single `AdminUser.role` constrained to the fixed `ADMIN_ROLES` list.
- `app/lib/supabaseServer.ts` resolves roles through `get_admin_role()`, then `admin_profiles`, then legacy `admin_users` lookups.
- `app/lib/adminRoles.ts` contains a fixed role catalogue and client permission cache.
- Multiple consumers call `get_admin_role()` directly, including login/account routing, dashboard routing, tutor workspaces, AI administration, and operator-entry checks.
- The current role API cannot represent a person with several roles or a custom role key. A compatibility adapter must preserve the legacy primary-role contract for old consumers while new consumers use a typed access context.

### 2. Database permission and RLS enforcement

- `admin_has_permission(text)` is used by existing RLS policies and security-definer RPCs across examination results, question management, access codes, tutor profile/content management, and other protected resources.
- The effective implementation is not just the original role-hierarchy migration: `20261106040000_grant_instructor_academic_permissions.sql` replaces the function and adds academic/question-bank/STEM permissions for instructor roles.
- The new role-permission seed must be reconciled against the *effective* database function and every resource-specific predicate before it can replace the old permission function.
- Resource scopes are currently stored in the staged assignment model but are not yet enforced by the affected modules or RLS policies. Storing a scope is not equivalent to enforcing it.

### 3. Hard-coded role comparisons and module-specific access

The source search identified role-dependent behavior in, among others:

- Tutor profile and tutor portal checks that require the literal `teacher` role.
- Classroom token, class start, class admission, attendance, polls, and recording endpoints that use role allowlists or role-name substring checks.
- CBT subject/content administration APIs with their own role allowlists, including legacy role names.
- Competition Arena's separate `CompetitionRole`, `ROLE_DEFAULT_PERMISSIONS`, and scoped permission engine in `app/lib/competitionRbac.ts`.
- STEM Studio and other newer APIs that call `resolveAdminRole()` or check fixed roles.

These checks need explicit mappings to permission keys and scope rules. A generic role-name match such as `includes("admin")`, `includes("staff")`, or `includes("teacher")` must not be carried forward as an authorization rule.

### 4. Classroom authorization is not yet permission-driven

The inspected classroom token and class-start handlers currently combine several signals:
- resolved legacy role names and role-name substring matches;
- configured tutor email allowlists;
- official BrainLab email-domain checks;
- Auth metadata role values;
- presence in legacy administrator tables.

The class-admission handler also checks a direct `admin_profiles` role allowlist and a tutor email allowlist.

This is a separate migration workstream: define precise permissions such as hosting, starting, admitting, moderating, recording, and viewing a class, then enforce class ownership/assignment and class-level scope server-side. Merely assigning a custom role must not make someone a class host.

### 5. Subscription and learner entitlements must remain separate

`app/lib/subscriptionEntitlements.ts` currently contains a broad `isCurrentUserAdmin()` detector that accepts:
- `get_admin_role()`;
- Auth `app_metadata` and `user_metadata`;
- browser local/session storage;
- a local Admin PIN verification flag;
- legacy profile and administrator table records.

The same helper is used to grant the universal `ADMIN_VIP_PLAN` entitlement bypass. As written, the detector is not an acceptable authority for staff permissions, and its broad “any administrator means unlimited learner plan” behavior must not be extended to custom roles.

Before activation:
1. Separate staff authorization from learner subscription entitlements.
2. Make learner entitlement decisions from the learner's subscription/entitlement records.
3. If a Super Admin testing bypass is retained, derive it only from a trusted, server-verified Super Admin identity, never metadata, browser storage, or a PIN flag.
4. Ensure custom staff roles do not automatically grant premium learner benefits.

### 6. Operator/private-entry gate

`app/api/auth/operator-gate/route.ts` currently grants the private-entry cookie when `get_admin_role()` returns any non-empty role string. This must become an explicit permission or approved system-role check before custom roles are connected to the operator gate. A role's mere existence must not imply access to the private admin entry path.

## Required compatibility design

1. **Keep the legacy contract during transition.** Do not change `get_admin_role()` or `admin_has_permission()` until all consumers and RLS dependencies are classified.
2. **Introduce one authoritative server-side access context.** It should return all active assignments, permissions, expiry, and scope for the authenticated caller. Browser metadata and cached role strings are display hints only.
3. **Retain a compatibility primary role.** Map existing system roles to their existing role keys for legacy routes; custom roles must never be inferred from their names.
4. **Migrate by module.** Each API route, server action, and RLS policy must check an explicit permission and resource scope. Module owners must define the resource identifiers and ownership rules.
5. **Separate staff and learner access.** Admin/staff permission does not imply a paid learner plan or unrestricted learner entitlements.
6. **Preserve tutor-domain data boundaries.** Tutor approval, tutor profile, subject memberships, class assignments, and teaching scope remain separate from platform role assignment.
7. **Protect governance.** Custom roles cannot receive root governance/security permissions. Super Admin elevation must remain a separately controlled break-glass process with last-Super-Admin protection.
8. **Test both directions.** Verify allowed actions for authorized roles and denied actions for users with no role, expired/revoked assignments, unrelated custom roles, wrong resource scope, and forged Auth metadata.

## Activation blockers

- [ ] Full inventory of every route, server action, direct table lookup, and database function consuming legacy role or permission state.
- [ ] Permission-by-permission reconciliation against the effective legacy SQL policy and TypeScript catalogues.
- [ ] Defined resource-scope schemas for classes, institutions, competitions, question banks, and content ownership.
- [ ] Per-module API and RLS migrations with negative authorization tests.
- [ ] Subscription-entitlement separation and regression tests.
- [ ] Operator gate and login/dashboard routing compatibility.
- [ ] Staging-only migration rehearsal against the actual staging schema and migration history.
- [ ] Security review, CI checks, preview QA, and explicit approval before merge or database application.

## Safety boundary

This audit is documentation only. It does not apply migrations, change live authorization, modify production data, merge the draft PR, or deploy to production. The People & Access Centre remains explicitly staged until the blockers above are closed.
