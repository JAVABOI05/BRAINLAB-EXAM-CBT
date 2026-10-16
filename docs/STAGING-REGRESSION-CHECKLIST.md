# BrainLab CBT — Staging Regression Checklist

**Status: NOT RUN.** This is a manual test plan for the designated staging project only. It is not evidence of a passing test and does not authorize production activity.

## Preconditions

- Confirm the target is `BrainLabCBT-Staging` (`eusgwsuoloomphebrepe`), never production.
- Use only a designated test candidate and a test access code approved for staging. Do not use real candidate records or production codes.
- Record the current staging `show_results`, `mock_enabled`, `access_code_required`, and exam-duration settings before testing.
- Confirm a safe reset/cleanup path for test attempts before creating any rows or consuming a code.
- Do not run schema migrations, change Auth settings, or alter grants as part of this checklist.
- Stop if the correct staging project or a safe test identity/code cannot be confirmed.

## Candidate flow

| ID | Test | Expected result | Status |
|---|---|---|---|
| C-01 | Submit a valid, unused test access code and valid candidate details | Attempt starts once; server returns a session/token and a paper with no answer keys or explanations | Not run |
| C-02 | Submit an invalid code | Start is rejected; no attempt is created | Not run |
| C-03 | Try a code already consumed by a different test candidate | Rejected unless it is the explicitly supported master-code flow | Not run |
| C-04 | Answer several questions, wait for autosave, reload the page | Server resumes the same attempt; saved answers and authoritative time remaining are restored | Not run |
| C-05 | Attempt to resume with a wrong session token | Rejected without returning candidate paper, answers, or session data | Not run |
| C-06 | Let the timer expire | Server finalizes the attempt once as auto-submitted; client cannot extend time by changing localStorage | Not run |
| C-07 | Submit normally, then retry submission using the same session/token | No duplicate result is created; response is consistent with the already-finished attempt | Not run |
| C-08 | Change answer values in browser storage or send malformed answer keys/values | Server validates the request and does not accept invalid question/option data | Not run |
| C-09 | Trigger tab-switch recording several times | Server-maintained count/time is returned and remains consistent after reload | Not run |

## Result release and candidate isolation

| ID | Test | Expected result | Status |
|---|---|---|---|
| R-01 | With `show_results=false`, submit a test attempt | No score, answer key, or explanation is exposed in the result/review payload | Not run |
| R-02 | While results remain hidden, visit result and corrections routes and inspect network responses | No scores or review items are disclosed | Not run |
| R-03 | Enable results after an attempt was submitted while release was off | The candidate can retrieve the correct released result/review through a server-authorized flow, without resubmitting or relying on stale localStorage | **Known blocker: current lookup RPC is summary-only; do not mark pass until resolved** |
| R-04 | Turn results off after an attempt whose results were previously released | Result and corrections routes stop revealing scores/review while release is off | Not run |
| R-05 | Query a result with correct phone and wrong access code | No candidate result is returned; failures are throttled as designed | Not run |
| R-06 | Query a result using another test candidate's phone/code combination | No cross-candidate result or review data is returned | Not run |
| R-07 | Use an authorized candidate's correct phone and code with results enabled | Only the intended candidate's summary is returned; detailed review remains gated by release state | Not run |

## Admin authorization

Run with one designated admin account and one ordinary authenticated account. Also test signed-out/anonymous requests. Do not use a production admin.

| ID | Test | Expected result | Status |
|---|---|---|---|
| A-01 | Open each admin route while signed out | UI redirects to login; all direct reads and mutations are denied by RLS/server authorization | Not run |
| A-02 | Forge the `admin_user` localStorage value without an admin Auth session | No protected rows are returned and no mutation succeeds | Not run |
| A-03 | Sign in as an ordinary authenticated non-admin | Admin session check fails; admin reads/writes/RPCs are denied | Not run |
| A-04 | Sign in as a valid staging admin | Only authorized admin operations succeed | Not run |
| A-05 | Call admin mutation RPCs directly as a non-admin | Each is denied server-side, including code generation/reset, question management, result operations and settings changes | Not run |
| A-06 | Call direct table mutations as a non-admin | RLS denies unauthorized insert/update/delete across every table used by admin routes | Not run |
| A-07 | Sign out from each admin route | Supabase Auth session is ended and UI hint cleared; reload does not restore access | Not run |

## Evidence to record

For each test, record the ID, timestamp, staging project confirmation, test identity label (not personal data), pass/fail, sanitized error/result, and any relevant request ID. Never paste tokens, access codes, passwords, phone numbers, or candidate records into this document.

## Exit criteria

- Every applicable row passes, including duplicate-submit, timeout, candidate isolation, non-admin access, and the release-toggle test.
- Any failed or untestable case is recorded as a blocker rather than marked passed.
- Re-check the current branch's ESLint, TypeScript, and production-build CI before proposing a release.
- Production schema/policies/functions are reviewed separately and read-only.
- Founder explicitly approves any merge or deployment.
