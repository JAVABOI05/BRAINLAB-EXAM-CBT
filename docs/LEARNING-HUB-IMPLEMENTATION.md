# Learning Hub implementation notes

## Scope of this branch

This branch adds the first Learning Hub slice without replacing the existing CBT or changing the live database:

- Published subject and topic discovery at `/learn` and `/learn/[subjectSlug]`.
- A lesson stream at `/learn/[subjectSlug]/[lessonId]` with text, image, audio, video, and formative MCQ blocks.
- Tutor subject/topic organization at `/tutor` and `/tutor/subjects/[subjectId]/topics`.
- A lesson block editor at `/tutor/lessons/[lessonId]/builder`.
- Topic test configuration and question authoring at `/tutor/topics/[topicId]/test-builder`.
- Server-side attempt creation, answer saving, grading, and post-submit review APIs.
- Per-student lesson completion records and progress indicators.
- A staged database migration with RLS and explicit Data API grants.

## Routes and contracts

### Student routes

- `GET /learn`: published subjects and progress summary for the signed-in Supabase Auth user.
- `GET /learn/[subjectSlug]`: published topics, lessons, progress, and available topic tests.
- `GET /learn/[subjectSlug]/[lessonId]`: ordered published lesson blocks and a completion action.
- `GET /learn/[subjectSlug]/topic/[topicSlug]/test`: test introduction and active quiz/result interface.

### Assessment API

All assessment endpoints require an `Authorization: Bearer <Supabase access token>` header. The token is verified with Supabase Auth before privileged database access. All responses use `Cache-Control: no-store`.

- `POST /api/learning/tests/[testId]/attempts`
  - Validates the published test, topic, and subject.
  - Reuses an active attempt when possible.
  - Selects the configured question count, optionally shuffles, and stores a server-only immutable snapshot.
  - Returns prompts and sanitized options only; never returns the answer key or explanation before submission.
- `POST /api/learning/attempts/[attemptId]/answers`
  - Verifies attempt ownership, active status, deadline, question membership, and selected option.
  - Persists the selected answer server-side. Client-supplied correctness is ignored.
- `POST /api/learning/attempts/[attemptId]/submit`
  - Grades from server-side attempt snapshots and server-saved answers.
  - Enforces the authoritative deadline and finalizes the attempt.
  - Returns the answer key, correctness, and explanations only after the attempt is finalized.
  - Is idempotent for already finalized attempts.

## Authorization model

- Content authoring is scoped through `learning_subject_memberships`.
- Tutor writes require the tutor membership for the subject containing the topic/lesson/test.
- Reviewer memberships can read assigned drafts but do not receive edit permissions from the UI or RLS policies.
- Only `super_admin` and `platform_admin` bypass subject assignment in this first version.
- Student progress rows are scoped to the authenticated user.
- Students have no direct write privileges for test attempts or answers.
- The attempt-question snapshot table has RLS enabled and no client-facing grant/policy. It contains answer keys and explanations.
- The assessment service-role key is server-only. It must never use a `NEXT_PUBLIC_` variable name or be committed to source control.

## Known first-version limitations

- The existing CBT candidate flow currently uses candidate details/access codes, while the Academy account flow uses Supabase Auth. Learning Hub tests require a Supabase Auth account. Do not match these identities by name or phone; a deliberate account-linking design is required before combining histories.
- Tutor media upload and microphone recording are not implemented in this slice. The builder currently accepts approved HTTPS media URLs. Private Supabase Storage buckets, scoped upload policies, and signed media delivery must be implemented before enabling uploads.
- Published content should use reviewed, real learning material. Do not seed fake courses or synthetic questions into learner-facing pages.
- AI correction-to-lesson recommendations, AI-generated practice, community integration, and the Learning DNA/mastery model are follow-up work. This branch does not claim those capabilities are live.
- Topic tests are currently one per topic, as defined by the initial schema.
- The lesson editor uses a Markdown/plain-text path and does not render arbitrary HTML, to avoid unsafe HTML injection.

## Migration safety

Migration: `supabase/migrations/20261017120000_learning_hub_foundation.sql`.

It has **not** been applied to either the staging or production Supabase project. Staging currently has a legacy CBT schema and migration history that do not match the full migration history in this feature branch. Before applying it:

1. Reconcile migration history and schema differences.
2. Confirm the preceding administrator-role migration and `get_admin_role()` function are present.
3. Apply only to a disposable or confirmed staging database first.
4. Run Supabase security/performance advisors and inspect every new RLS policy.
5. Test tutor scoping, student isolation, answer-key denial, timed submissions, duplicate submissions, and deletion/history behavior.
6. Run the complete CBT regression suite.
7. Only then plan production rollout with a rollback strategy.

Required server environment variable for attempt APIs: `SUPABASE_SERVICE_ROLE_KEY`. The API returns a controlled 503 until this server-only variable is configured. Do not copy a service-role key into `.env.example` with a real value, source code, or browser environment.

## Immediate verification checklist

- [ ] GitHub Actions lint, TypeScript, and production build pass.
- [ ] Migration parses and applies successfully on an isolated staging database.
- [ ] Published subjects/topics/lessons are readable; drafts remain hidden from students.
- [ ] Tutors cannot author outside their assigned subject.
- [ ] Student session cannot query the answer key or attempt snapshots.
- [ ] Timed attempts grade only server-saved answers.
- [ ] Reload restores the same active question set and local answer recovery copy.
- [ ] Published content remains hidden if a draft save fails.
- [ ] Existing CBT start, access-code, exam, result, and correction journeys remain unchanged.
