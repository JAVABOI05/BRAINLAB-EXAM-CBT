# CBT Security Reconciliation — Review Branch

**Current status (2026-10-18): application build passed on the latest reviewed head in one CI workflow; the second workflow is still running. Staging contains the Learning Hub/assessment changes. End-to-end regression and production migration reconciliation remain release gates. Keep PR #10 in draft.**

This is a code and staging-schema review record, not a penetration-test report or a production safety certification.

## Current release state — 2026-10-18

- Staging project BrainLabCBT-Staging has 26 recorded migrations, including the Learning Hub schema, self-practice engine, organisation/competition assessments, account-bound access codes, admin results/entitlement controls, question media, and RLS/grant hardening.
- The review branch adds learner routes for Learning Hub, Self Practice, organised assessments, and access-code redemption; admin routes for content, assessment configuration, access-code/entitlement control, and assessment results; and Supabase Auth/permission guards for legacy admin pages.
- One GitHub CI workflow passed ESLint, TypeScript, and the Next.js production build on the latest reviewed head. A second CI workflow is still running. Vercel preview creation is currently rate-limited; a prior preview build succeeded.
- Production project bupkyppvtkrmzmluzjmf retains the existing CBT data. No Learning Hub schema migrations have been applied there. On 2026-10-18, the three legacy helper functions _clean_answers(jsonb,bigint[]), _seconds_left(timestamptz), and _err(text,text) had their search paths pinned without changing their bodies; the idempotent tracked migration is 20261018145107_pin_remaining_legacy_helper_search_paths.sql.
- Production migration history contains legacy versions that are not all represented by tracked migration files in this repository. Reconcile that baseline before using Supabase CLI to deploy the new migration chain. Do not point production at the staging project.
- Supabase Auth leaked-password protection remains disabled in both environments. The connected Supabase toolset cannot change this Auth dashboard setting; enable it in the dashboard if the project plan supports it.


## Changes now made on this branch

- `/exam` no longer reads the `questions` table directly or receives answer keys in its question payload. It starts/resumes attempts, saves progress, records tab switches, and submits answers through the typed RPC wrapper in `app/lib/examApi.ts`.
- Scoring and result creation are now expected to be performed by the database RPC, not computed or inserted by the browser.
- `/result` no longer inserts rows directly into `results` or `answers`, and no longer performs a phone-only direct table lookup. Lookup uses `lookup_result(p_phone, p_code)`.
- `/corrections` checks the current public result-release setting, requires a result summary from the server submission response, and no longer accepts the legacy `examResult` cache key.
- Admin login now stores a verified admin UI hint only after Supabase Auth and the `is_admin()` check succeed; logout clears that hint and signs out of Supabase Auth. The UI hint is not an authorization boundary—database RLS remains the enforcement layer.
- CI now runs ESLint, TypeScript, and the production build.

## Staging verification and migration application

A read-only inspection of staging project `BrainLabCBT-Staging` (`eusgwsuoloomphebrepe`) confirmed that these RPCs exist with the argument names/types expected by the frontend wrappers:

- `get_public_settings()`
- `start_exam(p_code, p_name, p_phone, p_elective)`
- `resume_exam(p_session, p_token)`
- `save_progress(p_session, p_token, p_answers)`
- `record_tab_switch(p_session, p_token)`
- `submit_exam(p_session, p_token, p_answers, p_auto, p_flagged)`
- `lookup_result(p_phone, p_code)`

The inspected staging implementation builds question payloads without `correct_answer` or `explanation`. The result payload only includes review items and scores when the current `show_results` setting is true. Result lookup checks both phone and access code and calls a throttling helper. Internal helper functions used by the RPCs were not executable by `anon` or `authenticated` in the inspected privilege check. The inspected public tables had RLS enabled; table policies shown for questions, sessions, results, answers, settings, and access codes were admin-gated.

These initial observations were read-only and do not prove that production has the same schema, function definitions, grants, or policies. On 2026-10-18, four reviewed migrations were subsequently applied to the staging project only: `admin_role_hierarchy`, `learning_hub_foundation`, `learning_question_validation`, and `learning_assessment_atomicity`. The staging migration history now records versions `20261018135606`, `20261018135609`, `20261018135611`, `20261018135614`, `20261018135937`, and `20261018140105` respectively. The migration files on this review branch were renamed/added to match those applied versions; production was not changed.

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

No production feature-schema migration, DNS change, merge, or deployment has been performed. The narrowly scoped legacy helper search-path hardening described above was applied to production and is tracked in the repository. This branch remains a review build.


## Staging advisor review after migration application

The Supabase security advisor reported the following items in staging on 2026-10-16:

- **RLS enabled with no policy (INFO):** `access_attempts`, `admin_profiles`, `admin_users`, and `phase0_backup`. Direct client access is therefore blocked by default. This appears intentional for sensitive/internal tables, but should be confirmed against the intended access model rather than adding broad policies just to silence the notice. The legacy `admin_users` table includes a `password` column; its contents were not read. Confirm whether any legacy credentials remain and plan retirement only through an approved migration.
- **Mutable search path (WARN):** 14 functions were reported, including small internal helpers (`_err`, `_clean_answers`, `_seconds_left`) and legacy functions. Several legacy functions were not executable by `anon` or `authenticated` in the privilege check. Review the complete function list before preparing a migration; do not change grants blindly.
- **Publicly executable SECURITY DEFINER functions (WARN):** the exam RPCs, access-code validation, public settings, leaderboard, and result lookup are callable by anonymous users. This is expected for parts of the candidate flow, but each public function must remain narrowly scoped, rate-limited where appropriate, and safe for untrusted input. Admin mutation functions inspected use `_require_admin()`, which checks `is_admin()`; this still needs a dedicated non-admin regression test.
- **Leaked-password protection (WARN):** Supabase Auth leaked-password protection is disabled in staging. This is a dashboard/auth configuration item, not changed by this repository branch.

Advisor findings were reviewed but not blindly suppressed. The schema migrations listed above were applied to staging; no production database, schema, Auth settings, or deployment was changed. After migration, advisors still report legacy mutable-search-path functions and publicly executable SECURITY DEFINER functions, including candidate-facing RPCs that may be intentionally public and must be reviewed individually. The initial unindexed foreign-key findings for the new Learning Hub tables were addressed with the tracked additive migration `20261018135937_learning_hub_foreign_key_indexes.sql`. The performance advisor no longer reports unindexed foreign keys, but it does report duplicate-index warnings and unused-index notices; review those against real query plans and workload before dropping anything.

## Latest code quality check

GitHub Actions run [38908932276](https://github.com/brainlabtutorials-gif/BRAINLAB-EXAM-CBT/actions/runs/38908932276) passed ESLint, TypeScript, and the production build for commit `bf45d28bc047a63bc70b396136a3700b085ad6c5`. Later documentation-only changes will trigger CI again; the current branch head must still be checked before release.


## Follow-up route audit — 2026-10-16

A source review of the current admin route files found that the legacy `/admin` page duplicated settings reads and writes without checking the Supabase Auth session in its UI. It has now been reduced to a redirect to `/admin/dashboard`, avoiding a second admin settings surface. This is defense-in-depth and UX cleanup, not the security boundary; database RLS and admin-gated RPCs must continue to deny unauthorized reads and writes.

The other inspected admin pages use a localStorage `admin_user` hint for UI routing. That value is forgeable and must never be treated as authorization. The staging review observed admin-gated policies on the relevant tables and `_require_admin()` checks in inspected admin mutation RPCs, but a dedicated non-admin regression test and route-by-route review of every direct table mutation remain release blockers. Several routes still issue direct client table mutations, so their RLS policy coverage must be explicitly confirmed against the staging schema before release. The code audit alone does not establish that every route or database operation is secure.

The current review branch CI must pass on the latest head after these changes. The preview deployment status is separate from GitHub Actions and is not approval to deploy or merge.


## Result-release toggle behavior — source-level blocker

A frontend source review confirms that `/result` gates the page using the live `get_public_settings().show_results` value and only renders a locally cached `exam_summary` when that summary says `show_results: true`. `/corrections` also checks the live setting, then reads review items from localStorage key `exam_result`. The inspected staging `_result_payload` only includes scores/review items when results are enabled, while the current `lookup_result(p_phone, p_code)` response is summary-only.

Therefore the important scenario “candidate submits while results are hidden, then an admin enables results later” is **not proven to work**: the later lookup path does not currently provide the detailed review payload needed by corrections, and the local cache may contain no review items from the original submission. This must be resolved and tested before release, likely by a narrowly scoped, throttled server RPC that retrieves a candidate's released result/review using the required identity/access-code proof. Do not add a frontend call to a function that has not been deployed and verified in staging; do not apply a migration without explicit approval.


## Private operator console entry gate — 2026-10-16

- The public site does not expose a console link in the Academy navigation or footer, and the sign-in UI now uses neutral “Private Platform Access” / “Secure Console Sign-In” wording.
- Added `proxy.ts` with a fail-closed gate driven by server-only `BRAINLAB_PRIVATE_ENTRY_PATH` and `BRAINLAB_PRIVATE_ENTRY_TOKEN` variables. The configured random single-segment path rewrites internally to the existing sign-in page and sets an HttpOnly, SameSite=Lax cookie scoped to `/admin`. Direct `/admin/**` requests without that gate cookie return 404. Responses are marked noindex and no-store.
- No secret path or token is committed. The environment values must be generated and configured separately in the hosting environment; until both are valid, the console is intentionally unavailable. See [Private Console Access](./PRIVATE-CONSOLE-ACCESS.md).
- This is only defense-in-depth against casual discovery. It does not replace Supabase Auth, server-side admin authorization, or RLS. Route-by-route mutation checks and staging non-admin tests remain release blockers.
- No database, Auth settings, DNS, production deployment, or merge action was performed.


## Follow-up production privilege verification — 2026-10-16

This is a fresh read-only catalog/grant/policy check. The production migration history currently lists these applied versions: `20261016175421_revoke_unauthenticated_privileged_exam_rpcs`, `20261016175446_restrict_master_code_trigger_function_rpc`, and `20261016175534_harden_legacy_access_code_validation`. This observed migration history supersedes earlier status wording that said no production migration had been applied; it does not establish who applied them or prove that all exposure is contained.

- Effective privilege checks now show `anon` and `authenticated` cannot execute `clear_all_results()`, `set_master_access_code(text)`, or `protect_master_code_from_being_used()`.
- This is **partial containment only**. The legacy `reset_exam_config()` and `update_exam_config(text,jsonb)` functions remain executable by `anon` and `authenticated`; several legacy access-code management functions are also executable by those roles, including `validate_and_use_access_code(text,text,text)` which is `SECURITY DEFINER`.
- Effective grants and RLS policy inspection still shows broad anonymous/public access on sensitive legacy objects, including `access_codes`, `admin_users`, `answers`, `audit_logs`, `exam_config`, `exam_sessions`, `questions`, `results`, `settings`, and summary views. Examples include public read policies with `USING (true)`, public update policies with `USING (true)` / `WITH CHECK (true)`, and an `ALL` policy on results. The database role has table privileges; RLS policies remain the effective row filter and several policies are permissive.
- The new candidate-facing RPCs used by the review-branch frontend are still absent from the production function catalog; they were found in staging. Do not point the upgrade branch at production or merge/deploy it until the schema/API contract and admin workflows are reconciled.

**Action boundary:** no SQL or schema changes were made during this follow-up inspection. Because the remaining policies affect live CBT operations, do not apply blanket revokes or replace policies without a reviewed, staged containment plan and a tested admin fallback. Treat the residual exposure as urgent; these catalog findings indicate risk, not proof of exploitation.


## Follow-up staging RPC and admin-access audit — 2026-10-16

Read-only inspection of staging project `BrainLabCBT-Staging` (`eusgwsuoloomphebrepe`); no rows, settings, grants, schema, or Auth configuration were changed.

### Admin access recovery signal

- Staging has one `admin_profiles` row linked to an existing Supabase Auth user, and the profile email matches that Auth user. Identifiers and emails were intentionally not returned.
- `admin_profiles` and legacy `admin_users` have RLS enabled, no direct policies, and no table ACL for `authenticated`; that is fail-closed for direct browser table access.
- Core admin tables (`access_codes`, `answers`, `exam_config`, `exam_sessions`, `questions`, `results`, `settings`) have RLS enabled and an `admin_all` policy limited to `authenticated` with `is_admin()` in both `USING` and `WITH CHECK`.
- This establishes that a staged admin profile is mapped, not that its owner can currently sign in. A real sign-in and a negative test with an ordinary account still require an interactive test session; no credentials were read or changed.

### Candidate RPC contract

The seven RPC signatures used by `app/lib/examApi.ts` match staging: `get_public_settings()`, `check_access_code(p_code text, p_phone text)`, `start_exam(p_code text, p_name text, p_phone text, p_elective text)`, `resume_exam(p_session uuid, p_token uuid)`, `save_progress(p_session uuid, p_token uuid, p_answers jsonb)`, `record_tab_switch(p_session uuid, p_token uuid)`, `submit_exam(p_session uuid, p_token uuid, p_answers jsonb, p_auto boolean, p_flagged jsonb)`, and `lookup_result(p_phone text, p_code text)`. The server-side paper payload omits `correct_answer` and `explanation`; the grading function reads the answer key on the database side.

### Confirmed result-release gap

- The staging `_result_payload` includes scores and correction items only when `show_results` is true. That payload is returned from submission/resume.
- `lookup_result(p_phone, p_code)` currently returns only a summary (name, subject, score, total, timestamp), not detailed correction items.
- Consequently, a candidate who submits while results are hidden cannot be relied on to receive the detailed review later simply by enabling results and using the lookup path. The frontend's corrections page relies on cached review items, so this scenario remains a release blocker. Resolve through a reviewed, staged API/migration change and test hidden-at-submit → release-later behavior before release.

### Legacy access-code endpoint still callable

- Staging still grants `anon` and `authenticated` EXECUTE on `validate_and_use_access_code(text,text,text)`, a `SECURITY DEFINER` legacy function. Its inspected body consumes access codes and has a master-code success path, but does not use the newer attempt-throttling helper or check the exam-enabled setting.
- The new frontend uses `check_access_code` and `start_exam`, not this legacy endpoint. Do not revoke it blindly until every deployed client/caller is inventoried; include it in the staged legacy API containment plan and verify production separately.
- The staging security advisor also reports 14 functions with mutable search paths and 12 publicly executable `SECURITY DEFINER` functions. Public candidate RPCs may be intentional, but each must be reviewed for input validation, throttling, data minimization, and authorization. The advisor's search-path list includes legacy functions; current candidate RPCs inspected here set `search_path = public, pg_temp`.

### Migration-history reconciliation

The staging migration history initially showed only `20261016175526_harden_legacy_access_code_validation` despite the legacy exam RPCs already existing. After the reviewed Learning Hub migration sequence was applied, staging records that legacy migration plus `20261018135606_admin_role_hierarchy`, `20261018135609_learning_hub_foundation`, `20261018135611_learning_question_validation`, and `20261018135614_learning_assessment_atomicity`. The corresponding filenames on this review branch now use those same versions. Production has a separate migration history and has not received these Learning Hub migrations. This reconciles the new staging migration sequence, but does not prove the older legacy schema was originally created from tracked migrations.

### Next test gate

Still required in staging with designated test identities only: valid/invalid access-code tests; start/resume after reload; autosave; timeout; duplicate submission; results hidden then released; wrong phone/code; cross-candidate lookup denial; valid-admin and ordinary-user route/RPC checks; and every admin mutation tested as a non-admin. This read-only catalog pass does not substitute for those functional tests.
