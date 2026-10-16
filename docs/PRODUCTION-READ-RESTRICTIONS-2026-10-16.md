# Production Read-Restriction Follow-up — 2026-10-16

## Scope
Production Supabase project `BrainLabCBT` (`bupkyppvtkrmzmluzjmf`). This note records a read-only verification after the containment migrations. No candidate records, access-code values, admin password values, or exam content values were queried.

## Verification results
- The sensitive-table SELECT revocations are effective for `results`, `answers`, `exam_sessions`, `audit_logs`, `question_upload_logs`, `admin_users`, `exam_config`, and `access_codes` for `anon` and `authenticated`.
- The previous containment did **not** remove all direct client write privileges. Effective grants still include INSERT/UPDATE on several legacy tables, and the database still has permissive RLS policies for some writes. Examples include `results`, `answers`, `exam_sessions`, `access_codes`, `exam_config`, `settings`, `audit_logs`, and `question_upload_logs`.
- `questions` remains directly SELECT-accessible to `anon` and `authenticated`, and its public read policies remain. Its schema includes `correct_answer` and `explanation`; direct reads can therefore expose answer keys and explanations. The table also still permits direct client INSERT/UPDATE.
- `settings` still has direct SELECT access for `anon` and `authenticated`, with permissive public read policies. Its contents were not queried.
- The current production security advisor reports the expected remaining warnings for `public.validate_and_use_access_code(text,text,text)`, a SECURITY DEFINER RPC callable by `anon` and `authenticated`. It remains callable for legacy compatibility and must not be revoked until a safe replacement is wired into the candidate flow.
- The `admin_users` table has RLS enabled without policies, which is fail-closed for ordinary client queries. The legacy `password` column exists; no password values were read.

## Required next steps
1. Reconcile the live legacy UI and current branch RPC implementation before revoking remaining client INSERT/UPDATE grants, to avoid accidental exam/admin outage.
2. Implement and test the current branch's expected exam RPCs in staging first, including server-side question selection without returning answer keys before submission.
3. Replace direct `questions` table reads with a narrow safe RPC returning only candidate-facing fields; then revoke direct SELECT and remove permissive public question policies.
4. Replace direct admin mutations with server-authorized functions, then revoke public/anon/authenticated write grants and remove permissive write policies from sensitive tables.
5. Review `settings` for public-safe keys and replace broad table reads with an allow-listed settings RPC.
6. Run candidate and admin regression tests in staging; do not merge or deploy until the founder explicitly approves.

## Safety note
These changes are containment, not a complete application/database reconciliation. Do not claim the production CBT is end-to-end verified. No table data was deleted or updated by the read-only verification that produced this note.
