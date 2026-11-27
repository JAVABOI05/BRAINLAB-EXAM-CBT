# Candidate identity and guest-attempt backend contract

Status: design contract based on a read-only inspection of the live staging schema on 27 November 2026. This document is not a migration and has not changed either Supabase project.

## Existing schema facts

- `learning_assessments` currently has no login-policy or candidate-field configuration columns.
- `learning_practice_attempts.user_id` is NOT NULL and references `auth.users(id)` with ON DELETE CASCADE.
- Attempts also have a required UUID `attempt_token`; this token is not a guest identity credential and must not be repurposed as one.
- Attempts store answers, score, total, selected question IDs, question snapshot, status and assessment linkage.
- The attempt type constraint currently supports `self_practice`, `organisation_quiz`, and `competition`; assessment-linked attempts are restricted to the latter two.
- Existing assessment start/save/resume/submit RPCs are authenticated-user oriented.

## Compatibility rules

1. Keep all existing assessments login-required until an administrator explicitly changes a policy.
2. Do not make `learning_practice_attempts.user_id` nullable as a shortcut. It would affect existing self-practice, XP, analytics, RLS, foreign keys and RPC ownership assumptions.
3. Do not interpret the existing `attempt_token` as a public bearer credential. It is an RPC token issued to authenticated attempts.
4. Organisation quizzes and competitions retain their organisation membership and access-code rules. Guest mode must not bypass either.
5. Candidate identity values are untrusted input. Validate allowed fields and requiredness on the server at attempt creation, then bind the validated identity to the attempt.
6. Do not expose raw candidate PII in assessment discovery, public result payloads, leaderboard responses, URLs, analytics or logs.

## Candidate field configuration contract

Store a versioned allowlisted object on each assessment. Proposed shape:

```json
{
  "version": 1,
  "fields": {
    "full_name": "required",
    "candidate_number": "optional",
    "phone": "hidden",
    "email": "hidden"
  }
}
```

Allowed keys are exactly `full_name`, `candidate_number`, `phone`, and `email`. Allowed values are exactly `hidden`, `optional`, and `required`. Reject unknown keys, values, oversized strings and malformed payloads. Require at least one visible identifying field when guest mode is enabled; do not silently infer a candidate identity from browser data.

## Data separation

Candidate identity should be stored in a dedicated table linked one-to-one to the attempt, not copied into the attempt JSON, question snapshot, or leaderboard record. The table should contain:
- attempt ID as its sole ownership FK (unique primary key, cascade delete);
- nullable full name, candidate number, phone and email, matching the configured schema;
- a server-generated display label that is safe for public results;
- a creation timestamp.

Assessment and user scope must be derived by joining the authoritative attempt row. Do not duplicate assessment_id or user_id in the identity table: duplicated ownership attributes can drift. Retention/deletion policy is not yet decided and must be approved before collection is enabled; do not imply that an unimplemented retention marker exists.

Enable RLS. Do not grant direct anonymous table access. Candidate reads/writes must go through narrowly scoped server-side functions that prove attempt ownership. Admin reads must use the existing assessment-management authorization model. Candidate identity must not be added to generic admin/list API responses unless that screen explicitly needs it.

## Guest identity — separate security principal

Guest attempts require a dedicated guest-access table linked to one attempt:
- attempt ID unique FK;
- assessment ID;
- cryptographically random high-entropy secret generated on the server;
- only a keyed hash or strong one-way hash stored server-side (never the raw secret);
- expiry, revocation, last-used timestamp and created timestamp;
- rate-limit/abuse metadata that does not expose the secret.

The raw secret is returned once after successful attempt creation. Prefer a Secure, HttpOnly, SameSite cookie scoped to the assessment route. If cookie handling is not feasible in the current architecture, use a one-time recovery secret with explicit user-facing handling; never put it in a URL, analytics, logs or referrer-bearing link. Every guest operation (resume, autosave, submit, result retrieval and corrections) must validate the same credential against the exact attempt and assessment, check expiry/revocation, and rate-limit failures.

Guest start must be atomic with attempt-limit enforcement. A guest attempt must not create a fake auth user or weaken authenticated ownership policies. A separate guest-attempt model or dedicated guest attempt table may be safer than modifying the current user-bound attempt table; decide only after tracing all triggers and RPC consumers.

## Login and access policy

Proposed assessment setting: `require_login boolean NOT NULL DEFAULT true`. This preserves current behaviour for existing rows and new rows until the admin product decision explicitly chooses otherwise. Guest mode can only be enabled for supported academic/general assessment types after guest RPCs and candidate credential storage are deployed. Organisation/competition types remain login-required in the first release.

Access-code requirement is independent of login. A code must still be validated and redeemed within the assessment's own scope; guest mode must not call generic plan-voucher or subscription redemption paths.

## Required RPC/API contract

- Admin create/update: validate and persist login policy + candidate field schema; reject guest mode for unsupported assessment types.
- Public metadata: expose only published assessment display fields and public rules; never return private question configuration, answer keys, access-code hashes, candidate records or admin data.
- Start: resolve assessment and policy server-side; enforce schedule, publication, access code, allowed type, candidate field requirements, attempt limits and rate limits; create attempt + identity + guest credential atomically.
- Save/resume/submit: authenticated ownership for signed-in attempts; guest credential ownership for guest attempts. Never trust a client-supplied user ID, assessment ID or candidate label.
- Results/corrections: separately enforce score and correction release policies before returning scores, correct answers or explanations.
- Leaderboard: default off; use safe display labels only and independently enforce publication policy.

## Security and test gates

Before enabling guest mode:
- Test anon, authenticated, admin and service-role privileges independently.
- Test cross-assessment credential replay, cross-attempt IDOR, expired/revoked credential, brute-force/rate-limit behaviour, duplicate start, concurrent max-attempt race, answer save, resume, submit idempotency, result withholding and correction withholding.
- Confirm no raw credential or PII in URLs, logs, analytics, referrers or public responses.
- Test deleting an auth user and retention/deletion handling for identity records.
- Trace every trigger and RPC that consumes `learning_practice_attempts`, including self-practice, XP, exposure history and analytics.
- Run Supabase security advisors and isolated-clone integration tests.

## Delivery decision

Implement the authenticated candidate-details flow first, preserving current login and attempt ownership. Guest mode is a separate release gate and must not be exposed in the admin UI until its backend credential model and every dependent RPC have passed the tests above. No production or staging schema change is authorized by this design document.


## Authenticated-first implementation checkpoint — 27 November 2026

The current authenticated v2 SQL draft follows the one-to-one attempt ownership rule: `learning_assessment_candidate_identities.attempt_id` is the sole FK. The draft stores `created_at` only; retention duration and deletion workflow remain explicit release blockers pending a product/privacy decision. Guest access remains a separate security principal and is not part of the authenticated v2 migration.

The authenticated flow must not be described as guest-capable. Keep `require_login` defaulting to true for all existing assessments. Guest mode should not appear as an enabled admin option until guest start, credential storage, resume, save, submit, result retrieval, revocation, expiry and rate-limit enforcement have been implemented and independently tested.
