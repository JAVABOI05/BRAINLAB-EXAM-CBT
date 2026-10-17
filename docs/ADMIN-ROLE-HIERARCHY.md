# BrainLab Academy administrator role hierarchy

**Status:** implementation is committed to the review branch; the database migration has **not** been applied to staging or production. Do not merge or deploy this branch until the migration has been reviewed and staging regression checks pass.

## Design rules

- One Supabase Auth identity system for learners and authorised operators.
- Admin access is granted only by a trusted Super Admin; public registration never assigns a role.
- The role is read from `public.admin_profiles` using a database function. Browser storage is not an authorization source.
- Every data permission must be enforced by Supabase RLS or a narrowly scoped database RPC, not only by hiding dashboard links.
- Role assignment/removal is performed by Super Admin-only database functions and writes an audit event.
- The last Super Admin cannot be demoted or removed. An administrator cannot change or remove their own role through these RPCs.
- Unknown permission keys default to denied for every non-super-admin role.
- The private route gate is defense in depth, not the permission boundary.

## Roles

| Role key | Display name | Intended capability |
| --- | --- | --- |
| `super_admin` | Super Admin | Platform governance, security ownership and administrator role management. |
| `platform_admin` | Platform Administrator | Broad day-to-day operations; cannot manage admin roles or security settings. |
| `cbt_admin` | CBT & Examination Administrator | Question bank, permitted exam configuration, access codes, sessions and results. |
| `ai_learning_admin` | AI & Learning Administrator | AI learning content, Learning Lab materials and AI quality review. |
| `community_moderator` | Community & Student Support Moderator | Community safety and scoped support. |
| `analytics_admin` | Analytics & Institutional Reporting | Aggregate analytics and audit review; no direct raw learner-result access. |
| `school_admin` | School Administrator | Institution management and approved cohort reports. |
| `teacher` | Teacher / Instructor | Assigned learning activities and scoped learner support. |
| `content_reviewer` | Content Reviewer | Review learning resources and AI content quality. |
| `finance_admin` | Finance Administrator | Billing and subscriptions when that feature is implemented. |
| `read_only_auditor` | Read-only Auditor | Audit and aggregate reporting without write permissions. |

School- and teacher-scoped data permissions are not yet enforceable because institution/classroom relationships are not implemented in the inspected schema. Those roles must not be given direct access to global learner records until scoped tables and policies exist.

## Implemented in this branch

- Added a central TypeScript role/permission catalogue.
- Updated admin session verification to validate the user through Supabase Auth and retrieve the database-backed role; removed dashboard reliance on `localStorage.admin_user`.
- Made the dashboard load only the summary datasets allowed by the current permission checks and conditionally show privileged navigation.
- Added a Super Admin-only administrator management page. It lists existing admin profiles and can assign or remove roles by Supabase Auth user UUID. It does not create Auth accounts.
- Added capability checks to content, moderation, analytics and security placeholder routes.
- Added `supabase/migrations/20261017103000_admin_role_hierarchy.sql`, which expands the role constraint, defines permission/role RPCs, records role changes in `audit_logs`, and replaces the existing broad admin-only RLS policies on the inspected CBT tables with role-aware command policies.

## Migration and rollout safety

1. Review the migration against the exact target schema. Production and staging have known schema/history differences; do not assume the migration applies cleanly to both.
2. Apply to **staging only** after approval and schema reconciliation. This has not been done by this change.
3. Verify the current Super Admin profiles before applying the migration. Existing `admin` profiles are mapped to `platform_admin`; existing `super_admin` profiles remain unchanged.
4. Verify every policy and any additional candidate/public policies. This migration only replaces the named admin policies; it does not claim to remediate every previously reported anonymous/public policy, legacy RPC, answer-key exposure, or service credential risk.
5. Test all admin pages and candidate flows against staging. In particular, the role migration intentionally prevents specialised roles from using destructive operations previously covered by broad `admin_all` policies.
6. Only after successful staging tests and explicit approval should a separate production rollout be planned. Do not auto-apply this migration from Vercel or GitHub Actions.

## Required staging test matrix

- Unauthenticated user: cannot read admin profiles, protected exam configuration, answers, results, access codes or admin logs.
- Learner: cannot call role management RPCs or access admin data.
- CBT Admin: can perform only the intended question/configuration/code/session/result operations; cannot change roles or delete results/answers.
- AI/Learning Admin: has no direct access to CBT answer keys or access codes.
- Community Moderator: cannot read exam answers, results or access codes.
- Analytics Admin: can read permitted reports but cannot mutate or delete results.
- Read-only Auditor: can read permitted audit/aggregate data and cannot write.
- Platform Admin: can perform operational actions but cannot manage roles or security settings.
- Super Admin: can assign/remove roles; role changes appear in audit logs; last Super Admin and self-demotion safeguards work.
- Existing candidate flows: sign-in, exam start/resume, timer, answer saving, submission, scoring, result release and corrections all still work.
- Confirm RLS behavior using direct API/RPC attempts, not only the UI.

## Known follow-up security work

- Audit all remaining public/anonymous policies and legacy RPC grants against production's actual schema.
- Move client-originated audit logging to trusted server/database operations where necessary; client-supplied audit details are not inherently trustworthy.
- Enforce admin MFA/AAL2 after enrolling and testing recovery for all existing privileged accounts.
- Add school/classroom-scoped policies before enabling school-admin/teacher access to personal learner records.
- Add automated tests for each permission and unauthorized direct API access.
