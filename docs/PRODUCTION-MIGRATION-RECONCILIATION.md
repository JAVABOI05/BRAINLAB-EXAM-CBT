# Production migration reconciliation — 2026-10-18

## Why the Learning Hub schema is not deployed to production yet

The connected production Supabase project is bupkyppvtkrmzmluzjmf and contains existing CBT data. A read-only count returned 5,625 question rows, 43 result rows, 7,580 answer rows, and 179 exam-session rows. The new Learning Hub migrations have **not** been applied to that project.

Production's Supabase migration history contains these 14 legacy versions:

- 20261016175421_revoke_unauthenticated_privileged_exam_rpcs
- 20261016175446_restrict_master_code_trigger_function_rpc
- 20261016175534_harden_legacy_access_code_validation
- 20261016180630_restrict_legacy_security_definer_views
- 20261016180706_restrict_legacy_admin_rpc_execution
- 20261016180736_pin_legacy_function_search_paths
- 20261016180808_revoke_legacy_client_destructive_table_privileges
- 20261016181159_restrict_sensitive_legacy_table_reads
- 20261016181212_restrict_sensitive_candidate_and_audit_reads
- 20261016215115_phase0_02a_drop_broken_result_trigger
- 20261016215209_phase0_02_stage_a_additive_server_side_exam
- 20261017010441_phase0_02b_merge_save_progress_drop_unique_user_subject
- 20261017203401_phase0_interim_lockdown_public_writes
- 20261017204002_phase0_interim_lockdown_results_answers_updates

Those exact legacy migration files are not present in the current repository branch (nor on the checked main branch), so the repository cannot currently reproduce or reconcile the production migration baseline. Staging has a different legacy baseline plus the new Learning Hub migrations. Do not assume that matching table/function names prove identical schemas or grants.

## What was changed in production during this work

Only the search paths on three legacy helper functions were pinned, without changing their bodies or data:

- public._clean_answers(jsonb,bigint[])
- public._seconds_left(timestamptz)
- public._err(text,text)

The operation was applied directly because it is an idempotent, body-preserving hardening. It is tracked in 20261018145107_pin_remaining_legacy_helper_search_paths.sql so the next migration deployment repeats it safely. The new Learning Hub schema, media bucket, assessment RPCs, and access-code features have not been deployed to production.

## Required release preparation

1. Reconcile the missing 14 legacy migration files against the production schema and the current migration history. Recover the original SQL from the source that applied them, or produce a reviewed baseline/snapshot; do not create fake empty migration files.
2. Use Supabase CLI against the explicitly verified production project to confirm local/remote migration history before applying the new migration chain. Do not use the staging project ref for a production deployment.
3. Review the full diff and apply the new migrations in filename order, with a database backup and a tested rollback/recovery plan.
4. Verify the production app's Supabase project URL matches the intended project and the new application build is deployed only after its schema exists.
5. Run the legacy CBT regression suite plus Learning Hub, Self Practice, organisation assessment, access-code, admin-permission, and media tests.
6. Enable Supabase Auth leaked-password protection in the dashboard if supported by the project's plan; the connected Supabase tool does not expose this Auth setting.

## Current status

- Staging feature schema and application changes: implemented.
- Transactional staging RPC smoke tests: passed for Self Practice, organised assessment start/save/resume/submit, result release, cross-endpoint isolation, and permanent account-bound access codes. Test rows were rolled back.
- Browser-based end-to-end tests: still required.
- Latest application CI: one workflow passed ESLint, TypeScript, and Next.js build; a second workflow is running for the latest docs update.
- Vercel preview: recent requests are blocked by the project's build-rate limit; an earlier preview succeeded.
- Production feature-schema deployment: blocked on migration-history reconciliation, not on user authorization.
