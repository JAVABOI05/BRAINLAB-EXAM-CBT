# BrainLab Learning Assessments — Candidate Experience & Controls

Status: product/engineering specification for the next implementation phase. This document does not change database state or enable any feature by itself.

## Product direction

Learning Assessments should feel like a dedicated, polished assessment product—not a reskinned copy of the general BrainLab CBT. Each assessment gets its own public-facing landing page, branded instructions/entry flow, focused examination workspace, and distinct correction/results experience. The assessment owner controls access, candidate identity requirements, result release, and leaderboard visibility per assessment.

The existing general CBT remains unchanged. These changes apply only to the Learning Assessments experience.

## Candidate journey

1. **Shareable assessment landing page** — open from a short slug URL, e.g. `/assessments/brainlab-quick-drills`. Show the assessment title, optional cover/preview image, description, host/organiser, opening/closing status, question count, duration, attempts allowed, subject(s), access-code requirement, and clear start instructions. Do not expose answer keys or private assessment configuration.
2. **Candidate details and access** — collect only the identity fields configured by the assessment owner. Possible fields: full name, candidate number, phone number, email. Each field can be hidden, optional, or required. Access-code entry is shown only when enabled. Sign-in is required only when the owner enables it; otherwise a guest candidate can continue without a BrainLab account.
3. **Pre-start confirmation** — show assessment-specific instructions, duration, question count, navigation/answering rules, submission behaviour, allowed attempts, and any permitted materials. Candidate confirms before starting.
4. **Branded loading transition** — show a short BrainLab logo animation while the server creates the attempt and loads its paper. Use the supplied BrainLab logo artwork as the visual reference/asset; animate the logo mark (subtle pulse/line trace or upward-arrow movement) with an accessible reduced-motion fallback. This is a real loading state, not an artificial fixed delay.
5. **Dedicated assessment runner** — a calm, high-contrast, responsive interface with progress, timer, question palette, clear answered/unanswered/flagged states, autosave feedback, previous/next navigation, and a deliberate submit confirmation. It should be visually distinct from the general CBT and usable on low-end Android devices.
6. **Submission confirmation** — confirm that the attempt has been recorded. Do not automatically reveal score/corrections when the configured release policy withholds them.
7. **Results waiting / retrieval page** — when results are withheld, explain that submission is recorded and when/how the candidate can return. Provide a safe retrieval route for both signed-in and guest attempts.
8. **Results and corrections** — when released, show a separate results experience with score, percentage, pass status (if configured), subject/section breakdown where supported, and question-by-question corrections according to the owner's correction policy.
9. **Optional leaderboard** — show a per-assessment leaderboard only when enabled by the owner and only after its configured publication time. Never reveal private candidate phone/email or internal account identifiers.

## Access and identity rules

### Sign-in policy

- Per assessment setting: `require_login` (default false for newly created public academic assessments; existing assessments retain their current behaviour until explicitly migrated/configured).
- When false, guest candidates can read public assessment metadata and start an attempt without authentication.
- When true, require a valid BrainLab session before candidate details/start.
- Access code is an independent control; it does not imply login is required.
- Organisation membership, restricted cohorts, and competitions may still require sign-in based on their own access rules. Do not weaken those checks merely because guest mode exists.
- Never trust client-supplied candidate identity or assessment settings. Resolve policy and validate access on the server for every start/resume/submit/results request.

### Guest attempt security

The current assessment start RPC requires `auth.uid()`, and the current attempt model is user-bound. Therefore guest mode is not a front-end-only change. It requires a deliberate backend design:
- Create a cryptographically random, high-entropy guest attempt credential; store only a secure hash server-side.
- Bind guest attempt access to the exact assessment and attempt, with expiry/revocation and rate limits.
- Return the credential only once over HTTPS; do not put it in analytics, public URLs, logs, or referrer-bearing links.
- Use secure, HttpOnly, SameSite cookies where feasible; otherwise use a one-time claim/recovery code and explain how the candidate should keep it safe.
- Guest resume, autosave, submit, result retrieval and correction endpoints must verify the credential and attempt ownership server-side.
- Prevent duplicate submissions and enforce attempt limits atomically across authenticated and guest candidates.
- Keep candidate PII separate from public leaderboard data. Define retention and deletion rules before collecting phone/email.
- Do not make `learning_practice_attempts.user_id` nullable as a shortcut without reviewing all existing RLS policies, foreign keys, self-practice RPCs, XP awarding, analytics, and ownership checks.

## Assessment configuration — per assessment

The admin editor should expose these controls in clear groups:

### A. Presentation
- Assessment title and short description.
- Optional cover/preview image (upload to a controlled Storage bucket; validate MIME type, size, and image dimensions; store a safe path/URL).
- Optional host/organisation logo and display name if already supported by the organisation model.
- Optional welcome text and completion message.
- Custom share slug, with uniqueness validation and automatic slug suggestion.

### B. Assessment rules
- Question source and configured question count.
- Duration or untimed mode.
- Maximum attempts.
- Shuffle questions and, if supported, shuffle options.
- Start/end schedule and timezone display.
- Access-code required toggle and code management.
- Require BrainLab login toggle.
- Candidate details schema: full name, candidate number, phone, email; each independently hidden/optional/required.
- Candidate instructions (rich text with safe sanitisation).
- Calculator/materials policy and other permitted resources, if relevant.

### C. Result and correction release
Use separate controls; a single `result_release` field is not sufficient for the requested flexibility.

- **Score visibility:** immediately after submission, after scheduled close, manually released by admin, or withheld.
- **Correction visibility:** immediately, after scheduled close, manually released, or never.
- **Candidate retrieval:** allow candidates to return later and retrieve released results/corrections.
- **Release timestamp:** optional scheduled `results_available_at` and `corrections_available_at`.
- **Manual release switch:** admin can publish results/corrections later without changing the original attempt.
- **Candidate messaging:** show a clear “submitted; results not yet released” state and the expected release time when configured.
- A withheld score must not leak through client payloads, page source, RPC responses, exports available to candidates, or leaderboard endpoints.

### D. Leaderboard
- Per-assessment enable/disable toggle; default off.
- Publication timing: immediately after submission, after assessment closes, or manually.
- Ranking basis: score/percentage, with deterministic tie handling (e.g. same score shares rank; optional time tie-break only if the owner enables it).
- Display name policy: candidate-chosen display name, first name + masked candidate number, or anonymised “Candidate 001”. Never expose phone/email.
- Optional top-N limit and show-my-rank setting.
- Exclude incomplete, invalidated, or unsubmitted attempts.
- If score release is withheld, leaderboard must not inadvertently reveal score/rank unless leaderboard publication is separately enabled.
- Admin preview before publication and ability to hide/republish.

## Dedicated visual design

### 1. Landing page
- Premium editorial layout with the BrainLab brand palette; not the general CBT catalogue card.
- Cover image or branded placeholder, title, description, host, availability badge, stats row (questions, duration, attempts), access/login indicators, instructions preview, and one primary “Begin assessment” action.
- Mobile-first layout and share/copy link affordance.
- Closed/upcoming assessments show status and dates without offering an invalid start action.

### 2. Logo loading state
- Use the supplied BrainLab logo asset rather than recreating the logo with text.
- Short, restrained animation: logo mark scales/pulses, network nodes softly illuminate, upward arrow draws or rises, wordmark fades in.
- Respect `prefers-reduced-motion`; keep a static logo and status text fallback.
- Announce loading status accessibly and avoid blocking indefinitely; show retry/help if attempt creation fails.

### 3. Candidate details and instructions
- A clear step before starting; only render fields enabled by that assessment.
- Explain why each required personal detail is collected.
- Validate candidate number/phone format without assuming all candidates have a Nigerian number.
- Keep personal details out of share URLs and public leaderboard payloads.

### 4. Examination workspace
- Distinct visual language from general CBT: assessment identity in the header, compact timer, visible progress, strong focus on question content, accessible option selection, clear image handling, and responsive question palette.
- Support question image and option images with alt text; maintain readable layout on small screens.
- Autosave state must be visible (saving/saved/offline/retry); do not imply an answer is saved until the server confirms it.
- Warn before leaving only when there are unsaved changes; server deadline remains authoritative.
- Keyboard accessibility and touch targets suitable for mobile.

### 5. Correction/results page
- Separate route and design system from the runner; do not reuse the general CBT result screen.
- Summary header, score card only when released, performance breakdown, filters (all/correct/incorrect/unanswered), and review cards.
- Each correction should show question, candidate answer, correct answer, explanation, and supported question/option/explanation images.
- If corrections are not yet released, show a waiting state rather than an empty or broken correction page.
- Do not expose correct answers in the attempt runner or pre-release responses.

## Suggested route structure

- `/assessments` — assessment discovery/listing.
- `/assessments/[slug]` — public assessment landing and access gate.
- `/assessments/[slug]/candidate` — candidate details/instructions confirmation.
- `/assessments/[slug]/start` — dedicated runner.
- `/assessments/[slug]/submitted` — submission receipt and release status.
- `/assessments/[slug]/results` — authenticated/guest-safe result retrieval.
- `/assessments/[slug]/leaderboard` — visible only when enabled and published.

UUID links should continue resolving for backward compatibility; new share links should use slugs.

## Data/API work required

Treat these as proposed fields/contracts, not as a migration script:
- Presentation: `preview_image_path`, optional host branding fields.
- Access: `require_login`, candidate-field configuration (structured JSON with allowlisted keys and required flags).
- Candidate record: candidate name, candidate number, optional phone/email, and a safe display label; avoid duplicating unnecessary PII in the attempt row.
- Guest identity: guest credential hash, expiry, and revocation metadata in a dedicated guest-attempt access table or equivalent secure model.
- Release controls: independent score/correction policies and release timestamps/actor audit fields.
- Leaderboard: enabled flag, publication policy/time, display-name policy, top-N, tie-break configuration.
- Candidate-facing server endpoints/RPCs must return only fields permitted by the current release state.

Before adding columns/tables, reconcile the staging and production schemas, all RLS policies, RPCs, triggers, admin forms, and existing app clients. Keep existing assessment behaviour backward-compatible until each assessment is explicitly configured.

## Implementation sequence

1. Finish the current slug/auth redirect repair and production dependency audit. Keep existing UUID route compatibility.
2. Add this spec to the product branch and inspect the existing admin editor, assessment table constraints, attempt schema, and current result RPC contracts.
3. Design the database/API contract for candidate fields, guest attempts, independent score/correction release, and leaderboard visibility. Test security and RLS on an isolated production-schema clone.
4. Build the landing page and candidate/instructions step for signed-in assessments first, preserving current access policy.
5. Build the separate runner and logo loading state; ensure answer autosave acknowledgement and robust mobile behaviour.
6. Add guest mode only after the guest credential/backend model is approved and tested. Do not ship a UI toggle that the RPC cannot enforce.
7. Build results/corrections release controls and candidate retrieval.
8. Build leaderboard aggregation and privacy controls; default it off.
9. Add migration tests, route/API tests, accessibility checks, and responsive tests. Avoid unnecessary Vercel preview deployments; use local/CI validation first.
10. Obtain explicit approval before any production database migration, merge, or production deployment.

## Current codebase observations

- The current `app/assessments/[id]/page.tsx` combines metadata loading, briefing, runner, submission, and completion in one page. It currently redirects every unauthenticated visitor to `/login` before loading public assessment metadata.
- The current runner has only a basic briefing card; it does not yet render assessment-specific instructions or candidate identity fields.
- The current completion state is not a separate results/correction experience. The UI reads a score when the submit RPC returns one, then shows a generic completion phase.
- The current start RPC call is user-session based and passes the resolved assessment UUID. The underlying staging RPC requires authentication, so anonymous attempts cannot be enabled safely by changing only the page.
- The admin API currently accepts title/description, question source/count, duration, attempts, access code and one result-release setting. It does not yet expose the requested preview image, candidate identity, login policy, independent correction release, or leaderboard controls.
- The admin list/editor page currently uses the older `result_release` setting. Expand the admin UX only alongside the corresponding database/API contract so the UI cannot advertise unsupported controls.


## Implementation gate — live staging schema inspection (27 Nov 2026)

A fresh read-only inspection of the live staging schema confirms that the candidate experience cannot be completed safely as a front-end-only change:

- `learning_assessments` currently has title, description, instructions, question count, duration, attempt limit, access-code flag, publication/status, and slug. It does not yet have preview-image path, login policy, candidate-field configuration, independent score/correction release policies, release timestamps, or leaderboard settings.
- `learning_practice_attempts.user_id` is NOT NULL. The current attempt row also has a required UUID `attempt_token`; the current start RPC requires an authenticated actor. Guest support therefore needs an explicit guest identity/credential model and ownership policies, not a nullable user ID patch.
- Existing result policy is represented by one `result_release` text field. It cannot express independently controlled score release and correction release.
- Candidate identity fields are not present on the assessment or attempt schema. Candidate details need a dedicated data model with minimal PII, retention rules, and separate public display labels.
- The current assessment page checks `supabase.auth.getUser()` and redirects to login before loading the assessment. Public metadata/landing-page access must be explicitly supported by RLS and a safe public read contract before that redirect can be conditionally removed.
- The runner previously rendered A–E after the image/question enhancement, but its answer-selection handler accepted only A–D. This was corrected in the current branch so option E can be selected and saved.

### Required backend design before guest access

Do not make `learning_practice_attempts.user_id` nullable without reviewing all self-practice, XP, analytics, RLS and ownership paths. Prefer a dedicated guest-attempt identity/access table linked to the attempt, with a high-entropy random secret whose hash is stored server-side, expiry/revocation, rate limits, and exact assessment/attempt scoping. The start, save, resume, submit, results, corrections and leaderboard APIs must all enforce the same ownership credential.

### Required result and leaderboard design

Keep score and correction visibility as separate server-enforced policies. Candidate-facing RPCs must omit unreleased score, answer keys, explanations, ranks and aggregates. Leaderboard publication must be separately enabled and timed; it must never reveal candidate phone/email, account IDs, guest credentials, or unreleased results. Default leaderboard visibility should be off.

### Safe implementation order

1. Preserve current login-required behaviour while building the visual shell and public metadata contract.
2. Add the preview image and instructions display only after admin upload, storage access and public image URL policy are defined.
3. Add per-assessment login/candidate field configuration and server validation.
4. Implement guest attempt credentials and ownership-checked RPCs.
5. Split score release from correction release and implement candidate retrieval.
6. Implement leaderboard aggregation with explicit privacy and release rules.
7. Test anonymous/authenticated/admin/service-role access on an isolated clone before any migration or deployment.
