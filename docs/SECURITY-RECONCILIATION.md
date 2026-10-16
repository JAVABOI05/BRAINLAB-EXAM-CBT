# CBT Security Reconciliation — Review Branch

**Status: SECURITY FLOW REWORKED; STAGING REGRESSION AND RELEASE REVIEW STILL REQUIRED. NOT APPROVED FOR MERGE OR DEPLOYMENT.**

This is a code and staging-schema review record, not a penetration-test report or a production safety certification.

## Changes now made on this branch

- `/exam` no longer reads the `questions` table directly or receives answer keys in its question payload. It starts/resumes attempts, saves progress, records tab switches, and submits answers through the typed RPC wrapper in `app/lib/examApi.ts`.
- Scoring and result creation are now expected to be performed by the database RPC, not computed or inserted by the browser.
- `/result` no longer inserts rows directly into `results` or `answers`, and no longer performs a phone-only direct table lookup. Lookup uses `lookup_result(p_phone, p_code)`.
- `/corrections` checks the current public result-release setting, requires a result summary from the server submission response, and no longer accepts the legacy `examResult` cache key.
- Admin login now stores a verified admin UI hint only after Supabase Auth and the `is_admin()` check succeed; logout clears that hint and signs out of Supabase Auth. The UI hint is not an authorization boundary—database RLS remains the enforcement layer.
- CI now runs ESLint, TypeScript, and the production build.

## Read-only staging verification

A read-only inspection of staging project `BrainLabCBT-Staging` (`eusgwsuoloomphebrepe`) confirmed that these RPCs exist with the argument names/types expected by the frontend wrappers:

- `get_public_settings()`
- `start_exam(p_code, p_name, p_phone, p_elective)`
- `resume_exam(p_session, p_token)`
- `save_progress(p_session, p_token, p_answers)`
- `record_tab_switch(p_session, p_token)`
- `submit_exam(p_session, p_token, p_answers, p_auto, p_flagged)`
- `lookup_result(p_phone, p_code)`

The inspected staging implementation builds question payloads without `correct_answer` or `explanation`. The result payload only includes review items and scores when the current `show_results` setting is true. Result lookup checks both phone and access code and calls a throttling helper. Internal helper functions used by the RPCs were not executable by `anon` or `authenticated` in the inspected privilege check. The inspected public tables had RLS enabled; table policies shown for questions, sessions, results, answers, settings, and access codes were admin-gated.

These are staging observations only. They do not prove that production has the same schema, function definitions, grants, or policies. No schema, data, or settings were changed during this inspection.

## Remaining blockers

- Complete functional staging tests for valid/invalid access codes, start/resume after reload, progress save, timeout, duplicate submit, result release off/on, candidate isolation, and admin/non-admin access.
- Verify the live staging result-release toggle behaves correctly during an already-submitted attempt, not just at page load.
- Audit all `/admin/**` UI paths and each database mutation for server-enforced authorization; client redirects are not a security boundary.
- Review the remaining lint warnings and dependency audit findings; do not run `npm audit fix --force` or change major versions blindly.
- Reconcile the review branch with the founder's local `feature/brand-ui-upgrade` changes without overwriting either working tree.
- Record rollback and deployment steps before any release.

## Release gates

1. Latest lint, TypeScript, and production-build checks must all pass on the current branch head.
2. The full staging CBT regression checklist must pass using test candidates only.
3. Production schema, policies, and RPC signatures must be separately reviewed without applying changes as part of this work.
4. The founder must explicitly approve any merge or production deployment.

## Operational boundary

No production database, schema, DNS, merge, or deployment action is authorized. This branch remains a review build.


## Additional staging advisor review (read-only)

The Supabase security advisor reported the following items in staging on 2026-10-16:

- **RLS enabled with no policy (INFO):** `access_attempts`, `admin_profiles`, `admin_users`, and `phase0_backup`. Direct client access is therefore blocked by default. This appears intentional for sensitive/internal tables, but should be confirmed against the intended access model rather than adding broad policies just to silence the notice. The legacy `admin_users` table includes a `password` column; its contents were not read. Confirm whether any legacy credentials remain and plan retirement only through an approved migration.
- **Mutable search path (WARN):** 14 functions were reported, including small internal helpers (`_err`, `_clean_answers`, `_seconds_left`) and legacy functions. Several legacy functions were not executable by `anon` or `authenticated` in the privilege check. Review the complete function list before preparing a migration; do not change grants blindly.
- **Publicly executable SECURITY DEFINER functions (WARN):** the exam RPCs, access-code validation, public settings, leaderboard, and result lookup are callable by anonymous users. This is expected for parts of the candidate flow, but each public function must remain narrowly scoped, rate-limited where appropriate, and safe for untrusted input. Admin mutation functions inspected use `_require_admin()`, which checks `is_admin()`; this still needs a dedicated non-admin regression test.
- **Leaked-password protection (WARN):** Supabase Auth leaked-password protection is disabled in staging. This is a dashboard/auth configuration item, not changed by this repository branch.

No advisor remediation or database changes were applied. Production has not been inspected or changed as part of this check.

## Latest code quality check

GitHub Actions run [38908932276](https://github.com/brainlabtutorials-gif/BRAINLAB-EXAM-CBT/actions/runs/38908932276) passed ESLint, TypeScript, and the production build for commit `bf45d28bc047a63bc70b396136a3700b085ad6c5`. Later documentation-only changes will trigger CI again; the current branch head must still be checked before release.
