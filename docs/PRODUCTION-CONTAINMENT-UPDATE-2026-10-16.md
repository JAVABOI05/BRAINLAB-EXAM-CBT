# BrainLab CBT — Production containment update (2026-10-16)

Project: production Supabase project `bupkyppvtkrmzmluzjmf`.

## Applied and verified

Two migrations restricted direct reads from sensitive legacy tables:

- `restrict_sensitive_legacy_table_reads`: revoked SELECT from PUBLIC, anon and authenticated on `admin_users`, `exam_config` and `access_codes`; removed broad public read policies for those tables.
- `restrict_sensitive_candidate_and_audit_reads`: revoked SELECT from PUBLIC, anon and authenticated on `results`, `answers`, `exam_sessions`, `audit_logs` and `question_upload_logs`; removed broad public read policies for those tables.

Verification found no remaining SELECT grants to anon/authenticated on the first three tables. The security advisor reports `admin_users` has RLS enabled without policies, intentionally fail-closed while the legacy credential model is replaced.

Earlier applied migrations also restricted client execution of privileged administrative RPCs, restricted five SECURITY DEFINER views, removed destructive table privileges from client roles, and pinned search paths on 12 functions.

## Remaining risk and compatibility warning

The remaining security-advisor warnings concern `validate_and_use_access_code(text,text,text)`, a legacy candidate-facing SECURITY DEFINER RPC that is still callable by anon/authenticated. Its master-code compatibility path needs a safer replacement.

The current production function catalog did not contain all candidate RPCs expected by the current app branch. Therefore, the table-read restrictions may break legacy browser paths that query these tables directly. Candidate exam start/save/submit, corrections/results, and admin flows need end-to-end tests against the actual live deployment and correct Supabase project. Do not claim the CBT is fully operational or fully secured until these tests pass.

Public question reads and some INSERT/UPDATE privileges remain to be reconciled after validated server-side/RPC replacements are in place. No candidate, result, question or access-code rows were deleted or changed by these permission migrations.
