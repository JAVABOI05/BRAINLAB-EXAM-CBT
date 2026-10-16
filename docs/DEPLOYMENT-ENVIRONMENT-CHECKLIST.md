# BrainLab Academy — Preview Deployment Checklist

This checklist is for the existing `feature/brainlab-academy-upgrade` preview deployment. It does not authorize merging the upgrade or changing production data.

## Current confirmed build blocker

The reported Vercel build fails while prerendering `/access` because the Supabase client module throws when either public project setting is absent:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The project must use its own real Supabase project URL and anon/public key. Do not put placeholder values in Vercel, do not commit real credentials, and never use a Supabase `service_role` key in a `NEXT_PUBLIC_*` variable or browser code.

## Set Preview environment variables

1. Open the Vercel dashboard and select the BrainLab CBT project associated with this repository.
2. Go to **Settings → Environment Variables**.
3. Add `NEXT_PUBLIC_SUPABASE_URL` with the project URL from the correct Supabase project.
4. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` with that project's anon/public key.
5. Apply both to **Preview** first. Add them to Production only after confirming the intended production Supabase project and receiving approval.
6. Save the settings, then redeploy the preview for the upgrade branch so the build receives the updated environment.
7. If it still fails, inspect the *first* build error after TypeScript and page-data collection; do not treat warnings as the primary failure without evidence.

## Local setup (when the founder has the laptop)

1. In the repository root, copy `.env.example` to `.env.local`.
2. Replace the two Supabase placeholders with values from the correct Supabase project.
3. Keep `.env.local` untracked. Never paste its contents into GitHub, issues, screenshots, or chat.
4. Run `npm install`, then `npm run build`.
5. Report the first actual error and its file/line if the build fails.

## Separate private-entry configuration

The example file also documents `BRAINLAB_PRIVATE_ENTRY_PATH` and `BRAINLAB_PRIVATE_ENTRY_TOKEN` for the non-public operator entry. These are separate private server environment variables, not Supabase credentials. Keep the console unavailable until both values are deliberately configured and the route/access controls have been reviewed. Use unique, random values; never expose them through `NEXT_PUBLIC_*`.

## Before considering the upgrade ready

- Confirm the preview build passes with the correct Preview environment.
- Test sign-in, OAuth callback, sign-out, password reset, and the candidate account flow.
- Test access-code flow, exam start, timed answering, submission, result release settings, and result lookup.
- Confirm protected exam answers and privileged credentials are never returned to browser code.
- Confirm unauthorized users cannot access privileged operator routes, even if they guess a URL.
- Review the pull request diff and CI results.
- Do not merge or deploy to Production, run database migrations, or change production environment variables without founder approval.

## Warnings versus blockers

The screenshots also showed React hook dependency warnings and a Node.js deprecation notice. They should be reviewed, but the specific fatal error shown in the Vercel log is the missing Supabase environment configuration during prerender. Fix and retest that configuration before chasing unrelated warnings.
