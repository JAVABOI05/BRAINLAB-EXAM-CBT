# Unified Authentication and Private Operator Access

**Status:** Architecture decision / implementation plan. This document does not claim that candidate account registration, OAuth, or unified role-based redirects are already implemented.

## Product decision

BrainLab Academy should use **one identity and sign-in system** for learners and authorised staff, with no public-facing administrator link, role selector, or administrator registration option.

- Learners use the public sign-in/sign-up experience.
- Existing authorised operators use that same sign-in system and their existing approved identity.
- After authentication, a trusted server-side check determines which areas the account may access.
- A normal learner account must never be able to self-promote to an operator by editing a profile, browser storage, URL parameter, or registration payload.
- Operator tools can retain a separate, private interface and private route. Sharing the identity provider does not require exposing or merging the operator interface into learner-facing UI.

## Required sign-in behavior

1. The public interface offers account creation and sign-in for learners, with email/password and only the OAuth providers that are configured and tested.
2. OAuth and email sign-in return through a server-controlled callback that validates the authenticated identity.
3. The server checks the account's approved permissions against the authoritative database function/policy. Do not trust a client-provided role or localStorage value.
4. Learners go to their learner dashboard or the relevant permitted learning flow.
5. Approved operators are routed to the private operator console only after the server-side role check. Non-operators are denied, even if they manually request an operator URL.
6. Operator routes and every privileged database read/write remain protected by server-side authorization and Supabase RLS. Hiding navigation is only a UI measure.
7. Account recovery, email verification, OAuth account linking, rate limits, session revocation, and audit logging must be considered before production release.

## Private console discovery

- Do not place operator links or operator terminology in the public header, footer, landing page, learner login/register UI, sitemap, or public help pages.
- Do not rely on renaming `/admin/login` as the security boundary.
- A random private-entry route can be defense in depth, but the route is not an authorization mechanism. The current `proxy.ts` gate requires a gate cookie before `/admin/**` can load. If unified sign-in is implemented, the trusted server callback/redirect flow must deliberately support approved operators without weakening this gate or making operator routes public.
- Do not commit private path values, tokens, service-role keys, or other secrets. Configure secrets in the deployment environment.
- Keep the current fail-closed behavior until the unified callback and route protection have been implemented and tested. Do not remove the gate just to make role-based redirects work.

## Current branch status

As of this architecture note, the branch contains the legacy `/login` CBT candidate-entry flow and the private operator-entry gate. A repository route review did **not** find a dedicated candidate sign-up route or `signInWithOAuth` implementation on this branch. The existing candidate-entry flow is not yet the proposed unified account authentication experience.

The public **Admin Login** button has been removed from `app/login/page.tsx`. This is a UI cleanup, not proof that all administrative routes or permissions have been secured.

## Implementation sequence

1. Inventory current Supabase Auth users, profile tables, admin authorization functions, OAuth provider configuration, and all candidate data relationships. Read-only review first.
2. Design a single account/profile model that preserves existing candidate exam history and does not accidentally grant privileges to existing accounts.
3. Implement learner sign-up/sign-in and configured OAuth providers using the supported Supabase SSR/session pattern for Next.js.
4. Implement a server-side auth callback and role-aware redirect. Verify operator membership from the database; never accept self-selected roles.
5. Connect existing operator accounts through a controlled provisioning process. Do not expose public operator registration or automatically promote accounts based on email domain alone.
6. Test learner sign-up, email verification, password recovery, OAuth sign-in/sign-up, duplicate/linking edge cases, non-operator denial, approved operator access, logout/session expiry, and direct URL access in staging.
7. Test existing CBT access-code, attempt, result-release, and exam-history behavior against the new account flow.
8. Review the diff and CI, then obtain explicit approval before any database migration, production configuration change, merge, or deployment.

## Release constraints

- No production database or authentication settings are changed by this document.
- Do not mark unified authentication complete until the implementation and staging tests are evidenced.
- Preserve existing CBT workflows and keep exam answer keys and protected content server-side.
