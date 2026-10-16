# BrainLab Academy — Supabase database remediation plan

**Status: design and read-only audit guidance only. No SQL in this document has been run. No migration is approved.**

This plan is based on the read-only inspection of the staging project `BrainLabCBT-Staging` (`eusgwsuoloomphebrepe`) on 2026-10-16 and the repository's current security reconciliation notes. Staging findings must not be assumed to describe production. Before any schema change, inspect the target environment and the migration history independently.

## Goals and non-negotiable boundaries

- Preserve the current CBT lifecycle: access-code validation, candidate identity, exam start/resume, timing, answer saving, submission, scoring, result release and corrections.
- Keep answer keys, explanations, attempt tokens, private candidate records and admin data out of public reads.
- Do not add broad RLS policies merely to silence advisor notices.
- Do not revoke anonymous access to candidate-facing RPCs indiscriminately; review each function's intended caller and behavior first.
- Do not drop indexes just because an advisor calls them duplicate or unused.
- Do not copy, migrate or expose the legacy `admin_users.password` field. Establish whether legacy credentials exist and whether the field is obsolete without reading password values.
- Do not apply migrations to production as part of this work. Production changes require a reviewed migration, backup/rollback plan, staging proof and explicit approval.

## Prioritized remediation queue

### P0 — establish the actual schema and deployment baseline

Before writing executable migrations, capture and review:

1. Current migration files and their order/checksums from the repository and target Supabase project.
2. Tables, columns, types, defaults, generated columns, constraints and foreign keys.
3. RLS enablement, every policy and policy command/role/expression.
4. Function definitions, owners, `SECURITY DEFINER`, configured `search_path`, execute grants and call chains.
5. Grants for `anon`, `authenticated` and service roles; triggers; extensions; views; storage policies if used.
6. Existing foreign keys and indexes, including exact indexed columns, predicates, uniqueness and constraint ownership.
7. CBT regression behavior in staging with dedicated test candidates.

**Gate:** no new tables or migrations until the above inventory is checked against the actual target. The repository branch currently does not provide a confirmed, complete Supabase migration history in the paths inspected so far.

### P1 — secure existing CBT tables and RPCs

Staging has RLS enabled on the inspected public tables. Advisor notices report RLS-enabled tables without policies: `access_attempts`, `admin_profiles`, `admin_users` and `phase0_backup`. That may be appropriate for internal tables; confirm intended access before changing anything. No policy should permit ordinary candidates to read other candidates' records or internal admin/backup data.

Review the following sensitive data groups:
- `questions`: correct answers and explanations must not be returned before allowed review.
- `answers`: selected/correct answers and correctness data are private result material.
- `results`: lookup must require the intended proof (currently phone plus access code in the inspected RPC) and must respect result-release settings.
- `exam_sessions`: access tokens, access codes, draft answers and timing/deadline data require narrow access.
- `access_codes` and `access_attempts`: brute-force protection, throttling, single-use rules and auditability.
- `admin_profiles` / `admin_users`: admin role must be established server-side; a localStorage flag or hidden route is not authorization.
- `audit_logs`: append/read access must be limited to trusted server-side operations and authorized reviewers.

Staging inspection found candidate-facing RPC signatures expected by the current frontend: `get_public_settings()`, `start_exam(p_code, p_name, p_phone, p_elective)`, `resume_exam(p_session, p_token)`, `save_progress(p_session, p_token, p_answers)`, `record_tab_switch(p_session, p_token)`, `submit_exam(p_session, p_token, p_answers, p_auto, p_flagged)` and `lookup_result(p_phone, p_code)`. Verify actual definitions and grants before touching them.

For each `SECURITY DEFINER` function:
- State the exact intended caller: public candidate, authenticated learner, or admin only.
- Validate every input and bound array/JSON sizes.
- Validate session/token ownership and current attempt state inside the database transaction.
- Make duplicate submissions idempotent and reject stale/expired attempts according to the existing contract.
- Use a safe, fixed `search_path` (for example `SET search_path = ''`) and schema-qualify referenced objects where appropriate.
- Grant `EXECUTE` only to the intended roles; do not break the candidate flow while reducing exposure.
- Test anonymous, learner, different-learner and non-admin calls explicitly.

The staging advisor reported 14 functions with mutable search paths and public execution of several `SECURITY DEFINER` functions. Review each definition individually; do not generate a blanket grant/revoke migration.

### P2 — verify relational integrity and query indexes

Use the read-only inventory queries below first. For any proposed foreign key, find and resolve orphaned rows in a reviewed staging copy before adding it. Do not assume legacy rows can be deleted or automatically linked to accounts.

The staging performance advisor reported duplicate-index notices (including possible overlap on access-code, admin-email, answer-result, exam-session phone, question filter, result phone and settings key columns) and 23 unused-index notices. Staging may have low traffic, so an unused-index notice is not proof an index is unnecessary.

For each candidate index:
1. Compare the exact indexed expressions, column order, predicate, uniqueness, included columns and constraint dependency.
2. Check query patterns and query plans in a representative environment.
3. Consider write overhead and the cost of rebuilding the index.
4. Remove only a proven redundant non-constraint index in a separate reviewed migration, with a rollback plan.

Likely query patterns to evaluate (not assumed index prescriptions):
- candidate result lookup by phone and access code;
- session resume by session identifier and attempt token;
- active question selection by subject/section/status;
- answers grouped by result/session;
- access-code validation and unused-code administration;
- settings lookup by key.

### P3 — learner account linkage without breaking legacy CBT

The future Academy should link a candidate's existing exam history to an account only where identity can be established safely. Do not automatically match records by phone alone: phone numbers can be shared, changed or mistyped.

Preferred approach after schema review:
- Introduce a learner profile linked to `auth.users.id` only if the existing account model does not already provide this.
- If needed, add a nullable account UUID reference to eligible historical exam/result records in a separately reviewed migration; preserve rows that cannot be confidently linked.
- Keep exam submission and scoring server-authoritative.
- Expose a learner's own results through a narrowly scoped server-side query/RPC and verify ownership for every record.
- Backfill only with an auditable, reviewed matching rule and a dry-run report. Never expose bulk candidate data to the browser.

Do not create duplicate `profiles` or account-link tables until existing auth/profile tables and triggers are inventoried.

### P4 — new Academy data model, only when feature implementation is approved

Build the smallest useful schema per feature rather than creating all future tables at once.

**Revision planning (first account-synced feature):**
- `study_plans`: UUID primary key, owner user UUID, title/goal, optional target date, status, created/updated timestamps.
- `study_plan_items`: UUID primary key, plan foreign key, topic/subject label or a verified topic FK, sort order, due date, completion timestamp, created/updated timestamps.
- Constraints: owner required; non-negative sort order; valid status; plan deletion cascades to its own items only; dates/timestamps consistent.
- RLS: owner can select/insert/update/delete their own plan and items. An item policy must verify ownership through its parent plan. No public read policy.
- Index: child foreign key on plan ID; owner plus updated timestamp on plans if supported by real query patterns.
- Avoid foreign keys to unverified `subjects`/`topics` tables until those canonical tables exist.

The current revision planner is browser-local and does not need a database migration. Only implement this schema when account synchronization is being implemented and tested.

**Progress and content (later):** canonical `subjects`/`topics`, then courses/modules/lessons and learner progress, only when there is real content to store and a defined content publishing model. Separate public published content from draft/admin content.

**Community (later):** groups, memberships, discussions/replies, reports and moderation actions require membership checks, rate limits, reporting/moderation workflow, deletion/retention rules and clear privacy boundaries before launch. Private messages are a separate sensitive feature and should not be added as an incidental extension.

**AI features (later):** record only what is needed for safety, cost controls and user experience. Define retention, deletion, provider handling, consent, per-user quotas and sensitive-data redaction before storing prompts or responses. Never send answer keys or protected live exam content to an AI feature.

### P5 — Auth configuration and operations

The staging Auth advisor reported leaked-password protection disabled. Treat this as an Auth dashboard/configuration task: test signup, password change/reset and existing-user behavior in staging, then enable after review. Do not assume it is fixed by a database migration.

Add monitoring/runbooks for failed RPCs, access-code guessing, repeated result lookups and abnormal submission patterns without logging raw passwords, tokens or full sensitive answer payloads. Define log retention and who can read audit data.

## Read-only SQL inventory queries

Run these only in the intended Supabase SQL editor or another read-only connection. They inspect metadata and do not alter data. Review results for sensitive schema details before sharing them.

```sql
-- 1. Tables and RLS status in application schemas
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p')
  and n.nspname in ('public')
order by 1, 2;

-- 2. Columns and types (metadata only)
select table_schema, table_name, ordinal_position, column_name,
       data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;

-- 3. RLS policies
select schemaname, tablename, policyname, permissive,
       roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4. Foreign keys and their delete/update actions
select conrelid::regclass as table_name, conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f'
  and connamespace = 'public'::regnamespace
order by 1, 2;

-- 5. Index definitions; compare before considering changes
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 6. Function security metadata (definition review should be access-controlled)
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, arguments;

-- 7. Explicit function execute grants from ACLs
select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       coalesce(grantee.rolname, 'PUBLIC') as grantee,
       privilege_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
left join pg_roles grantee on grantee.oid = acl.grantee
where n.nspname = 'public'
  and acl.privilege_type = 'EXECUTE'
order by p.proname, arguments, grantee;
```

These queries are an initial inventory, not a complete security audit. In particular, review triggers, views, storage policies, extensions, grants on schemas/tables/sequences, Auth settings and all called helper functions too. The index catalog does not prove an index is unused; use advisor output and representative query plans.

## Required staging test matrix before schema changes are accepted

- Anonymous user cannot directly read protected questions, answer keys, other candidates' sessions, answers, results or admin records.
- Valid candidate can start, resume after reload, save progress and submit once.
- Invalid/reused access code and expired/foreign session token are rejected.
- Duplicate submissions do not create duplicate results or alter an already-finalized attempt.
- Results and corrections remain hidden when release is off and become available only through the intended proof when release is on.
- Candidate A cannot read Candidate B's result, plan or progress.
- Authenticated non-admin cannot invoke admin RPCs or mutate admin-only tables.
- Admin actions are authorized in the database/server, not merely by a client redirect or localStorage flag.
- Migration rollback is rehearsed in staging; exam data counts and key constraints are compared before/after.

## Approval sequence

1. Complete read-only schema/policy/function/index inventory for the intended environment.
2. Confirm whether the change already exists in migrations or code.
3. Write one small, reversible migration for one approved feature/fix.
4. Review SQL, RLS, grants, data effects and rollback.
5. Apply to staging only; run advisors and the complete affected CBT regression matrix.
6. Obtain explicit approval before any production migration or deployment.

**Current action:** this document only. No database connection was used to run SQL, and no table, index, policy, function, Auth setting or data was changed.


## Production read-only audit update — 2026-10-16

A direct read-only inspection was subsequently performed against the connected production project `BrainLabCBT` (`bupkyppvtkrmzmluzjmf`) as well as staging. This expands the scope of evidence: the production findings below are confirmed from current catalog metadata and advisor output, not inferred from staging. No database changes were made.

### Production findings requiring urgent remediation planning

The production `public` schema currently has RLS enabled on the inspected tables, but several policies grant broad access. The policy catalog included public/anonymous `USING (true)` or `WITH CHECK (true)` policies for:
- `results`: public read and write policies, including an all-operations policy.
- `answers`: public read and insert policies.
- `questions`: public read and insert policies.
- `exam_sessions`: public read, insert and update policies.
- `access_codes`: public read/update policies and an anonymous all-operations policy.
- `admin_users`: public read policy.
- `audit_logs` and `question_upload_logs`: public read/insert policies.
- `exam_config`: public update policy.
- `settings`: an anonymous all-operations policy is present in the advisor/catalog findings, alongside public read access.

Treat these as **critical exposure candidates** because the tables contain or may contain exam answer keys, learner results, session/token/access-code data and internal admin/audit information. Catalog metadata establishes that the policies exist; the exact effective exposure also depends on table grants, API exposure settings, view grants and function paths. The correct next step is to verify effective privileges and all application call sites, then replace direct table access with the minimum safe candidate/admin interface. Do not claim that data has been accessed by an attacker based on policy metadata alone.

Production advisor output also reports five public views flagged as security-definer views:
- `access_code_summary_view`
- `exam_config_view`
- `exam_session_summary_view`
- `subject_performance_view`
- `leaderboard_view`

The view definitions inspected show aggregate views over access codes, exam sessions and results; the leaderboard definition includes candidate name and phone. Before making any view invoker-secure or revoking access, verify which views the frontend/admin currently consumes, their grants and whether public leaderboard behavior is intended. A leaderboard should never expose phone numbers publicly. Prefer a purpose-built, privacy-minimizing view and deliberate grants/policies.

The production function catalog also reports mutable search paths on functions, and at least two `SECURITY DEFINER` functions use `search_path=public`. Each function requires definition and grant review; do not make a global change or assume that every definer function can be changed to invoker without altering its behavior.

### Recommended production response sequence

1. **Preserve evidence and capture definitions/grants** for all policies, views, functions and table privileges before editing.
2. Trace every direct Supabase client query in the repository and identify which operations currently depend on public table access.
3. Create a staging-first security patch that restricts direct table access, retains only the intended public settings/questions needed by the current candidate UX, and routes stateful exam actions through validated RPCs/server-side code.
4. Add regression tests for exam start/resume/save/submit, result lookup/release, corrections, access-code lifecycle, admin CRUD and unauthenticated/non-admin rejection.
5. Apply and verify the patch in staging. Compare advisor output and inspect effective grants afterward.
6. Only after staging passes, schedule production change with a backup/rollback plan and explicit production-change approval.

Do **not** simply remove all `public` or `anon` policies in one transaction. That could interrupt the live exam workflow while still failing to secure functions/views properly. Avoid selecting or printing any password values, access codes, candidate answers or personal result rows during further audit.

### Current status

- Read-only catalog and advisor inspection completed for production and staging.
- No production or staging table, row, policy, grant, view, function, Auth setting or data changed.
- Production security findings are higher priority than adding new Academy tables.
- The staging migration list and production migration list both returned empty through the Supabase migration-list tool. This does not mean the database has no schema; it means the connected migration-history API did not report tracked migrations. The current schema may have been created/changed outside that tracked history. Establish an authoritative schema baseline before creating migrations.


### Follow-up verification: effective grants and production RPC mismatch

A read-only privilege check confirmed that the production database grants the `anon` role table/view privileges including SELECT on `results`, `answers`, `questions`, `exam_sessions`, `access_codes`, `admin_users`, `audit_logs`, `question_upload_logs` and the three inspected views; INSERT on `results`; and UPDATE on `exam_config` and `settings`. The broad policies described above are therefore paired with effective SQL privileges, not merely inactive policy definitions. This confirms a critical exposure risk in production configuration. It does not prove that anyone has exploited it or establish what records currently contain.

A second compatibility finding: the current application wrapper `app/lib/examApi.ts` calls `get_public_settings`, `check_access_code`, `start_exam`, `resume_exam`, `save_progress`, `record_tab_switch`, `submit_exam`, `lookup_result` and `get_leaderboard`. The read-only production function catalog query returned only `use_access_code` and `validate_access_code` among those specific names; staging returned the expected candidate-facing RPCs. This indicates production schema/function state does not match the app branch's expected exam API. Before deploying this app branch against production, reconcile the target Supabase project and deployment configuration. Do not assume Vercel is currently connected to the same project merely from the repository.

### Immediate containment decision

No automated policy changes have been applied because the application currently expects server-side exam RPCs that are present in staging but were not found in the production catalog query. Removing broad direct-table access before verifying the live production app and RPCs could break candidate exam operations. Conversely, leaving the current permissions unchanged maintains serious exposure risk. Treat this as an urgent human-reviewed containment/release gate: confirm which Supabase project the live deployment uses, preserve current definitions/grants, prepare a staging-tested migration that moves the live app to validated RPC-only access, and schedule a coordinated production rollout. Do not ship new app code to production until project alignment and CBT regression are confirmed.


### Additional critical finding: unauthenticated privileged RPCs in production

The production catalog confirms that `anon` has `EXECUTE` on several `SECURITY DEFINER` functions. Two functions are especially urgent:

- `public.clear_all_results()`: definition directly deletes all rows from `public.results` and returns the number deleted. It contains no admin guard. `anon` can execute it according to `has_function_privilege`.
- `public.set_master_access_code(new_code text)`: definition writes the master code to `exam_config` and inserts/updates it in `access_codes`; it contains no admin guard. `anon` can execute it according to `has_function_privilege`.

The legacy `public.validate_and_use_access_code(input_code, input_phone, input_subject)` is also a `SECURITY DEFINER` function executable by `anon` in production and performs access-code validation/consumption; review its intended public use and race/attempt controls. The trigger function `protect_master_code_from_being_used()` being executable is not equivalent to it being an RPC risk, because trigger functions are normally invoked by triggers; confirm direct execute grants and dependencies during cleanup.

These findings represent **potential direct data-loss and exam-control compromise**, not proof that the functions have been called. Do not invoke these functions as a test.

**Why no immediate revoke was applied:** the current production schema is a legacy shape and the repository's current admin UI uses direct table operations plus these older RPCs, while the staging schema/app branch uses a newer Auth/profile and exam-RPC model. A one-line revoke could disable live admin controls; merely granting the functions to `authenticated` would still be unsafe unless their bodies verify admin authorization. This needs a coordinated, tested containment change—not an isolated permission tweak.

### Recommended containment patch design (not executed)

1. Prepare a versioned, reviewed migration that first changes `clear_all_results()` and `set_master_access_code()` to require a verified server-side admin identity (or makes them callable only through a trusted server-side admin route) and revokes direct `PUBLIC`/`anon` execution. Do not grant either function to all authenticated users.
2. If the live legacy admin frontend cannot authenticate using the new database-side admin model, disable those RPCs from public callers and move the corresponding UI operations to a properly authenticated admin path before re-enabling them. Never use localStorage as the authorization check.
3. Restrict direct table grants/policies for sensitive tables only after each current frontend operation is moved to a safe RPC/server-side path or given an equivalent narrow admin-only RLS policy.
4. Coordinate with the live deployment. The current repository's expected RPCs are not all present in production, so deploying this branch to production without schema reconciliation is not safe.
5. Test in staging with both anonymous and authenticated non-admin roles. Confirm the destructive RPCs fail for both, succeed only for a legitimate admin, and the candidate exam flow remains intact.

## Emergency production containment applied — 2026-10-16

The user explicitly authorized necessary Supabase security changes. Two narrow, reversible production permission changes were applied to project `bupkyppvtkrmzmluzjmf` using a tracked Supabase migration:

- Revoked `EXECUTE` on `public.clear_all_results()` from `PUBLIC`, `anon`, and `authenticated`. Verification confirmed those roles can no longer execute it; `service_role` retains execution for controlled server-side operations.
- Revoked `EXECUTE` on `public.set_master_access_code(text)` from `PUBLIC`, `anon`, and `authenticated`. Verification confirmed those roles can no longer execute it; `service_role` retains execution.
- Revoked client-role `EXECUTE` on `public.protect_master_code_from_being_used()`, a trigger-only helper that should not be exposed as a client RPC. This does not remove the trigger or change its function body.

No destructive RPC was invoked. No exam records, questions, results, access codes, user records, or schema tables were deleted or changed by these containment steps.

### Verification and remaining urgent risks

A fresh catalog check verified the first two functions are no longer executable by `anon` or `authenticated`; service-role execution remains. The production security advisor still reports five SECURITY DEFINER views and mutable function search paths. It also reports `validate_and_use_access_code(text,text,text)` as callable by unauthenticated and authenticated clients. This RPC is part of a legacy candidate access flow and must be hardened without accidentally locking candidates out; its current body accepts the configured master code and does not use the supplied subject parameter. Do not revoke it blindly before a compatible candidate validation path is tested.

Critical remaining exposure: permissive policies and effective grants on legacy production tables (including results, answers, questions, exam sessions, access codes, admin users, logs, exam configuration and settings), plus a leaderboard view that includes candidate phone information. Broadly removing those policies/grants could interrupt the legacy live CBT because the production schema does not match the current branch's RPC contract. Before those changes, identify the actual live deployment's Supabase URL/project and direct-table usage, then apply a coordinated least-privilege patch and test the full candidate/admin journey. Do not claim the whole database is secured yet.

### Required next sequence

1. Identify which Supabase project the live Vercel deployment currently uses; compare deployment environment variable names/host only, never reveal secret values.
2. Build a staging-compatible replacement for the legacy access-code RPC, with atomic one-time code consumption, input validation, subject/session checks where supported, and no public direct access to master-code configuration.
3. Remove or replace public access to sensitive table policies/grants and sanitize the leaderboard view so phone numbers are never publicly exposed, after compatibility testing.
4. Pin safe `search_path` values on reviewed functions and convert views to invoker security where supported and compatible.
5. Run candidate and admin regression tests in staging, then verify advisors and grants again.
6. Reconcile the production schema with tracked migrations before any larger schema deployment. The migration listing was empty, which is not proof that the database is empty.

### Follow-up hardening applied — legacy access-code RPC

The `validate_and_use_access_code(text,text,text)` function was updated in both production and staging after checking its legacy table schema. It now:

- Rejects missing or overlong access-code, phone, and subject inputs.
- Uses a fixed `search_path` including `pg_temp` last.
- Locks the matching access-code row while validating it, checks the configured subject when the code has one, and conditionally consumes only an unused code.
- Returns generic validation failures and never returns the configured master secret.
- Preserves the legacy master-code acceptance behavior so this change does not intentionally remove the existing master-code flow.

Catalog verification confirms the updated function is installed in both projects. Production advisors now report only this one anonymous SECURITY DEFINER RPC, because it is intentionally part of the legacy candidate flow. **This is partial containment, not a complete security fix:** the master-code bypass still exists by design for compatibility and should be replaced with a short-lived server-side authorization/session mechanism before launch. Do not expose or place the master code in browser code.

The production security advisor still reports the five SECURITY DEFINER views, 12 functions with mutable search paths, and the legacy public table-policy/grant exposure described above. Those remain open remediation work; no data was deleted and no exam records were modified.


### Follow-up containment: restrict legacy SECURITY DEFINER views — 2026-10-16

After the user authorized necessary Supabase security changes, the production project `bupkyppvtkrmzmluzjmf` was re-inspected. The five legacy views below were confirmed to grant client-role access while running with the view owner's privileges:

- `exam_config_view` selected every `config_key` and `config_value`, potentially exposing sensitive exam configuration such as the master access code.
- `leaderboard_view` selected candidate `phone` along with result fields.
- `access_code_summary_view`, `exam_session_summary_view` and `subject_performance_view` exposed aggregate operational information.

A production migration named `restrict_legacy_security_definer_views` has now revoked all privileges on these five views from `PUBLIC`, `anon` and `authenticated`. Post-change catalog verification confirmed that neither `anon` nor `authenticated` can SELECT from any of the five views. Service-role and database-owner access was not revoked. No rows or exam data were changed.

**Compatibility note:** any frontend or admin screen that directly reads these views will now need a properly authorized replacement. This was a deliberate narrow containment measure because the configuration view could expose the master code and the leaderboard view exposed phone numbers. The live CBT flow has not been end-to-end tested after this permission change, so do not claim that all user journeys are verified.

The fresh production security advisor no longer reports these five views as externally accessible SECURITY DEFINER view findings. Remaining advisor findings include 12 functions with mutable search paths and the legacy candidate-facing SECURITY DEFINER function `validate_and_use_access_code(text,text,text)`. Broad direct-table grants and permissive policies on sensitive legacy tables also remain urgent work. They require live-app/project alignment and regression testing before a coordinated restriction; this migration does not resolve those table-level exposures.


### Follow-up containment: restrict legacy admin RPCs — 2026-10-16

A further production function review found several legacy administrative RPCs were executable by `anon` and `authenticated`, even though they are not SECURITY DEFINER functions. Because production also has broad direct table privileges, these RPCs could still generate/export access codes or modify exam configuration when called by client roles.

The production migration `restrict_legacy_admin_rpc_execution` revoked client execution on:
- `export_fresh_access_codes(integer)`
- `generate_access_codes(integer)`
- `generate_blt_codes(integer)`
- `get_unexported_codes(integer)`
- `mark_codes_exported(uuid[])`
- `reset_exam_config()`
- `reset_used_access_codes_preserve_master()`
- `update_exam_config(text,jsonb)`

Verification confirmed `anon` and `authenticated` can no longer execute these functions, while `service_role` retains execution. Previously restricted `clear_all_results()`, `set_master_access_code(text)` and the trigger helper remain restricted. The candidate-facing `validate_and_use_access_code(text,text,text)` remains executable for legacy candidate compatibility and is still a security risk that requires a replacement design.

**Compatibility warning:** legacy admin screens that call these RPCs directly may stop working until a trusted server-side admin path is wired up. This was preferred over leaving unauthenticated access-code generation/export and exam-config mutation callable from the public API. The live admin workflow has not been end-to-end tested after this permission change. The direct-table grants and policies remain a separate high-priority exposure and must be addressed in a coordinated, tested rollout.

The fresh security advisor still reports 12 mutable-search-path functions. Their definitions are invoker functions or trigger helpers, not all privileged definer functions; review schema grants and function dependencies before pinning each path. No exam/result/access-code rows were deleted or modified by this migration.


### Follow-up containment: pin legacy function search paths — 2026-10-16

The production `public` schema does not grant `CREATE` on the schema to `anon` or `authenticated`. Based on that check and review of the 12 functions flagged by the advisor, migration `pin_legacy_function_search_paths` set a fixed function-level `search_path = public, pg_temp` on:
`set_question_marks()`, `update_exam_config(text,jsonb)`, `reset_exam_config()`, `generate_blt_codes(integer)`, `reset_used_access_codes_preserve_master()`, `generate_access_codes(integer)`, `export_fresh_access_codes(integer)`, `get_unexported_codes(integer)`, `mark_codes_exported(uuid[])`, `validate_access_code(text)`, `use_access_code(text,text)`, and `insert_result_after_submit()`.

Catalog verification confirmed all 12 functions now have the fixed setting. A fresh production security-advisor run no longer reports mutable-search-path warnings or the five exposed SECURITY DEFINER views. The remaining security-advisor findings are the anonymous/authenticated execution warning for `validate_and_use_access_code(text,text,text)`, which remains intentionally callable for the legacy candidate access-code flow. This is not a clean security bill of health: direct table grants and permissive RLS policies on sensitive legacy tables remain unresolved, and the legacy master-code acceptance path still needs a safer replacement.

No data rows were changed by this migration. The candidate and admin flows have not been end-to-end tested after these containment changes.
