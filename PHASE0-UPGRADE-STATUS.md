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
