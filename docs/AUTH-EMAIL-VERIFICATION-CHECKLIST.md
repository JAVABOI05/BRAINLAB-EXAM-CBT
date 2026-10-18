# BrainLab Academy — Email Verification Release Checklist

This checklist accompanies the client-side verification guards in the account page and OAuth/email callback. Those guards are defense in depth, not a substitute for Supabase Auth configuration and server-side authorization.

## 1. Supabase Auth settings (required before claiming verification works)

In Supabase Dashboard, open **Authentication → Sign In / Providers → Email** (labels may vary):

- Enable **Confirm email**.
- Decide explicitly whether sign-up uses an email confirmation link or an email OTP. The current BrainLab account flow is designed around a confirmation link that returns to `/auth/callback`; it does not implement a separate six-digit OTP entry form.
- Ensure email/password sign-up does not produce an authenticated, unverified account.
- Configure production email delivery (custom SMTP is recommended for reliable delivery and branding). A successful `signUp` API response does not prove an email was delivered.
- Review the confirmation email template and use Supabase's supported confirmation URL/token placeholders. Do not hard-code tokens or secrets into the template.

Do not turn off confirmation to make the dashboard redirect work. Fix the verification flow instead.

## 2. URL configuration

In **Authentication → URL Configuration**:

- Set the production Site URL to the actual BrainLab Academy production domain.
- Add the exact production callback URL ending in `/auth/callback` to the allowed redirect URLs.
- Add the correct preview callback URLs only when needed; keep the allowlist narrow.
- If using a custom domain, test against that domain rather than assuming a Vercel preview hostname will behave identically.

Google OAuth also needs its provider-side authorized redirect URI to match the Supabase project's callback URL. The Google provider callback and BrainLab's own `/auth/callback` are different hops; do not substitute one for the other.

## 3. Required manual test matrix

Run these tests on a preview deployment before release, using test accounts you control:

1. **New email account:** submit valid details. The user should see a clear instruction to check email and should not be admitted to the dashboard before confirmation.
2. **Confirmation email:** verify delivery, sender, link target, and that the link returns to BrainLab.
3. **Successful confirmation:** follow the link once; the callback should exchange the PKCE code and route the confirmed user to the correct destination.
4. **Expired/reused link:** show a helpful error and offer a route back to sign-in; do not grant a session.
5. **Unverified sign-in:** must be rejected by Supabase when Confirm email is enabled; the app guard is an additional check.
6. **Existing confirmed account:** sign in and sign out normally.
7. **Google sign-in:** a successful provider flow should return to the app and preserve role checks; ordinary learners must not receive admin access.
8. **Password recovery:** recovery email links should return to `/auth/reset-password` and must not be confused with the sign-up confirmation callback.
9. **Navigation state:** after login, the header should show the learner's profile/dashboard actions; after sign-out it should show sign-in/create-account actions.
10. **Email delivery failure:** provide a useful retry/support path without exposing whether an arbitrary email address already has an account.

## 4. Security boundaries

- Never assign an admin role from signup metadata or a form selection.
- Keep authorization checks on server-side routes and in Supabase RLS/RPC policies. A client-side check or hidden navigation item is not authorization.
- Never expose Supabase service-role keys, OAuth client secrets, or AI provider keys in browser code, GitHub commits, or public environment variables.
- Rate-limit resend/verification and recovery actions when they are added.
- Avoid logging passwords, access tokens, confirmation tokens, or complete recovery URLs.

## 5. Release decision

Do not mark email verification complete until the Supabase settings have been checked and the test matrix passes on the target environment. The code can detect an unconfirmed session, but if **Confirm email** is disabled in Supabase, the provider may consider a new account confirmed automatically; application code alone cannot prove that a verification email was sent.
