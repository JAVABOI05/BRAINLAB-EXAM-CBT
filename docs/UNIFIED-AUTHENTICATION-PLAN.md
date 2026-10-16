# Unified Authentication and Private Operator Access

**Implementation status:** Initial account flows are committed to the review branch; build, OAuth provider configuration, and staging behavior are not yet verified. This is not a production-ready release claim.

## Product decision

BrainLab Academy uses one identity/sign-in experience for learners and authorised operators. Public pages must not advertise an administrator login, include an operator role selector, or allow public operator registration.

- Learners create accounts and sign in through the shared account portal.
- Existing authorised operators use the same Supabase Auth identity system.
- The account's permissions are checked independently; a user cannot select or self-assign an operator role during registration.
- Operator tools remain behind the private route gate and database/server-side permission checks.

## Initial implementation now on this branch

- `/account` provides email/password sign-up, email/password sign-in, Google OAuth initiation, and password-reset email requests.
- `/auth/callback` completes the PKCE code exchange, checks the `is_admin()` RPC, and routes an approved operator or learner accordingly.
- `/auth/reset-password` verifies a recovery session and lets the user set a new password.
- `/dashboard` provides a basic signed-in learner landing page and links to the existing CBT entry flow.
- `/api/auth/operator-gate` verifies the submitted access token with Supabase Auth and independently checks `is_admin()` before issuing the HttpOnly private-console cookie. Its DELETE handler clears that cookie on operator sign-out.
- `proxy.ts` now rewrites the configured private entry path to the shared `/account` portal, rather than to a separate operator-labelled login form.
- `/admin/login` redirects to the shared account portal when the proxy gate permits the route.
- The public header now links to the shared account portal. The public **Admin Login** button was removed from the legacy CBT page in a prior commit.
- Authentication and account routes are disallowed for crawler indexing in `robots.ts`. This is crawler guidance, not access control.

## Important boundaries and unfinished integration

1. The existing `/login` route is still the legacy CBT candidate-entry flow. The new account is not yet linked to candidate attempt history, phone identity, access-code ownership, or exam results. Do not imply that this data linkage is complete.
2. Google OAuth only works after the Google provider and redirect URLs are configured in Supabase Auth. The UI must fail gracefully if the provider is not enabled.
3. The private console cookie can only be issued by the operator-gate API after a server-side Supabase identity check and `is_admin()` permission check. The environment must still have valid server-only `BRAINLAB_PRIVATE_ENTRY_PATH` and `BRAINLAB_PRIVATE_ENTRY_TOKEN` values, because the proxy deliberately fails closed when they are absent.
4. The legacy operator pages still require a route-by-route authorization audit. RLS is the database enforcement layer; client-side redirects and localStorage are not authorization boundaries.
5. Existing account/role schema and database policies have not been changed. No production or staging schema/data/settings were modified for this implementation.
6. Password reset, email verification, OAuth linking/duplicate account behavior, direct-route denial, logout/cookie clearing, and administrator access must be tested in a configured staging environment before release.

## Security and implementation rules

- Never trust user-editable metadata, browser storage, form fields, URL parameters, or OAuth profile fields as an authorization signal.
- The operator-gate endpoint checks the Supabase Auth user and the database-backed `is_admin()` result before issuing the HttpOnly cookie. It uses the anon/public key with the user's bearer token, not a service-role key.
- The private entry route is defense in depth, not the primary security control. A person who learns the route can reach the shared sign-in page, but should not gain operator access without a verified operator account.
- Keep secrets server-only; do not use a `NEXT_PUBLIC_` prefix for the private path/token.
- Do not automatically promote accounts by email domain, and do not add public operator registration.
- Preserve the existing CBT attempt, timing, scoring, result-release, and protected-answer behavior.

## Remaining work

1. Run lint, TypeScript and production build on the latest branch commit.
2. Verify Google provider settings and email redirect configuration without changing production settings.
3. Test account creation, verification, sign-in, OAuth, password reset, logout, and role-based routing in staging.
4. Reconcile account identity with candidate exam records through a reviewed schema design before making account-linked exam-history claims.
5. Audit every operator route and mutation; run non-operator direct-access and database authorization tests.
6. Obtain explicit approval before any schema migration, production configuration change, merge, or deployment.
