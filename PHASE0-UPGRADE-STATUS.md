# BrainLab Academy upgrade — work in progress

**Do not merge or deploy this branch yet.**

## Changes prepared on `feature/brainlab-academy-upgrade`

- Added a responsive Academy landing page with a prominent link to the existing CBT candidate portal.
- Preserved the legacy candidate entry page at `/login` and removed its floating Medic Phoenix attribution.
- Added an About page containing the proposed vision, mission and values.
- Added shared public header/footer. The public chrome is suppressed on active exam and admin routes.
- Added brand SVG assets, metadata and a GitHub Actions build workflow.
- Added product blueprint, route inventory and phased implementation roadmap.

## Security reconciliation update (2026-10-16)

- The `/test` diagnostic route now checks only the public-settings RPC; it no longer reads question rows or displays answer keys.
- `/corrections` now checks the live result-release setting before rendering cached review data.
- These are partial risk reductions only. The exam and result pages still require full server-authoritative flow reconciliation, and admin authorization/database policies still need audit.
- See `docs/SECURITY-RECONCILIATION.md` for exact blockers and staging release gates.

## Known release blockers

1. This branch started from the remote `phase0-hardening` branch, which is behind the founder's newer local security/brand changes.
2. The original Phase 0 status indicates legacy direct-table calls remain in exam, result, access, candidate-login and admin workflows.
3. The new public-site changes have not yet been tested in a real local/staging environment. GitHub Actions build status must be checked after the workflow runs.
4. Footer/header behavior needs manual verification on `/`, `/about`, `/login`, `/access`, `/instructions`, `/result`, `/corrections`, `/exam` and admin routes.
5. The approved production domain and canonical URL are not yet configured in this branch.
6. Review and reconcile the staging migrations and security findings before release.

## Safety boundaries

- No production database, schema, DNS, domain purchase or deployment action was performed.
- CI uses placeholder public Supabase values only; do not use these values for real user sessions.
- Do not merge until the local security hardening is reconciled and staging regression tests pass.
- Obtain explicit founder approval before production deployment.

## Learner revision planner — first implementation (2026-10-16)

- Added `/learning/revision`, an authenticated, browser-local revision planner.
- Learners can set a goal, choose a plan length and daily study time, add topics by subject, check off completed topics, remove tasks, and clear the plan.
- Added a plain-text export so learners can keep or print a copy of their plan; export is generated in the browser and does not upload plan data.
- Linked the planner from the account dashboard.
- The first version stores plan data in the current browser/device only. It does not sync to the learner account, import exam results, infer weak topics, or make AI recommendations. These are explicit limitations, not claims of completed personalization.
- No database schema, exam lifecycle, scoring, answer-key, or production data changes were made for this feature.
- The revision-plan export change has been committed, but the latest Vercel preview/build must be checked again; no successful preview or local/staging test is claimed.
- Next implementation stages: run latest CI/build, perform staging regression for CBT/auth, then plan account-linked progress using verified server data before introducing AI or community features.

## AI learning information page (2026-10-16)

- Added `/ai-learning` as a public explanation of the planned AI learning companion.
- Added navigation and footer links so visitors can find the page.
- Clearly labels AI tutoring as planned and describes intended use, limitations and safeguards; this is not a working AI tutor and does not call an AI provider.
- Updated the route inventory.
- No authentication, exam, database, schema or production configuration was changed for this page.
- The commits are on the review branch only. CI and Vercel preview must be checked; no successful build or staging test is claimed.

## Courses and community overview pages (2026-10-16)

- Added `/courses` to describe the future direction for learning resources, courses, projects and a possible Skills Passport. It does not claim that a live course catalogue or accredited certificates exist.
- Added `/community` to describe planned study circles and discussions, with moderation, privacy and reporting safeguards called out before launch.
- Added both pages to public header/footer navigation and updated the route inventory.
- These are informational roadmap pages only. No course delivery, chat, messaging, member directory, new database tables, or community backend was introduced.
- Latest Vercel preview must be checked and route rendering/build verified before calling these changes tested. Do not merge or deploy without explicit approval.

## Public support page (2026-10-16)

- Added `/support` with FAQs for the existing CBT entry, access codes, result availability, shared learner accounts and future capabilities.
- Reused the existing WhatsApp support number already present in the CBT portal; no new contact address or social account was invented.
- Added support links to the public header and footer and documented the route.
- The page does not change exam result access, authentication, database policies or any production configuration.

- Expanded the header's desktop navigation breakpoint so the additional page links collapse into the mobile menu on tablet-sized screens rather than crowding the header.

## Full Academy page skeleton (2026-10-16)

- Added reusable `ComingSoonPage` component for clearly marked, non-functional future areas.
- Added `/explore`, a directory that separates current tools from planned and policy-review pages.
- Added Coming Soon route structure for CBT overview, resources, schools, contact, expanded FAQs, privacy notice and terms of use; legal pages are explicitly not complete legal documents.
- Added learner-only placeholders for progress, achievements, courses, study groups, community discussions, messages, notifications, profile, settings, Skills Passport and Learning DNA. These check for a signed-in Supabase user before showing the placeholder, but do not contain or expose learner data.
- Added public placeholders for Challenge Arena and Knowledge Base.
- Updated public header/footer and learner dashboard so visitors can discover the structure and learners can see planned personal areas.
- Updated route inventory. New admin URLs were deliberately not added because admin route-level authorization must be verified first; do not use obscurity as a security boundary.
- No new database tables, RPCs, live AI provider, chat service, course delivery, production data or schema changes were introduced.
- Vercel and CI checks must complete and the routes must be tested before the branch can be considered build-verified. This work is still unmerged and must not be deployed without explicit approval.

- Added admin workspace placeholders at `/admin/users`, `/admin/content`, `/admin/moderation`, `/admin/analytics` and `/admin/security`. They display no administrative records and are marked Coming Soon. The client-side `is_admin()` check is a UX gate only; real admin data/actions remain blocked until server-side authorization and RLS are verified.
- Latest Vercel status responses link to a build-rate-limit/upgrade page. This does not establish whether the application code builds successfully; CI/build verification remains unresolved and should be retried when the deployment quota permits.


## Supabase database remediation plan (2026-10-16)

- Added [`docs/SUPABASE-DATABASE-REMEDIATION-PLAN.md`](docs/SUPABASE-DATABASE-REMEDIATION-PLAN.md) with a prioritized P0–P5 plan, read-only SQL inventory queries, staging regression matrix, and proposed phased data model for account-linked revision planning and later Academy capabilities.
- The repository root currently has no `supabase/` migration directory in the inspected branch. This is a reason to inventory the actual migration history and schema before creating executable migrations—not a reason to assume the database has no existing structure.
- The plan distinguishes staging advisor findings from production facts and explicitly avoids blanket RLS changes, blanket RPC grant/revoke changes, speculative index drops, and automatic phone-based account matching.
- No SQL was executed; no database tables, indexes, policies, functions, Auth settings or data were changed.
- CI status for the documentation commit `88664d614974734a3562842e0e397d9c27fccac5` was pending at the last check. No successful build is claimed; recheck CI/Vercel before release.


## Direct Supabase production review — critical findings (2026-10-16)

A read-only inspection was performed through the connected Supabase integration for both `BrainLabCBT` production and `BrainLabCBT-Staging`. No SQL changes were applied.

- Production's effective grants and RLS policies allow anonymous reads of sensitive tables including results, answers, questions, exam sessions, access codes, admin-user records, audit logs and upload logs; anonymous updates are allowed on exam configuration/settings, with other broad public policies present.
- Production's `clear_all_results()` is a `SECURITY DEFINER` function that deletes all results, has no admin guard in its inspected definition, and is executable by `anon`.
- Production's `set_master_access_code(new_code)` is a `SECURITY DEFINER` function that changes the master access code, has no admin guard in its inspected definition, and is executable by `anon`.
- The current app branch expects newer candidate-facing RPCs present in staging, but the corresponding function catalog entries were not found in production. Production's schema is a legacy shape and is not yet reconciled with this branch.
- The remediation plan records the findings and proposed containment sequence in `docs/SUPABASE-DATABASE-REMEDIATION-PLAN.md`.

**Urgent:** treat this as a potential data-exposure, result-deletion and exam-control compromise. Catalog inspection does not prove exploitation. Do not invoke destructive functions as a test. No policies/functions/grants were changed because immediate revocation without reconciling the legacy live admin UI could break live operations; the correct patch needs admin authorization inside the database/server and staging regression first. Do not deploy the newer app branch to production until the Supabase project/schema mismatch is resolved.
