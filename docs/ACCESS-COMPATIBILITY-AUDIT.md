# Centralized Access Management — Compatibility Audit

**Status:** In progress; discovery only.  
**Branch:** `feature/centralized-access-management`  
**Safety:** No database migrations applied. No production changes. No role-resolution cutover.

## 1. Existing contracts that must remain stable during the first phase

The existing application is not using one centralized authorization path. It currently depends on several overlapping contracts:

- `get_admin_role()` supplies a single role string to browser and server code.
- `admin_has_permission(text)` is consumed by database policies and server-side operations.
- `admin_profiles.role` is read directly by several API routes.
- `resolveAdminRole()` falls back across `admin_profiles` and legacy `admin_users`.
- `ADMIN_ROLES`, `isInstructorRole()`, `isGovernanceAdminRole()`, and direct equality checks encode role assumptions in TypeScript.
- Student subscription entitlements have a separate administrator/VIP bypass and must not be coupled to arbitrary staff permissions.

The staged access tables and RPCs intentionally do not replace any of these contracts yet.

## 2. Compatibility surfaces identified

### A. Identity, sessions and routing

Files and consumers identified include:

- `app/lib/adminAuth.ts`: browser session resolution, request-scoped resolution, and fixed `ADMIN_ROLES` validation.
- `app/lib/supabaseServer.ts`: `resolveAdminRole()` reads legacy profile tables and may return role strings not present in the TypeScript union.
- `app/api/auth/operator-gate/route.ts`: operator gate currently relies on the legacy role RPC returning a non-empty role.
- `app/lib/adminRoles.ts`: fixed role catalogue, instructor shortcuts, permission catalogue, and client-side permission cache.

**Compatibility requirement:** retain a stable legacy primary-role projection while introducing a separate multi-role access context. A custom role must not be forced into `AdminRole` or passed through legacy role equality checks.

### B. Direct role checks in APIs and UI

Search results identified direct role checks in, among others:

- `app/api/assignments/grade/route.ts`
- `app/api/classroom/polls/route.ts`
- `app/api/audio/upload/route.ts`
- `app/api/competition/emergency-controls/route.ts`
- `app/dashboard/page.tsx`
- `app/api/stem/attempts/[id]/grade/route.ts`
- Classroom class start/end and classroom token routes.

Some routes distinguish `teacher`, `competition_host`, `competition_moderator`, `competition_admin`, and `platform_admin` using hard-coded lists. A blanket replacement with “has any custom permission” would change business rules and could grant inappropriate access.

**Compatibility requirement:** classify each route by action and resource scope, then migrate it to an explicit permission guard. Preserve owner, tutor approval, class membership, competition assignment and moderator constraints independently of role permissions.

### C. Database RLS and RPCs

`admin_has_permission(text)` is referenced by existing RLS policies and privileged RPCs across CBT, access codes, notifications, question media, Learning Hub and tutor profile operations.

**Compatibility requirement:** do not alter the function's meaning until every dependent policy and RPC has a verified permission mapping. Custom role permissions must be enforced in the database, not only in navigation or React components. Scope-aware policies must use the resource being accessed (e.g. assigned class, institution, competition or content owner).

### D. Student subscription entitlements

The prior `isCurrentUserAdmin()` and `isCurrentUserSuperAdmin()` helpers accepted Auth metadata and browser storage as evidence of administrator status. That was unsafe because user metadata and local browser storage are not authoritative authorization sources.

The feature branch now changes these helpers to:
- use `get_admin_role()` for the signed-in browser caller;
- use server-side `resolveAdminRole()` for an explicit target user on the server;
- reject cross-user browser checks;
- never accept user-editable metadata, localStorage, sessionStorage or the Admin PIN UI state as proof of administrator status.

This keeps the learner subscription system separate from custom staff permissions and removes a client-controlled route to the VIP bypass. The new helper behavior must be regression-tested against payment initialization, tier-gate UI, corrections, classroom, competition registration and upgrade nudges.

## 3. New staged access model

The current feature branch adds four access tables and Super Admin-checked RPCs for:
- searching registered accounts by name/email;
- listing system and custom roles;
- creating, editing and retiring custom roles;
- assigning and revoking multiple roles with optional expiry and JSON resource scope;
- listing the caller's own staged session context.

The new tables are RPC-only for clients: RLS is enabled, direct table grants are revoked, and the hardened migration grants authenticated execution only on the narrowly scoped RPCs. The RPCs retain internal Super Admin checks where administrative actions are involved.

The role catalogue remains staged. Assignments do not currently authorize dashboards, APIs, or database rows.

## 4. Migration and test gates before activation

Do not apply migrations or activate custom roles until all of the following are complete:

1. Reconcile the permission seed with the **effective** database `admin_has_permission()` implementation and TypeScript permission catalogue, including the later instructor/Arena/STEM updates.
2. Produce a complete call-site inventory for `get_admin_role()`, `admin_has_permission()`, `resolveAdminRole()`, direct `admin_profiles` reads, fixed role arrays and role equality checks.
3. Define the compatibility projection for legacy single-role consumers and the policy for multiple simultaneous roles.
4. Implement scope-aware server guards and matching RLS policy helpers for each module.
5. Keep tutor profile approval, tutor subject/class memberships, student identity and subscription entitlements as independent data domains.
6. Add tests for expired/revoked assignments, multiple roles, role retirement, self-assignment prevention, protected governance permissions, Super Admin preservation, cross-user lookups, and custom-role scope boundaries.
7. Apply migrations only to the designated staging database after explicit approval; verify function ownership, RLS, grants and audit events there.
8. Run type checks, build, route-level authorization tests and preview smoke tests before any production approval.

## 5. Known non-goals for this phase

- No production migration or data rewrite.
- No replacement of `get_admin_role()` or `admin_has_permission()`.
- No automatic promotion of a tutor profile into staff access.
- No automatic conversion of student subscriptions into staff permissions.
- No assumption that storing a JSON resource scope enforces that scope.
- No custom role may receive Super Admin/root governance capabilities.
