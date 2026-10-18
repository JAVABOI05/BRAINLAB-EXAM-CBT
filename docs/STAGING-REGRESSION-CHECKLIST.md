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
| C-10 | Add an HTTPS question image and alt text through the admin question editor, then start an attempt containing that question | Image renders on mobile/desktop, alt text is present, and the question payload contains no answer key or explanation | Not run |
| C-11 | Add an image to an answer option and an explanation; submit with results hidden, then test again with results released | Option image may appear during the attempt; explanation image and review media are returned only when the result-release policy allows review | Not run |
| C-12 | Try saving an image URL that does not use HTTPS | Database rejects the URL; no unsafe URL is rendered | Not run |

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

## Self Practice

| ID | Test | Expected result | Status |
|---|---|---|---|
| SP-01 | Start practice with one subject and a small question count | Attempt contains only the selected subject, no repeated question IDs, and no answer keys/explanations in the question payload | Not run |
| SP-02 | Select multiple subjects and change the question count | Questions come only from selected subjects; configured count is respected when the active pool is sufficient | Not run |
| SP-03 | As a free learner request 50 questions, then request more than the allowed cap | The allowed count is accepted; over-limit request is rejected by the server even if the browser is modified | Not run |
| SP-04 | Answer questions, wait for saves, reload/resume, then submit | Saved answers are restored; final score is calculated server-side; corrections appear only after allowed submission | Not run |
| SP-05 | Submit twice or try to submit a different attempt ID/token | No duplicate grading or cross-account access; invalid attempt/token is rejected | Not run |
| SP-06 | Attempt to pass an organisation/competition attempt ID to a Self Practice RPC | The Self Practice endpoint rejects the non-self-practice attempt | Not run |

## Learning Hub content and progress

| ID | Test | Expected result | Status |
|---|---|---|---|
| LH-01 | Open Learning Hub signed out and signed in | Only published content is shown; drafts remain hidden | Not run |
| LH-02 | Open a lesson with text, image, audio, video, and inline practice blocks | Supported blocks render safely; non-HTTPS media is not rendered | Not run |
| LH-03 | Mark a lesson complete while signed in, then reload on another session | Completion is saved to the same account and displayed consistently | Not run |
| LH-04 | Try to write progress for another user or unpublished lesson directly through the API | RLS rejects the write | Not run |
| LH-05 | As an authorised content admin, add/edit/reorder/delete lesson blocks and publish a lesson | Changes persist in the intended lesson and learner view follows publication state | Not run |
| LH-06 | As a non-admin, attempt lesson/subject/topic mutations directly | Server-side RLS denies the mutation | Not run |

## Organisation quizzes and competitions

| ID | Test | Expected result | Status |
|---|---|---|---|
| OA-01 | Publish an assessment whose selected subjects/categories have fewer active questions than configured | Database rejects publication with a clear question-pool error | Not run |
| OA-02 | Start before the opening time, after the closing time, or while unpublished | Start is rejected server-side | Not run |
| OA-03 | Start a code-protected assessment without a code and with an invalid code | Both requests are rejected and no attempt is created | Not run |
| OA-04 | Redeem the correct assessment code as the intended account | The account receives only the assessment-scoped entitlement and may start if other rules pass | Not run |
| OA-05 | Reach the configured attempt limit and try concurrent starts | Attempt limit is enforced; unique attempt numbering prevents concurrent duplicate attempt numbers | Not run |
| OA-06 | Answer questions, wait for save, reload and resume with the same attempt token | Same question order and saved answers are restored without revealing correct answers | Not run |
| OA-07 | Test result-release settings after_submit, after_close, and admin_only | Learner sees results only under the configured policy; authorised admin can still review attempts | Not run |
| OA-08 | Submit twice, save after submission, or use a token belonging to another learner | No double grading, post-submit mutation, or cross-user access succeeds | Not run |
| OA-09 | Open admin results for an assessment outside the administrator's organisation | Request is denied; an organisation admin sees only assessments within their authorised scope | Not run |

## Access codes, membership, and entitlement control

| ID | Test | Expected result | Status |
|---|---|---|---|
| AC-01 | Create a permanent code for a registered email and attempt redemption from another account | Intended account can redeem; other account is rejected; code does not expire and cannot be claimed by another account | Not run |
| AC-02 | Redeem a temporary code after its expiry or after its redemption limit is reached | Expired/exhausted code is rejected server-side | Not run |
| AC-03 | Redeem the same code twice from the same account | No duplicate entitlement is created | Not run |
| AC-04 | Revoke an unused code, then revoke an already-issued entitlement | Unused code can no longer be redeemed; existing access is removed only when its entitlement is revoked | Not run |
| AC-05 | As an organisation admin, issue/revoke codes for your own organisation; attempt the same for another organisation | Own-scope action succeeds; cross-organisation action is denied | Not run |
| AC-06 | Attempt to grant an entitlement by directly inserting into tables or by passing an arbitrary scope to an RPC | Direct writes are denied; RPC validates scope and administrator permission | Not run |

## Admin feature controls

| ID | Test | Expected result | Status |
|---|---|---|---|
| A-08 | Sign in using each supported admin role and open all new admin workspaces | Only the permissions assigned to that role are available; read-only roles cannot save settings | Not run |
| A-09 | Upload a question image as an authorised question admin and as a non-admin | Authorised upload succeeds within file size/MIME/path rules; non-admin upload/update/delete is denied | Not run |
| A-10 | Create and publish a subject/topic/lesson/assessment, then edit it | Admin changes persist and are reflected only where publication/assignment rules allow | Not run |
| A-11 | Revoke an entitlement for an organisation member | Entitlement is marked revoked, membership is suspended only when no other active organisation entitlement remains, and an audit record is written | Not run |
| A-12 | Review assessment results as an authorised admin, then as an ordinary user | Admin receives attempt summaries for permitted assessments; ordinary user receives no privileged result list | Not run |

## Automated transactional database smoke checks — 2026-10-18

| ID | Test | Result |
|---|---|---|
| DB-01 | Start an organisation quiz; assert the initial/resume question payload omits answer keys; save and resume an answer; submit; verify released corrections; try to submit the same attempt through a Self Practice RPC | **Passed** in a transactional staging test |
| DB-02 | Request 51 Self Practice questions as a free learner; then start a two-question attempt, assert no answer key in the initial payload, save/resume, submit, and retry submission | **Passed** in a transactional staging test |
| DB-03 | Confirm the temporary test organisation, assessment, and attempt rows were rolled back | **Passed**; query confirmed zero temporary test rows remained |
| DB-04 | Create a permanent membership code for a registered account, try to redeem it as another account, then redeem as the assigned account | **Passed** in a transactional staging test; wrong account rejected and assigned account accepted; test rows rolled back |

These checks exercised database RPCs using a designated staging admin identity with transaction rollback. They do not replace browser-based end-to-end tests, non-admin/RLS tests, concurrent-start tests, media upload tests, or the legacy CBT regression suite. No production test rows were created.

## Evidence to record

For each test, record the ID, timestamp, staging project confirmation, test identity label (not personal data), pass/fail, sanitized error/result, and any relevant request ID. Never paste tokens, access codes, passwords, phone numbers, or candidate records into this document.

## Exit criteria

- Every applicable row passes, including duplicate-submit, timeout, candidate isolation, non-admin access, and the release-toggle test.
- Any failed or untestable case is recorded as a blocker rather than marked passed.
- Re-check the current branch's ESLint, TypeScript, and production-build CI before proposing a release.
- Production schema/policies/functions are reviewed separately and read-only.
- Founder explicitly approves any merge or deployment.
