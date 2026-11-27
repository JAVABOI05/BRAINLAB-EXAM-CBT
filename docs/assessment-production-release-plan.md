# Assessment subsystem production release plan

Status: read-only dependency audit; no production or staging database changes have been made.

## Scope

Release the assessment-sharing and attempt subsystem needed by the current application. Do not import the complete Learning Hub, courseware, Arena, payment, tutor, classroom, revision-plan, quest, or unrelated learning features.

## Confirmed production baseline

The production database already contains the legacy `questions`, `access_codes`, `admin_users`, `admin_profiles`, and `audit_logs` tables, plus the production admin-role helpers. Production's `questions` table has the standard text/answer columns but does not have the image URL/alt columns present in staging. Production does not currently have the `question_exposure_history` table or any `learning_*` tables.

Production's `access_codes` table does not have `cohort_assessment_id` or `used_at`. The current staging secure start RPC checks whether `cohort_assessment_id` exists before executing its dynamic legacy fallback. Therefore, on the inspected production schema that fallback is skipped; the earlier audit description that it would unconditionally update `used_at` was too broad. Keep the fallback disabled unless a separately reviewed production schema and code path explicitly require it.

## Required assessment dependency closure

1. Assessment core tables: `learning_organisations`, `learning_organisation_members`, `learning_assessments`, `learning_entitlements`, `learning_access_codes`, `learning_access_code_redemptions`, and `learning_practice_attempts`.
2. Assessment functions: `learning_can_manage_organisation`, the assessment start/resume/save/submit functions, assessment code issuance/redemption/management, published-assessment validation, results retrieval, and any helper functions those routines call (including `_err`).
3. Assessment-specific RLS policies, indexes, foreign keys, constraints, triggers, and explicit function/table grants.
4. Share slug column, backfill, unique index, and slug trigger. The share-slug migration must be included from the actual source revision used for the release; the currently inspected integration branch does not contain the previously referenced `20261121223931_learning_assessment_share_slugs.sql` file, so verify and reconcile that source before packaging.
5. The assessment RPC selects from `public.questions` (the assessment source label `legacy_questions` is a logical source label, not evidence of a separate production table). Add the nullable question/option/explanation image URL and alt columns used by the RPC, after checking the exact staging media migration and production drift.
6. The unseen-question selection references `public.question_exposure_history`. Include its schema, indexes, RLS, and recording trigger/function only if the released assessment path retains this query. Confirm the attempt insert trigger and ownership/grants as part of the same change.

## Explicit exclusions

- Learning subject/topic/lesson courseware tables and their lesson/test attempt engine.
- Self-practice RPCs and unrelated adaptive learning, spaced repetition, live learning, communication, revision-plan, quest, daily-feed and certificate features.
- Existing production admin-role hierarchy migration. Production already has a different-version equivalent and its permission map is richer than staging. Do not replay or replace it.
- Bulk data migration of staging entitlements, self-practice attempts, organisations, or access-code records. Promotion of the two published assessment definitions is a separate, reviewed data operation.

## Security and compatibility gates

- Preserve production `admin_has_permission()` and the full existing role/permission map. Add only the specific assessment permission checks required by the new subsystem.
- Do not copy the staging grant that allows `anon` to execute `learning_can_manage_all()`. Review helper execution grants with least privilege; policies should not expose management capabilities to anonymous callers.
- Keep assessment codes scoped by both `scope_type = 'assessment'` and the exact `assessment_id`; retain hashed storage and atomic redemption.
- Do not introduce a legacy `access_codes` fallback that accepts general codes. If legacy cohort assessment codes are ever supported, require a real FK/scope column, schema migration, assessment-specific validation, and compatible consumption logic in one reviewed change.
- Keep service-role-only tables/functions inaccessible to anon/authenticated except through intended, narrowly scoped RPCs.
- Review `SECURITY DEFINER` functions for pinned search_path, actor authorization, RLS bypass implications, and explicit EXECUTE grants.
- Confirm all referenced columns, constraints, indexes, helper functions, extensions, triggers and auth references exist in production before applying anything.

## Release sequence

1. Reconcile source migrations and extract the dependency closure above into a new, forward-only production migration (do not replay the full staging migration history or rollback files).
2. Review the generated SQL against production's live schema and the full production admin permission implementation.
3. Test on an isolated database clone with production schema, including clean install, repeat/idempotency expectations, RLS as anon/authenticated/service_role, code scope, attempt limits, question snapshots, submit/resume, and slug uniqueness.
4. Test rollback on the clone. Prefer a forward corrective migration after data exists; do not promise destructive rollback of student attempts.
5. Separately approve which assessment definitions, if any, are copied from staging. Do not copy user-linked entitlements or attempts automatically.
6. Obtain explicit approval before applying the reviewed migration or releasing the app to production.

## Current decision

No SQL migration has been generated or applied yet. This document is a dependency/release manifest, not executable SQL. Staging remains the source reference; production remains untouched.
