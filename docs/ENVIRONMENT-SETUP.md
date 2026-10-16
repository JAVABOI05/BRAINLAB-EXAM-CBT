# BrainLab environment configuration

This checklist applies to the Next.js application in this repository. It documents variable names only; never commit real credentials.

## Required public Supabase configuration

The browser client in `app/lib/supabase.ts` reads exactly:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

A deployment that defines differently named variables (for example `Project_URL`, `Publishable_Key`, or `Anon_Key`) will not satisfy these reads. Vercel environment-variable names must match exactly, including the `NEXT_PUBLIC_` prefix.

Use the project URL and publishable key (or legacy anon key if required by the current client setup) from the same intended Supabase project. Never use a service-role or secret key in a `NEXT_PUBLIC_` variable.

## Local development

1. Copy `.env.example` to `.env.local`.
2. Replace the two placeholder values with the intended Supabase project URL and public client key.
3. Keep `.env.local` out of Git; do not paste its values into issues, pull requests, or chat.
4. Restart the Next.js development server after changing environment variables.

## Vercel configuration

1. Open the existing `brainlabexam-cbt` project and go to **Settings → Environment Variables**.
2. Add or correct the two exact names listed above.
3. Select the intended targets (Preview for preview deployments and Production for production deployments).
4. Confirm the project URL and public client key belong to the same Supabase project.
5. After the deployment quota resets, create a new deployment for the intended branch. Environment-variable changes do not alter an already-built deployment.

## Important operational notes

- Do not remove the missing-variable guard from `app/lib/supabase.ts`; hiding the error would not configure authentication or database access.
- A public anon/publishable key is not an authorization control. Database RLS and server-side authorization must enforce permissions.
- Never expose `service_role`, secret API keys, passwords, or private operator-gate values in client code or public variables.
- If Vercel settings are inaccessible through an integration, make the change in the Vercel dashboard with an account authorized for the project's team.
- This checklist does not authorize a production deployment. Run CBT and admin regression tests and obtain the required release approval first.
