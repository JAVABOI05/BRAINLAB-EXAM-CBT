# Reviewing this upgrade locally later

This guide is for reviewing the branch without disturbing the existing local working tree.

## Important before installing

The GitHub branch `feature/brainlab-academy-upgrade` was created from the remote `phase0-hardening` branch. The founder's more recent local security hardening and brand integration changes have not been reconciled with this branch yet. Therefore, this is a review build, **not a production-ready replacement**.

Do not switch away from or overwrite a local branch that contains uncommitted security work. Do not deploy this branch or point it at production Supabase.

## Safe separate checkout (PowerShell)

Run these commands from a directory where you want a separate review copy. Use your normal GitHub authentication for the private repository.

```powershell
git clone --branch feature/brainlab-academy-upgrade --single-branch https://github.com/brainlabtutorials-gif/BRAINLAB-EXAM-CBT.git BRAINLAB-ACADEMY-UPGRADE
Set-Location BRAINLAB-ACADEMY-UPGRADE
Copy-Item .env.example .env.local
```

Edit `.env.local` locally with **staging-only** values. Do not paste those values into chat or commit the file. The placeholder values in CI are for building only and cannot be used for real sessions.

Then run:

```powershell
npm ci
npm run build
npm run dev
```

Review the public landing page, About page, candidate portal at `/login`, access and instructions routes, result/corrections pages, active exam, and admin routes. Use a test candidate and staging data only.

## Before any merge or deployment

1. Reconcile the founder's local security changes with this branch.
2. Review the complete diff and all migration files.
3. Pass TypeScript/build checks and the staging regression checklist.
4. Verify answer-key/result protection and admin authorization server-side.
5. Confirm backup and rollback steps.
6. Obtain explicit approval before merging to `main` or deploying.

Never copy production secrets into a review checkout, and never run production database migrations as part of this UI review.
