# Security-only release gates (October 2026)

Status: **BLOCKED — this branch is a release-planning scaffold, not a deployable security fix.**

This branch intentionally starts from `main` and does not change production code or the database. Do not merge or deploy it as if it closes the reported production findings.

## Findings verified from repository metadata

- `main` currently contains no `supabase/` directory and no tracked migration for the reported production lockdown.
- `main`'s `app/lib/supabase.ts` hard-codes a Supabase project URL for project ref `bupkyppvtkrmzmluzjmf`. The reported production project ref is `eusgwsuoloomphebrepe`. These do not match.
- `main` has no `app/lib/examApi.ts`; its structure differs materially from the large feature branch and cannot safely receive a blind cherry-pick of the new server-side exam API.
- The Vercel GitHub status on recent feature-branch commits reports the deployment-per-day quota error. This is a deployment quota failure, not proof of a source build failure.

## Release objective

Close the production security gaps with the smallest reviewable change set, while preserving the existing candidate exam workflow. The release must prevent:
1. public users inserting forged `results` or `answers`;
2. public users changing protected `exam_sessions` fields;
3. students or anonymous users reading protected answer keys;
4. any unauthenticated or unauthorized user invoking admin-only functions.

## Mandatory gates — all evidence must be attached to the release PR

### Gate 0 — identify the real production source (BLOCKER)
- Confirm the exact Git commit currently serving the production domain in Vercel.
- Confirm which Supabase project the production deployment must use. Do not infer it from the URL in source.
- Compare that deployment commit and project ref against `main`, `feature/brainlab-academy-upgrade`, and the migration already applied in production.
- Stop if the production source/project pairing is not unambiguous. Do not replace Supabase URL/key configuration until the intended project and matching Vercel Production variables are confirmed.

### Gate 1 — backup and recovery
- Take a timestamped database dump of the actual production project before further database changes.
- Store the dump securely outside Git; verify the file can be read and the restoration procedure is documented.
- Capture the current relevant grants, RLS policies, schema, and migration history.
- Treat the existing `phase0_backup` policy/grant records as a recovery aid, not as a complete database backup.

### Gate 2 — database enforcement
- Review the applied migration `phase0_interim_lockdown_results_answers_updates` against the actual live schema.
- Design a separate, reviewed migration to remove unauthorized public insert/update paths for `results`, `answers`, and `exam_sessions`, and prevent reading answer keys.
- Keep legitimate exam writes behind a server-side trusted path that verifies the candidate, exam/session ownership, timing, attempt state, and scoring. Do not simply revoke writes if that would silently break the live candidate flow.
- Test policy/grant behavior using anon, authenticated student, and trusted server roles in isolated staging.
- Verify expected candidate start, answer save, submission, scoring, result, and correction journeys before production rollout.
- Do not run an untested migration directly against production.

### Gate 3 — application code and configuration
- Only after Gate 0, port the smallest necessary server-side validation to the exact source commit that is actually deployed.
- Keep service-role credentials server-only; never use a `NEXT_PUBLIC_` prefix for secrets.
- Configure and verify the intended Production Supabase URL and public/publishable key in Vercel before promoting code that reads environment variables.
- Keep AI Tutor, dashboard redesign, Learning Hub schema/features, and branding out of this security-only release unless a dependency is demonstrated and separately reviewed.

### Gate 4 — staging and deployment
- Validate `npm ci`, `npm run lint`, `npx tsc --noEmit`, and `npm run build` on the exact release commit.
- Run security tests for forged inserts, updates/deletes, answer-key reads, cross-candidate access, and unauthorized admin access.
- Run the existing CBT regression suite and manually verify a full candidate attempt.
- Resolve the Vercel deployment quota using Vercel's documented project/account controls. An Ignored Build Step can skip builds that do not need deploying, but is not a substitute for fixing the quota or proving a release deployment succeeded.
- Confirm a successful Preview deployment and complete browser smoke tests before considering Production.

### Gate 5 — release approval
- Attach backup/restore evidence, migration review, CI checks, staging test results, and the production commit/project identity to the PR.
- Confirm no exam is in progress and schedule a controlled release window.
- Obtain explicit release approval before applying the production migration or merging to `main`.
- After release, verify database counts and permissions, candidate exam completion, admin access, and Vercel/Supabase logs.

## Current decision

**Do not merge this scaffold as a fix. Do not merge PR #2 wholesale. Do not apply the Learning Hub migration from PR #10 to production.**

The next required action is Gate 0: reconcile the source commit and Supabase project actually used by Production. Only then can a genuinely minimal, deployable security patch be prepared safely.
