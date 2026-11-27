# CBT access-code and exam-session transaction design

**Status:** Design only — not an applied migration or implementation.
**Scope:** Legacy full-mock CBT launch in `app/api/exam/start/route.ts`.
**Safety:** No live records, privileges, functions, or database objects were changed while preparing this design.

## 1. Verified current launch sequence

The current route performs these operations in separate PostgREST requests:

1. Reads the access policy and validates the submitted code.
2. Generates the 180-question paper and attempt token.
3. Reserves a normal code with a conditional update:
   `UPDATE access_codes SET is_used=true, used_by=cleanPhone WHERE code=cleanCode AND is_used=false RETURNING id`.
4. Inserts `exam_sessions`.
5. If session insertion fails, attempts to reset `is_used=false` and `used_by=null`.
6. Calls `mark_access_code_used(code, usedBy, sessionId)`.
7. If that RPC fails (normally because step 3 already marked the code used), performs fallback updates to attach `used_at` and `exam_session_id`.

The existing migration `20261101230000_access_codes_tracking_and_maintenance_notifications.sql` grants `mark_access_code_used(text,text,uuid)` to `anon`, `authenticated`, and `service_role`. Its SECURITY DEFINER body accepts caller-supplied `p_used_by` and `p_session_id`, does not authenticate the caller, and does not verify that the supplied session exists or belongs to the code. This is not a safe public contract.

## 2. Target invariant

For a normal single-use code, exactly one database transaction must:

- lock and validate the matching unused code;
- create the exam session with the already-generated paper snapshot and attempt token;
- mark the code used and attach the new session ID;
- commit both changes together.

If any step fails, neither the session nor code consumption commits. No compensating HTTP request should be needed. A code must never be consumed by supplying an arbitrary candidate identity or unrelated session ID.

Paper generation remains outside the transaction. It is expensive and does not need to hold a row lock. The transaction should begin only after the route has a complete, validated 180-question paper.

## 3. Proposed server-only RPC contract

Introduce a narrowly scoped function (proposed name: `create_exam_session_and_consume_code`) with explicit parameters for the session fields currently inserted by the route:

- candidate name and phone after server-side normalization;
- selected subject string and elective;
- code value, or an explicit access mode for open/master-code attempts;
- paper question IDs;
- duration and deadline;
- server-generated attempt token;
- master-code flag.

The function should:

1. Reject null/empty required values and malformed payload sizes.
2. For a normal code, normalize the code and select exactly one matching row `FOR UPDATE`.
3. Reject missing or already-used codes with stable machine-readable errors.
4. Insert `exam_sessions` and capture its generated ID.
5. Update the locked code row to `is_used=true`, `used_by`, `used_at=now()`, and `exam_session_id=session.id`.
6. Assert exactly one code row was updated.
7. Return the created session ID and any minimum response metadata required by the route.
8. Let PostgreSQL roll back the session insert and code update together if any statement fails.

For open and master-code launches, do not attempt to lock or consume a normal code. The function must still validate that the requested access mode is allowed by the server-side route policy; the client must not be able to label an arbitrary normal code as a master code.

### Privileges

- Revoke execution from `PUBLIC`, `anon`, and `authenticated`.
- Grant execution only to `service_role` if the route uses its service-role client.
- Keep the function SECURITY DEFINER only if required; pin `search_path` to trusted schemas and schema-qualify all table/function references.
- Do not expose a public function parameter that allows callers to set arbitrary `used_by` values independently of the server-validated candidate data.
- Keep the legacy function until every caller and environment has been reconciled. Then revoke its broad grants in a forward-only migration; do not rewrite an already-applied migration as the sole fix.

## 4. Route changes after the RPC exists

- Keep current policy validation, code validation, paper generation, and existing-attempt recovery.
- Remove the direct code reservation update.
- Replace the standalone `exam_sessions.insert()`, compensating reset, `mark_access_code_used` call, and fallback metadata updates with one call to the new RPC.
- On a known code-used response, return HTTP 409.
- On a missing/invalid code, return the existing invalid-code response.
- On an infrastructure/database failure, return a generic retryable 503/500 response; do not leak SQL internals.
- Preserve the existing registered-user exposure-history write only after the session transaction succeeds.
- Preserve snapshot freezing and question payload generation after the session exists.
- Keep active-attempt recovery ahead of new code consumption so a candidate does not burn a second code when resuming.

## 5. Important edge cases and unresolved design decisions

- **Concurrent launch:** Two requests using one code must serialize on the code row; exactly one may create a session.
- **Session insert failure:** The transaction rolls back without a compensating reset.
- **Code update failure:** The session insert rolls back.
- **Network timeout after commit:** The caller may not know whether the transaction committed. Existing recovery currently looks up a started session by phone and access code. Before implementation, confirm the lookup remains unambiguous for the intended candidate model; consider a server-generated launch idempotency key if retries can create duplicate sessions.
- **Shared master/open attempts:** Existing recovery explicitly refuses phone-only recovery for master/open attempts. Preserve that safety decision unless a separate identity-proof flow is designed.
- **Duplicate code rows:** Verify a unique constraint/index on normalized code values. If the database does not enforce uniqueness, the RPC must reject ambiguous matches rather than arbitrarily consume one.
- **Candidate phone/name:** These are candidate-supplied values in the anonymous CBT path, not verified identity. Store them as supplied candidate labels, not proof of identity.
- **Registered user:** The current `exam_sessions` insert does not include a verified `user_id`; do not silently change attempt ownership semantics in this refactor.
- **Schema drift:** The route has a fallback for deployments missing `used_at` or `exam_session_id`. The new RPC requires a reconciled schema. Inspect staging and production independently before drafting environment-specific migrations; do not preserve a silent fallback that hides schema mismatch.
- **Legacy function callers:** Repository inspection found the route as the application caller. Still check database jobs, external clients, and deployed code before retiring the function.

## 6. Required tests before any database change

Run against an isolated disposable database or CI database, not production and not live student records:

1. One unused normal code creates one session and links the code to that session.
2. Two concurrent calls with the same code produce exactly one successful session and one code-consumed failure.
3. A missing code creates no session.
4. An already-used code creates no session.
5. A forced session insert failure leaves the code unused.
6. A forced code-update failure leaves no session.
7. A mismatched or arbitrary session ID cannot be attached through the legacy RPC after its retirement.
8. Master/open launches do not consume a normal code.
9. Existing started-attempt recovery does not consume a new code.
10. The public roles cannot execute the new RPC or legacy unsafe function.
11. Service-role route invocation succeeds only with server-derived and validated payload.
12. Existing candidate launch, save, resume, submit, and results flows remain unchanged.

## 7. Release sequence

1. Finish call-site and schema inventory for staging and production independently.
2. Verify normalized-code uniqueness and all required session columns/constraints.
3. Implement the RPC and focused integration tests in a disposable database/CI environment.
4. Update the route to use the RPC and remove the old multi-request sequence.
5. Re-test CBT start/recovery/save/submit and all error paths.
6. Prepare a forward-only staging migration with explicit grants and rollback notes.
7. Request explicit approval before applying to staging.
8. Reconcile production schema and migration history separately; request separate approval before any production change.

**No staging migration, production migration, privilege change, merge, or deployment is authorized by this design document.**
