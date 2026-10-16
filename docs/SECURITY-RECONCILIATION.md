# CBT Security Reconciliation — Review Branch

**Status: INCOMPLETE — NOT APPROVED FOR MERGE OR DEPLOYMENT**

This document records the security-focused changes made on `feature/brainlab-academy-upgrade`. It is not a penetration-test report and does not establish production safety.

## Changes made in this pass

- `/test` no longer selects all rows from the `questions` table or renders `correct_answer`. It checks only the public-settings RPC.
- `/corrections` now checks the live public-settings RPC and redirects to `/result` unless results are currently released. Cached browser data is not treated as proof that the release flag is enabled.
- These changes are additive and do not modify the production database.

## Critical work still outstanding

- `/exam` must be reconciled with the server-authoritative attempt flow: questions without answer keys in the client, server-owned timing/session state, server-side grading, validated submissions, and duplicate-submit handling.
- `/result` must stop querying or writing result/answer tables directly from the browser. Result lookup must use the reviewed server RPC and enforce candidate ownership/authorization.
- `/corrections` still renders its cached review payload after the release check. The exam page must be confirmed to populate that payload exclusively from a successful server grading response that obeys the release setting; stale legacy browser payloads must not be trusted.
- Audit all `/admin/**` routes and database policies/RPCs for authorization on the server, not merely client-side redirects.
- Verify the actual deployed staging function signatures and their return shapes before relying on `get_public_settings`, `start_exam`, `resume_exam`, `save_progress`, `record_tab_switch`, `submit_exam`, and `lookup_result`.
- Run the complete staging regression checklist, including result release off/on, cross-candidate lookup, reload/resume, timeout, duplicate submission, and non-admin access attempts.

## Release gates

1. Review and reconcile the founder's local security changes with this remote branch without overwriting either working tree.
2. Finish the exam/result/corrections changes as one compatible flow.
3. Verify database functions and RLS policies in staging; do not apply migrations to production during this work.
4. Pass TypeScript, lint, production build, and the full staging CBT regression checklist.
5. Record rollback steps and obtain explicit approval before any merge or production deployment.

## Operational boundary

No production database, schema, DNS, domain, merge, or deployment action is authorized by this work. The branch remains a review build.
